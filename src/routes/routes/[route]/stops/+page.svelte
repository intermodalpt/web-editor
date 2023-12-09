<script>
	import { onDestroy, onMount } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import { Map as Maplibre, NavigationControl, LngLatBounds } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import * as turf from '@turf/turf';
	import { liveQuery } from 'dexie';
	import { decodedToken, token, toast } from '$lib/stores.js';
	import { apiServer, tileStyle } from '$lib/settings.js';
	import { fetchStops, fetchRoutes, getStops, getRoutes, loadMissing } from '$lib/db';
	import DraggableList from '$lib/stops/DraggableList.svelte';

	export let data;

	let isAdmin = $decodedToken?.permissions?.is_admin || false;

	let map;
	let mapElem;
	let dragMode = 'move';

	let mapLoaded = false;

	const stops = liveQuery(() => getStops());
	const routes = liveQuery(() => getRoutes());

	async function loadData() {
		await Promise.all([fetchStops(), fetchRoutes()]);
	}

	loadData().then(async () => {
		console.log('data loaded');
		await loadMissing();
	});

	const routeId = data.routeId;

	let routeStops = data.routeStops;

	const route = derived(routes, ($routes) => {
		if (!$routes) return;
		return $routes[routeId];
	});

	let initialSubrouteStopIds = [];
	const selectedSubrouteId = writable(null);
	const subrouteStopIds = writable([]);

	let nounce = 0;
	const uniqueSubrouteStopIds = writable([]);
	const uniqueStopIdsMap = writable({});

	$: changed = !(
		initialSubrouteStopIds.length == $subrouteStopIds.length &&
		$subrouteStopIds.every((id, i) => id === initialSubrouteStopIds[i])
	);

	const subrouteStops = derived([stops, subrouteStopIds], ([$stops, $subrouteStopIds]) => {
		if (!$stops || $stops.length == 0 || !$subrouteStopIds) return [];
		const srStops = $subrouteStopIds?.map((stop) => $stops[stop]);
		const len = srStops.length;
		const validSrStops = srStops.filter((stop) => stop);
		if (len != validSrStops.length) {
			alert('Some of the stops were not recognized');
		}
		return validSrStops;
	});

	stops.subscribe(() => {
		if (!$stops || !mapLoaded) return;
		drawStops();
	});

	routes.subscribe(($routes) => {
		$selectedSubrouteId = $routes[routeId]?.subroutes[0]?.id;

		if ($selectedSubrouteId && routeStops) {
			$subrouteStopIds = routeStops[$selectedSubrouteId];
			if (!$subrouteStopIds) {
				alert('No stops found for this subroute (might be a bug)');
				$subrouteStopIds = [];
			}
		}
	});

	subrouteStopIds.subscribe(($subrouteStopIds) => {
		if (!$subrouteStopIds) return;

		const propagationNeeded = !(
			$uniqueSubrouteStopIds.length === $subrouteStopIds.length &&
			$uniqueSubrouteStopIds.every((uId, i) => $uniqueStopIdsMap[uId]?.id === $subrouteStopIds[i])
		);

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
		updateRouteLine();
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
	});

	/*	subrouteStops.subscribe(($subrouteStops) => {
		if ($subrouteStops && map) {
			centerMap();
		}
	});*/

	selectedSubrouteId.subscribe(($selectedSubrouteId) => {
		if ($selectedSubrouteId && routeStops && routeStops[$selectedSubrouteId] != undefined) {
			initialSubrouteStopIds = [...routeStops[$selectedSubrouteId]];
			$subrouteStopIds = [...initialSubrouteStopIds];
			if (map) {
				centerMap();
			}
		} else {
			initialSubrouteStopIds = [];
			$subrouteStopIds = [];
		}
	});

	function drawStops() {
		map.getSource('stops').setData({
			type: 'FeatureCollection',
			features: Object.values($stops).map((stop) => ({
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: [stop.lon, stop.lat]
				},
				properties: {
					id: stop.id,
					osm_name: stop.osm_name
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
					coordinates: $subrouteStopIds.map((id) => {
						const stop = $stops[id];
						return [stop.lon, stop.lat];
					})
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
				'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 3, 14, 4, 16, 8, 18, 12, 20, 16],
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
				return [stop.lon, stop.lat];
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
		if (stopId) {
			stopId = $uniqueStopIdsMap[stopId]?.id;
		}

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
	document.addEventListener('paste', (event) => {
		let data = event.clipboardData.getData('text');
		try {
			data = JSON.parse(data);
			if (Array.isArray(data) && data.every((d) => typeof d === 'number')) {
				$subrouteStopIds = data;
			}
		} catch (e) {
			toast('Clipboard does not contain a stop array');
			console.log(e);
		}
	});

	function centerMap() {
		const coords = $subrouteStops.map((s) => [s.lon, s.lat]);
		if (coords.length === 0) return;

		if (coords.length === 1) {
			map.setCenter(coords[0]);
			map.setZoom(16);
			return;
		}

		const bounds = coords.reduce((bounds, coord) => {
			return bounds.extend(coord);
		}, new LngLatBounds(coords[0], coords[0]));

		map.fitBounds(bounds, { padding: 50 });
	}

	function saveStops() {
		let originalStops = routeStops[$selectedSubrouteId];
		let newStops = $subrouteStopIds;

		fetch(`${apiServer}/v1/routes/${$route.id}/stops/subroutes/${$selectedSubrouteId}`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				authorization: `Bearer ${$token}`
			},
			body: JSON.stringify({
				from: {
					stops: originalStops
				},
				to: {
					stops: newStops
				}
			})
		})
			.then((resp) => {
				if (resp.ok) {
					routeStops[$selectedSubrouteId] = [...newStops];
					changed = false;
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
		map = new Maplibre({
			container: mapElem,
			style: tileStyle,
			minZoom: 8,
			maxZoom: 20,
			maxBounds: [
				[-10.0, 38.3],
				[-8.0, 39.35]
			]
		});

		if ($subrouteStops) {
			centerMap();
		}

		map.addControl(new NavigationControl(), 'top-left');
		map.setPadding({ right: 450 });

		map.on('load', () => {
			addSourcesAndLayers();
			addEvents();

			mapLoaded = true;

			if ($stops) {
				drawStops();
			}

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
	<div
		class="absolute lg:left-4 lg:bottom-4 bottom-2 left-2 z-10 bg-base-100 rounded-xl p-1 flex flex-col gap-1"
	>
		<button
			class="btn btn-sm normal-case"
			on:click={() => {
				toast('Just CTRL+V with the stop list in your clipboard');
			}}>Import</button
		>
		<button
			class="btn btn-sm normal-case"
			on:mousedown={() => {
				navigator.clipboard.writeText(JSON.stringify($subrouteStopIds));
				toast('Route stop IDs copied to the clipboard');
			}}>Export</button
		>
		<div class="divider my-0 h-2 px-2" />
		<div class="tabs tabs-boxed flex-col items-stretch">
			<div
				class="tab transition-colors"
				class:tab-active={dragMode === 'add'}
				on:mousedown={() => (dragMode = 'add')}
			>
				Adicionar
			</div>
			<div
				class="tab transition-colors"
				class:tab-active={dragMode === 'move'}
				on:mousedown={() => (dragMode = 'move')}
			>
				Mover
			</div>
		</div>
	</div>
	<div class="absolute right-0 z-10 flex flex-col justify-center h-full p-2 transition w-[40em]">
		<div class="bg-base-100 h-full rounded-xl shadow-lg flex flex-col">
			<div class="flex flex-col px-4 pt-4 gap-2">
				<div class="flex flex-row w-full gap-2 items-center">
					<div
						class="h-8 w-12 rounded-xl flex items-center justify-center font-bold"
						style:background-color={$route?.badge_bg}
						style:color={$route?.badge_text}
					>
						{$route?.code}
					</div>
					<div
						class="font-bold w-full flex-1 flex items-center min-h-8 pl-3 text-sm cursor-default"
					>
						{$route?.name}
					</div>
				</div>
				<div class="flex flex-row w-full gap-2">
					<div
						class="h-8 w-12 rounded-xl flex items-center justify-center font-bold bg-primary text-primary-content"
					>
						{$selectedSubrouteId}
					</div>
					<select
						bind:value={$selectedSubrouteId}
						class="select select-bordered border-neutral border-opacity-20 select-sm w-full flex-1 !font-normal"
					>
						{#if $route}
							{#each $route.subroutes as subroute}
								<option value={subroute.id}>{subroute.flag}</option>
							{/each}
						{/if}
					</select>
				</div>
			</div>
			<div class="divider px-6 my-2" />
			<div class="px-4 scrollbar">
				<!-- By rerendering there is no weird shuffle animation of the list -->
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
			<div class="divider px-6 m-2" />
			<div class="flex">
				<input
					disabled={!changed || !isAdmin}
					type="button"
					value="Guardar"
					class="btn btn-md btn-primary flex-1"
					on:click={saveStops}
				/>
			</div>
		</div>
	</div>
</div>

<style>
	.scrollbar::-webkit-scrollbar {
		display: none;
	}
	.scrollbar {
		overflow-y: scroll;
	}
</style>
