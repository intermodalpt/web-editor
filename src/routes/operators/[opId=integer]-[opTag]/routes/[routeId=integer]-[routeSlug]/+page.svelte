<script>
	import { onDestroy, onMount } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import { Map as Maplibre, NavigationControl, LngLatBounds } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import * as turf from '@turf/turf';
	import { liveQuery } from 'dexie';
	import { decodedToken, token, toast } from '$lib/stores.js';
	import { apiServer, tileStyle } from '$lib/settings.js';
	import { regionMapParams } from '$lib/utils.js';
	import { fetchCalendars, getCalendars, loadMissing, selectedRegion } from '$lib/db';
	import DraggableList from '$lib/stops/DraggableList.svelte';
	import { annotateSubroute, subrouteTitle } from '../aux.js';
	import RouteForm from '../form/RouteForm.svelte';
	import DepartureEditor from './DepartureEditor.svelte';
	import GtfsValidator from './GtfsValidator.svelte';

	/** @type {import('./$types').PageData} */
	export let data;

	const routeId = data.route.id;
	const operatorId = data.route.operator;
	const routeTypes = data.routeTypes;

	const isAdmin = $decodedToken?.permissions?.is_admin || false;

	// Stores and reactive variables
	// PS: We might not need stores as these are now coming from load()
	const stops = writable(data.stops);
	const route = writable(data.route);

	const stagedRoute = derived(route, ($route) => {
		let subroutes = $route.subroutes.map((sr) => annotateSubroute(sr));
		return {
			...structuredClone($route),
			subroutes: subroutes,
			_original: $route,
			_modified: false
		};
	});

	const calendars = liveQuery(() => getCalendars());
	const operatorCalendars = derived(calendars, ($calendars) => {
		if (!$calendars) return;
		return Object.fromEntries(
			Object.values($calendars)
				.filter((calendar) => calendar.operator_id === operatorId)
				.map((calendar) => [calendar.id, calendar])
		);
	});

	const routeStops = writable();
	const routeSchedules = writable();

	let mapLoaded = false;
	let stopsLoaded = true;
	let calendarsLoaded = false;
	let routeStopsLoaded = false;
	let routeSchedulesLoaded = false;
	let centeredOnRoute = false;

	$: isRequiredLoading = !stopsLoaded || !mapLoaded;

	const selectedSubrouteId = writable(null);
	const selectedSubroute = derived([selectedSubrouteId, route], ([$selectedSubrouteId, $route]) => {
		if (!$selectedSubrouteId || !$route) return;
		return $route.subroutes.find((subroute) => subroute.id === $selectedSubrouteId);
	});
	// Meta tab

	// Stops tab
	const subrouteStopIds = writable([]);
	const initialSubrouteStopIds = derived(
		[selectedSubrouteId, routeStops],
		([$selectedSubrouteId, $routeStops]) => {
			if (!$selectedSubrouteId || !$routeStops) return [];
			const stopIds = $routeStops[$selectedSubrouteId] || [];

			if (!stopIds) {
				alert('No stops found for this subroute (might be a bug)');
				$subrouteStopIds = [];
			}

			$subrouteStopIds = stopIds;
			return stopIds;
		}
	);
	const subrouteStops = derived([stops, subrouteStopIds], ([$stops, $subrouteStopIds]) => {
		if (!$stops || $stops.length == 0 || !$subrouteStopIds) return [];
		const srStops = $subrouteStopIds?.map((stop) => $stops[stop]);
		const len = srStops.length;
		const validSrStops = srStops.filter((stop) => stop);
		if (len != validSrStops.length) {
			alert('Some of the stops were not recognized', 'error');
		}
		return validSrStops;
	});

	let nounce = 0;
	const uniqueSubrouteStopIds = writable([]);
	const uniqueStopIdsMap = writable({});

	$: subrouteStopsChanged = !(
		initialSubrouteStopIds.length == $subrouteStopIds.length &&
		$subrouteStopIds.every((id, i) => id === initialSubrouteStopIds[i])
	);

	// Validation tab

	// UX vars
	const tabs = {
		view: 0,
		meta: 1,
		stops: 2,
		departures: 3,
		validation: 4
	};
	let tab = tabs.view;

	let map;
	let mapElem;
	let dragMode = 'move';

	async function loadRequiredData() {
		// Nothing is required.
		// Get rid of this function if it stays like this
	}

	async function loadExtraData() {
		Promise.all([
			// Ensure that calendars are available in indexedDB
			fetchCalendars().then(() => {
				calendarsLoaded = true;
			}),
			// Get the subroute stops
			fetch(`${apiServer}/v1/routes/${routeId}/stops`)
				.then((r) => r.json())
				.then((data) => {
					const stops = Object.fromEntries(
						data.map((subroute) => [subroute.subroute, subroute.stops])
					);
					$routeStops = stops;
					routeStopsLoaded = true;
					return stops;
				}),
			// Get the subroute schedules
			fetch(`${apiServer}/v1/routes/${routeId}/schedule`)
				.then((r) => r.json())
				.then((data) => {
					$routeSchedules = data;
					routeSchedulesLoaded = true;
					return routeSchedules;
				})
		])
			.catch((e) => {
				toast('Failed to load data', 'error');
				console.log(e);
			})
			.then(async () => {
				console.log('data loaded');
				await loadMissing();
			});
	}

	loadRequiredData()
		.then(loadExtraData)
		.then(async () => {
			console.log('data loaded');
			await loadMissing();
		});

	stops.subscribe(() => {
		console.log('stops changed');
		if (!$stops || !mapLoaded) return;
		$subrouteStopIds = subrouteStopIds;
		drawStops();
	});

	route.subscribe(($route) => {
		$selectedSubrouteId = $route.subroutes[0]?.id;
	});

	subrouteStopIds.subscribe(($subrouteStopIds) => {
		if (!$subrouteStopIds || !$stops) return;

		const propagationNeeded = !(
			$uniqueSubrouteStopIds.length === $subrouteStopIds.length &&
			$uniqueSubrouteStopIds.every((uId, i) => $uniqueStopIdsMap[uId]?.id === $subrouteStopIds[i])
		);
		console.log('propagationNeeded', propagationNeeded);

		if (propagationNeeded) {
			// Generate unique IDs
			$uniqueStopIdsMap = {};
			$uniqueSubrouteStopIds = [];
			for (const subrouteStopId of $subrouteStopIds) {
				const uniqueStopId = '' + subrouteStopId + '_' + nounce++;
				$uniqueStopIdsMap[uniqueStopId] = $stops[subrouteStopId];
				$uniqueSubrouteStopIds.push(uniqueStopId);
			}
		}
	});

	uniqueSubrouteStopIds.subscribe(($uniqueSubrouteStopIds) => {
		const correspondingIds = $uniqueSubrouteStopIds.map((uId) => $uniqueStopIdsMap[uId]?.id);

		correspondingIds.every((id, i) => id === $subrouteStopIds[i]);
		const propagationNeeded = !(
			correspondingIds.length === $subrouteStopIds.length &&
			correspondingIds.every((id, i) => id === $subrouteStopIds[i])
		);

		if (propagationNeeded) {
			$subrouteStopIds = correspondingIds;
		}
		updateRouteLine();
	});

	selectedRegion.subscribe((region) => {
		if (!map || !region || centeredOnRoute) return;
		const mapParams = regionMapParams(region);
		map.setCenter(mapParams.center);
		map.setZoom(mapParams.zoom);
	});

	function drawStops() {
		if (!map || !$stops) return;
		map.getSource('stops').setData({
			type: 'FeatureCollection',
			features: Object.values($stops).map((stop) => ({
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: [stop.lon, stop.lat]
				},
				properties: {
					id: stop.id
				},
				id: stop.id
			}))
		});
	}

	function addSourcesAndLayers() {
		map.addSource('routeline', {
			type: 'geojson',
			data: {
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: []
				}
			}
		});

		map.addLayer({
			id: 'routeline',
			type: 'line',
			source: 'routeline',
			paint: {
				'line-color': 'rgb(229,139,139)',
				'line-width': 5
			}
		});

		map.addSource('stops', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});

		map.addLayer({
			id: 'stops',
			type: 'circle',
			source: 'stops',
			paint: {
				// change color depending on hover state
				'circle-color': [
					'case',
					['boolean', ['feature-state', 'hover'], false],
					'rgb(255, 0, 0)',
					'rgb(50, 150, 220)'
				],
				//  change size depending on zoom level
				'circle-radius': [
					'interpolate',
					['linear'],
					['zoom'],
					12,
					['case', ['boolean', ['feature-state', 'hover'], false], 5, 3],
					14,
					['case', ['boolean', ['feature-state', 'hover'], false], 6, 4],
					16,
					['case', ['boolean', ['feature-state', 'hover'], false], 11, 8],
					18,
					['case', ['boolean', ['feature-state', 'hover'], false], 16, 12],
					20,
					['case', ['boolean', ['feature-state', 'hover'], false], 21, 16]
				],
				'circle-stroke-width': 1,
				'circle-stroke-color': '#fff'
			}
		});
		map.addSource('selectedStop', {
			type: 'geojson',
			data: {
				type: 'Point',
				coordinates: []
			}
		});
		map.addLayer({
			id: 'selectedStop',
			type: 'circle',
			source: 'selectedStop',
			paint: {
				'circle-color': 'rgb(255, 0, 0)',
				'circle-radius': 10,
				'circle-stroke-width': 1,
				'circle-stroke-color': '#fff'
			}
		});
	}

	function updateRouteLine() {
		if (!map || !map.getSource('routeline') || !$uniqueSubrouteStopIds) return;

		map.getSource('routeline').setData({
			type: 'LineString',
			coordinates: $uniqueSubrouteStopIds.map((id) => {
				const stop = $uniqueStopIdsMap[id];
				return [stop?.lon ?? 0.0, stop?.lat ?? 0.0];
			})
		});
	}

	function addEvents() {
		const canvas = map.getCanvasContainer();

		let initDragStop = null;
		let hoveredStop = null;

		function onMove(e) {
			const coords = e.lngLat;

			// Set a UI indicator for dragging.
			canvas.style.cursor = 'grabbing';
			// insert a coordinate in the current location in the route
			const rt = $subrouteStopIds.map((id) => {
				const stop = $stops[id];
				return [stop.lon, stop.lat];
			});

			let index = $subrouteStopIds.indexOf(initDragStop.id);
			rt.splice(
				index + (dragMode === 'add' && index != 0 ? 1 : 0),
				dragMode === 'add' ? 0 : 1,
				hoveredStop ? [hoveredStop.lon, hoveredStop.lat] : [coords.lng, coords.lat]
			);

			map.getSource('routeline').setData({
				type: 'LineString',
				coordinates: rt
			});
		}

		function onMoveLine(e) {
			const coords = e.lngLat;

			canvas.style.cursor = 'grabbing';

			let rt = $subrouteStopIds.map((id) => {
				const stop = $stops[id];
				return [stop.lon, stop.lat];
			});

			rt.splice(
				$subrouteStopIds.indexOf(initDragStop.id) + 1,
				0,
				hoveredStop ? [hoveredStop.lon, hoveredStop.lat] : [coords.lng, coords.lat]
			);

			map.getSource('routeline').setData({
				type: 'LineString',
				coordinates: rt
			});
		}

		function onUp(e) {
			canvas.style.cursor = '';

			if (hoveredStop) {
				let index = $subrouteStopIds.indexOf(initDragStop.id);
				let hoverIndex = $subrouteStopIds.indexOf(hoveredStop.id);
				if (Math.abs(index - hoverIndex) !== 1 || dragMode === 'add') {
					$subrouteStopIds.splice(
						index + (dragMode === 'add' && index != 0 ? 1 : 0),
						dragMode === 'add' ? 0 : 1,
						hoveredStop.id
					);
					$subrouteStopIds = $subrouteStopIds;
				} else if (initDragStop.id !== hoveredStop.id) {
					$subrouteStopIds.splice(index, 1);
					$subrouteStopIds = $subrouteStopIds;
				}
			}
			updateRouteLine();

			initDragStop = null;

			// Unbind mouse/touch events
			map.off('mousemove', onMove);
			map.off('touchmove', onMove);
		}

		function onUpLine(e) {
			canvas.style.cursor = '';

			if (hoveredStop) {
				$subrouteStopIds.splice($subrouteStopIds.indexOf(initDragStop.id) + 1, 0, hoveredStop.id);
				$subrouteStopIds = $subrouteStopIds;
			} else {
				console.log('Unmatched');
			}
			updateRouteLine();

			initDragStop = null;

			// Unbind mouse/touch events
			map.off('mousemove', onMoveLine);
			map.off('touchmove', onMoveLine);
		}

		function mouseDownStop(e) {
			e.preventDefault();
			e.originalEvent.preventDefault();

			if (!$subrouteStopIds.includes(e.features[0].properties.id)) return;
			if (e.originalEvent.button === 2) {
				$subrouteStopIds.splice($subrouteStopIds.indexOf(e.features[0].properties.id), 1);
				$subrouteStopIds = $subrouteStopIds;
				updateRouteLine();
				return;
			}
			if (e.originalEvent.button !== 0) return;

			canvas.style.cursor = 'grab';

			initDragStop = $stops[e.features[0].properties.id];

			map.on('mousemove', onMove);
			map.once('mouseup', onUp);
		}

		function mouseDownLine(e) {
			e.preventDefault();
			if (e.originalEvent.defaultPrevented) return;

			canvas.style.cursor = 'grab';

			let lineStringCoordinates = $subrouteStops.map((stop) => [stop.lon, stop.lat]);
			let closestIndex = -1;
			let closestDistance = Infinity;

			for (let i = 0; i < lineStringCoordinates.length - 1; i++) {
				let start = lineStringCoordinates[i];
				let end = lineStringCoordinates[i + 1];
				let distance = turf.pointToLineDistance(turf.point([e.lngLat.lng, e.lngLat.lat]), [
					start,
					end
				]);
				if (distance < closestDistance) {
					closestDistance = distance;
					closestIndex = i;
				}
			}

			initDragStop = $stops[$subrouteStopIds[closestIndex]];

			map.on('mousemove', onMoveLine);
			map.once('mouseup', onUpLine);
		}
		map.on('mousedown', 'stops', mouseDownStop);
		map.on('touchstart', 'stops', mouseDownStop);
		map.on('mousedown', 'routeline', mouseDownLine);

		map.on('mouseenter', 'stops', (e) => {
			canvas.style.cursor = 'pointer';
			hoveredStop = $stops[e.features[0].properties.id];
		});
		map.on('mouseleave', 'stops', (e) => {
			hoveredStop = null;
			canvas.style.cursor = '';
		});
		map.on('mouseenter', 'routeline', () => {
			canvas.style.cursor = 'pointer';
		});
		map.on('mouseleave', 'routeline', (e) => {
			canvas.style.cursor = '';
		});
		prevView = [map.getCenter().lng, map.getCenter().lat, map.getZoom()];
		map.on('moveend', (e) => {
			if (e.originalEvent) {
				let center = map.getCenter();
				let zoom = map.getZoom();
				prevView = [center.lng, center.lat, zoom];
			}
		});
		map.on('zoomend', (e) => {
			if (e.originalEvent) {
				let center = map.getCenter();
				let zoom = map.getZoom();
				prevView = [center.lng, center.lat, zoom];
			}
		});
	}

	let prevStop = null;
	// [lat,lon,zoom]||null
	let prevView = null;

	function highlightStop(stopId, _) {
		if (!mapLoaded) return;

		stopId = $uniqueStopIdsMap[stopId]?.id;
		if (!stopId) return;

		map.setFeatureState(
			{
				source: 'stops',
				id: stopId
			},
			{ hover: true }
		);
		if (prevStop !== null) {
			map.setFeatureState(
				{
					source: 'stops',
					id: prevStop
				},
				{ hover: false }
			);
		}
		/*if (stopId === null && prevView !== null) {
			map.flyTo({
				center: prevView.slice(0, 2),
				zoom: prevView[2]
			});
		}*/
		// log currently displayed coordinates on the map and zoom level
		prevStop = stopId;

		/*if (stopId !== null) {
			map.flyTo({
				center: $stops[stopId],
				zoom: 15
			});
		}*/
	}

	function clickStop(stopId, _) {
		if (stopId) {
			stopId = $uniqueStopIdsMap[stopId]?.id;
		}
		let stop = $stops[stopId];
		prevView = [stop.lon, stop.lat, 15];
	}

	function handleStopIdImport() {
		let data = prompt('Stop IDs');

		try {
			data = JSON.parse(data);
			if (Array.isArray(data) && data.every((d) => typeof d === 'number')) {
				let invalidStops = data.filter((id) => !$stops[id]);
				if (invalidStops.length > 0) {
					toast('Some of the stops were not recognized', 'error');
					return;
				}
				$subrouteStopIds = data;
			}
		} catch (e) {
			toast('Clipboard does not contain a stop array');
			console.log(e);
		}
	}

	function centerMap() {
		const coords = $subrouteStops.map((s) => [s.lon, s.lat]);
		if (coords.length === 0) return;

		centeredOnRoute = true;
		if (coords.length === 1) {
			map.setCenter(coords[0]);
			map.setZoom(16);
			return;
		}

		const bounds = coords.reduce(
			(bounds, coord) => {
				return bounds.extend(coord);
			},
			new LngLatBounds(coords[0], coords[0])
		);

		map.fitBounds(bounds, { padding: 50 });
	}

	function saveStops() {
		let originalStops = routeStops[$selectedSubrouteId] || [];
		let newStops = $subrouteStopIds;

		fetch(`${apiServer}/v1/subroutes/${$selectedSubrouteId}/stops`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				authorization: `Bearer ${$token}`
			},
			body: JSON.stringify({
				from: originalStops,
				to: newStops
			})
		})
			.then((resp) => {
				if (resp.ok) {
					routeStops[$selectedSubrouteId] = [...newStops];
					subrouteStopsChanged = false;
					toast('Stops saved');
				} else {
					toast("The server didn't like this data");
				}
			})
			.catch((e) => {
				console.log(e);
				toast('Error saving stops');
			});
	}

	onMount(() => {
		const mapParams = regionMapParams($selectedRegion);
		map = new Maplibre({
			container: mapElem,
			style: tileStyle,
			center: mapParams.center,
			zoom: mapParams.zoom,
			minZoom: 8,
			maxZoom: 20
		});

		if ($subrouteStops) {
			centerMap();
		}

		map.addControl(new NavigationControl(), 'top-right');

		map.on('load', () => {
			addSourcesAndLayers();
			addEvents();

			mapLoaded = true;

			drawStops();
			updateRouteLine();

			if ($selectedSubrouteId) {
				centerMap();
			}
		});
	});

	onDestroy(() => {
		mapLoaded = false;
		map.remove();
	});
</script>

<div bind:this={mapElem} class="h-full relative">
	{#if tab == tabs.meta || tab == tabs.departures || tab == tabs.validation}
		<div style="background-color: #33336699" class="z-[10] absolute inset-0 backdrop-blur-sm" />
	{/if}
	{#if isRequiredLoading}
		<div style="background-color: #33336699" class="z-[2001] absolute inset-0 backdrop-blur-sm" />
		<div class="absolute inset-x-0 m-auto w-full md:w-96 w z-[2001]">
			<div class="m-2 p-4 bg-base-100 flex flex-col gap-4 rounded-2xl shadow-3xl max-h-full">
				<span class="text-xl">A carregar</span>
				<span
					>Mapa: <progress
						class="progress progress-primary w-full"
						value={mapLoaded ? 100 : 0}
						max="100"
					/>
				</span>
				<span>
					Paragens: <progress
						class="progress progress-primary w-full"
						value={stopsLoaded ? 100 : 0}
						max="100"
					/>
				</span>
			</div>
		</div>
	{/if}
	<div
		class="absolute lg:left-4 lg:top-4 top-2 left-2 z-10 flex flex-col gap-4 items-start"
		class:right-2={tab != tabs.view && tab != tabs.stops}
		class:bottom-2={tab != tabs.view && tab != tabs.stops}
	>
		<div class="rounded-xl shadow-lg flex flex-col gap-1 p-2 bg-base-100">
			<div class="flex flex-row w-full gap-2 items-center">
				<div
					class="h-8 min-w-12 px-1 rounded-xl flex items-center justify-center font-bold"
					style:background-color={$route?.badge_bg}
					style:color={$route?.badge_text}
				>
					{$route?.code}
				</div>
				<div class="font-bold w-full flex-1 flex items-center min-h-8 pl-3 text-sm cursor-default">
					{$route?.name}
				</div>
			</div>
			<div role="tablist" class="tabs tabs-boxed">
				<button
					class="tab"
					class:tab-active={tab == tabs.view}
					on:click={() => {
						tab = tabs.view;
					}}>Ver</button
				>
				<button
					class="tab"
					class:tab-active={tab == tabs.meta}
					on:click={() => {
						tab = tabs.meta;
					}}>Detalhes</button
				>
				<button
					class="tab"
					class:tab-active={tab == tabs.stops}
					on:click={() => {
						tab = tabs.stops;
					}}>Paragens</button
				>
				<button
					class="tab"
					class:tab-active={tab == tabs.departures}
					on:click={() => {
						tab = tabs.departures;
					}}>Horários</button
				>
				<button
					class="tab"
					class:tab-active={tab == tabs.validation}
					on:click={() => {
						tab = tabs.validation;
					}}>Validação</button
				>
			</div>
			{#if tab == tabs.view || tab == tabs.stops || tab == tabs.departures}
				<div class="flex flex-row w-full gap-2">
					<div class="h-8 w-12 rounded-xl flex items-center justify-center font-bold bg-base-200">
						{$selectedSubrouteId}
					</div>
					<select
						bind:value={$selectedSubrouteId}
						class="select border-neutral border-opacity-20 select-sm w-full flex-1 !font-normal"
					>
						{#if $route}
							{#each $route.subroutes as subroute}
								<option value={subroute.id}>{subrouteTitle(subroute)}</option>
							{/each}
						{/if}
					</select>
				</div>
			{/if}
		</div>
		{#if tab == tabs.meta && $stops}
			<div class="flex gap-4 rounded-xl shadow-lg p-2 bg-base-100 self-center overflow-y-auto">
				<RouteForm
					route={$stagedRoute}
					stops={$stops}
					routeStops={$routeStops}
					{routeTypes}
					canEdit={isAdmin}
				/>
			</div>
		{:else if tab == tabs.departures && $selectedSubroute}
			<div
				class="flex flex-col gap-4 rounded-xl shadow-lg p-2 bg-base-100 self-center overflow-y-auto"
			>
				<DepartureEditor
					{selectedSubroute}
					{routeSchedules}
					{operatorCalendars}
					canEdit={isAdmin}
				/>
			</div>
		{:else if tab == tabs.validation}
			<div class="flex flex-col rounded-xl shadow-lg p-2 bg-base-100 overflow-y-auto">
				<GtfsValidator {route} {stops} {routeStops} {operatorId} canEdit={isAdmin} />
			</div>
		{/if}
	</div>
	{#if tab == tabs.stops}
		<div
			class="absolute lg:left-4 lg:bottom-4 bottom-2 left-2 z-10 bg-base-100 rounded-xl p-1 flex flex-col gap-1"
		>
			<button class="btn btn-sm normal-case" class:hidden={!isAdmin} on:click={handleStopIdImport}
				>Import</button
			>
			<button
				class="btn btn-sm normal-case"
				on:mousedown={() => {
					navigator.clipboard.writeText(JSON.stringify($subrouteStopIds));
					toast('Subroute IDs copied to the clipboard');
				}}>Export</button
			>
			<div class="divider my-0 h-2 px-2" />
			<div class="tabs tabs-boxed flex-col items-stretch">
				<button
					class="tab transition-colors"
					class:tab-active={dragMode === 'add'}
					on:click={() => (dragMode = 'add')}
				>
					Adicionar
				</button>
				<button
					class="tab transition-colors"
					class:tab-active={dragMode === 'move'}
					on:click={() => (dragMode = 'move')}
				>
					Mover
				</button>
			</div>
		</div>
		<div class="absolute right-0 z-10 flex flex-col justify-center h-full p-2 transition w-[40em]">
			<div class="bg-base-100 h-full rounded-xl shadow-lg flex flex-col">
				<div class="pt-2 px-4 overflow-y-auto hide-scrollbar grow">
					<!-- TODO delete once the derived-not-generating bug is fixed -->
					<span class="hidden">{$initialSubrouteStopIds?.length}</span>
					{#key $selectedSubrouteId}
						<DraggableList
							bind:data={$uniqueSubrouteStopIds}
							itemsMap={$uniqueStopIdsMap}
							onHover={highlightStop}
							onClick={clickStop}
							removesItems={true}
						/>
					{/key}
				</div>
				{#if isAdmin}
					<div class="divider px-6 m-2" />
					<div class="flex">
						<input
							disabled={!subrouteStopsChanged}
							type="button"
							value="Guardar"
							class="btn btn-md btn-primary flex-1"
							on:click={saveStops}
						/>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.hide-scrollbar::-webkit-scrollbar {
		display: none;
	}
</style>
