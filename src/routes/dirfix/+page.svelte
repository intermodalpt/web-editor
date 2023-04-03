<script>
	/*
I want a tool that operates on two sets of stops.
The first set, GTFS stops, has slight errors in the locations.
The second set has good locations but no IDs.
We want to use the first set to attach the IDs to the second set.

This is going to be done by estimating, based on proximity, which stops are the same.
- A radius of 150 meters only contains two stops, then it is very likely that those stops are the sides of the street in the same location.
- We show both stops to the user and the user can select which stop is the correct one.

For this task, we want to have a maplibre widget that
- Presents a stop from the first (GTFS) set
- Red lines showing a vector from the stops that bus routes serve before serving the current, gtfs stop.
- Green lines showing a vector to the stops that bus routes serve after serving the current, gtfs stop
- The candidates for the second set are shown as blue dots.
- The user can select a candidate and the stop is added to the second set.

The inputs are three lists. 
GTFS stop list (gtfs_stops) has objects with the following properties:
- gtfs_id: string
- lat: number
- lon: number
- name: string

The stop list (stops) has objects with the following properties:
- id: string
- lat: number
- lon: number

The third list (paths) has triples with (gtfs_origin_id, stop_gtfs_id, gtfs_destination_id).


We want to be left with a mapping of (origin_id, destination_id) to stop_id.
*/

	import { onDestroy, onMount } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import { Map as Maplibre, NavigationControl, LngLatBounds } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import * as turf from '@turf/turf';
	import { decodedToken, token } from '$lib/stores.js';
	import { apiServer } from '$lib/settings.js';

	let stops = [];
	let gtfs_stops = [];
	let gtfs_routes = [];
	let map;

	const selectedStop = writable(null);
	const selectedGtfsStop = writable(null);

	const hasMutualLink = derived(
		[selectedStop, selectedGtfsStop],
		([$selectedStop, $selectedGtfsStop]) => {
			return (
				$selectedStop && $selectedGtfsStop && $selectedStop.tml_id === $selectedGtfsStop.stop_id
			);
		}
	);

	const selectedGtfsStopRoutes = derived(selectedGtfsStop, ($selectedGTFSStop) => {
		if ($selectedGTFSStop == null) return [];
		return Array.from($selectedGTFSStop.routes)
			.sort((a, b) => a.id.localeCompare(b.id))
			.map((r) => {
				const filteredRoute = Object.assign({}, r);
				filteredRoute.trips = filteredRoute.trips.filter((t) =>
					t.stops.includes($selectedGTFSStop.id)
				);
				return filteredRoute;
			});
	});

	const selectedStopRoutes = derived(selectedStop, ($selectedStop, set) => {
		if (!$selectedStop) return null;

		fetch(`${apiServer}/v1/stops/${$selectedStop.id}/spider`)
			.then((r) => r.json())
			.then((r) => {
				set(
					Object.values(r.routes).sort(
						(a, b) => parseInt(a.code) - parseInt(b.code) || a.code.localeCompare(b.code)
					)
				);
			});
	});

	const previewedTrip = writable(null);

	selectedGtfsStop.subscribe((gtfsStop) => {
		previewedTrip.set(null);
		if (!map) return;

		console.log('padding', { left: gtfsStop ? 300 : 0, right: $selectedStop ? 300 : 0 });
		map.easeTo({
			padding: { left: gtfsStop ? 300 : 0, right: $selectedStop ? 300 : 0 },
			duration: 750
		});
		return;
	});

	selectedStop.subscribe((stop) => {
		if (!map) return;

		console.log('padding', { left: $selectedGtfsStop ? 300 : 0, right: stop ? 300 : 0 });
		map.easeTo({
			padding: { left: $selectedGtfsStop ? 300 : 0, right: stop ? 300 : 0 },
			duration: 750
		});
		return;
	});

	previewedTrip.subscribe((trip) => {
		if (!map) return;
		if (!trip) {
			map.getSource('trippreview').setData({
				type: 'LineString',
				coordinates: []
			});
			return;
		}

		map.getSource('trippreview').setData({
			type: 'LineString',
			coordinates: trip.stops.map((stop) => [gtfs_stops[stop].lon, gtfs_stops[stop].lat])
		});
	});

	Promise.all([
		fetch(`${apiServer}/v1/tml/stops`).then((r) => r.json()),
		fetch(`${apiServer}/v1/tml/gtfs_stops`).then((r) => r.json()),
		fetch(`${apiServer}/v1/tml/gtfs_routes`).then((r) => r.json())
	]).then(([resp_stops, resp_gtfs_stops, resp_gtfs_routes]) => {
		gtfs_stops = Object.fromEntries(
			resp_gtfs_stops.map((stop) => [
				parseInt(stop.stop_id),
				Object.assign(stop, {
					lat: stop.stop_lat,
					lon: stop.stop_lon,
					id: parseInt(stop.stop_id),
					routes: new Set()
				})
			])
		);
		stops = Object.fromEntries(
			resp_stops.map((stop) => [
				stop.id,
				Object.assign(stop, {
					gtfsStop: gtfs_stops[parseInt(stop.tml_id)] || null
				})
			])
		);

		gtfs_routes = resp_gtfs_routes;

		gtfs_routes.forEach((route) => {
			route.trips.forEach((trip) => {
				trip.stops.forEach((stop) => {
					gtfs_stops[stop].routes.add(route);
				});
			});
		});

		refreshStops();

		// map.getSource('matchline').setData({
		// 	type: 'LineString',
		// 	coordinates: [
		// 		[selectedPoint.lon, selectedPoint.lat],
		// 		[hoveredStop.lon, hoveredStop.lat]
		// 	]
		// });
	});

	function refreshMatches() {
		let unvStops = Object.values(stops).filter(
			(stop) => stop.tml_id && !['tml', 'manual', 'flags'].includes(stop.tml_id_source)
		);
		let verStops = Object.values(stops).filter(
			(stop) => stop.tml_id && ['tml', 'manual', 'flags'].includes(stop.tml_id_source)
		);

		const matchToFeature = (stop) => {
			let gtfsStop = gtfs_stops[parseInt(stop.tml_id)];

			return {
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: [[stop.lon, stop.lat], gtfsStop ? [gtfsStop.lon, gtfsStop.lat] : [0.0, 90.0]]
				}
			};
		};

		map.getSource('stopmatches-unv').setData({
			type: 'FeatureCollection',
			features: unvStops.map(matchToFeature)
		});
		map.getSource('stopmatches-ver').setData({
			type: 'FeatureCollection',
			features: verStops.map(matchToFeature)
		});
	}

	function loadCurrentWindow(curr_stop, prev_succ_pairs) {
		if (prev_succ_pairs.length === 0) {
			return;
		}

		const origins = prev_succ_pairs.filter((w) => w[0]).map((w) => gtfs_stops[w[0]]);
		const destinations = prev_succ_pairs.filter((w) => w[1]).map((w) => gtfs_stops[w[1]]);
		const ori_points = turf.points(origins.map((s) => [s.stop_lon, s.stop_lat]));
		const dst_points = turf.points(destinations.map((s) => [s.stop_lon, s.stop_lat]));
		const avg_ori = turf.center(ori_points);
		const avg_dst = turf.center(dst_points);
		const bearing = turf.bearing(avg_ori, avg_dst);

		map.getSource('origins').setData({
			type: 'MultiLineString',
			coordinates: origins.map((s) => [
				[s.stop_lon, s.stop_lat],
				[curr_stop.stop_lon, curr_stop.stop_lat]
			])
		});

		map.getSource('destinations').setData({
			type: 'MultiLineString',
			coordinates: destinations.map((s) => [
				[curr_stop.stop_lon, curr_stop.stop_lat],
				[s.stop_lon, s.stop_lat]
			])
		});

		// Fly to the current stop
		map.flyTo({
			center: [curr_stop.stop_lon, curr_stop.stop_lat],
			zoom: 16,
			bearing: bearing,
			duration: 2000,
			pitch: 45
		});
	}

	function refreshStops() {
		refreshMatches();

		map.getSource('stops').setData({
			type: 'FeatureCollection',
			features: Object.values(stops).map((stop) => {
				return {
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: [stop.lon, stop.lat]
					},
					properties: {
						id: stop.id,
						osm_name: stop.osm_name
					}
				};
			})
		});
		map.getSource('gtfs').setData({
			type: 'FeatureCollection',
			features: Object.values(gtfs_stops).map((stop) => {
				return {
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: [stop.stop_lon, stop.stop_lat]
					},
					properties: {
						id: stop.id,
						// name: stop.stop_name,
						id_name: `${stop.id} - ${stop.stop_name}`
					}
				};
			})
		});
	}

	function flyToTrip(trip) {
		const bounds = new LngLatBounds();
		trip.stops
			.map((s) => gtfs_stops[s])
			.forEach((stop) => {
				bounds.extend([stop.lon, stop.lat]);
			});
		map.fitBounds(bounds, {
			padding: 50
		});
	}

	function flyToGtfsStop(gtfsStop) {
		map.flyTo({
			center: [gtfsStop.lon, gtfsStop.lat],
			zoom: 17.5
		});
	}

	function flyToStop(stop) {
		map.flyTo({
			center: [stop.lon, stop.lat],
			zoom: 17.5
		});
	}

	function connectStops(stop, gtfsStop) {
		if (
			stop.gtfsStop &&
			stop.gtfsStop != gtfsStop &&
			!confirm('Paragem já está ligada a outra paragem GTFS. Continuar?')
		) {
			return;
		}

		const beingUsed = stops.some((s) => {
			s != stop && s.gtfsStop == gtfsStop;
		});

		if (beingUsed && !confirm('Paragem GTFS já está ligada a outra paragem. Continuar?')) {
			return;
		}

		const headers = {
			'Content-Type': 'application/json',
			authorization: `Bearer ${$token}`
		};
		fetch(`${apiServer}/v1/tml/match/${stop.id}/${gtfsStop.stop_id}?verified=true&source=h1`, {
			method: 'POST',
			headers: headers
		}).then((r) => {
			if (r.ok) {
				console.log('ID da paragem atualizado com sucesso.');
				stop.gtfsStop = gtfsStop;
				stop.tml_id = gtfsStop.stop_id;
				stop.tml_id_verified = true;
				stop.tml_id_source = 'h1';
				refreshStops();
			} else {
				alert('Erro a atualizar o ID da paragem.\nRecarregue e tente novamente.');
			}
		});
	}

	function addSourcesAndLayers() {
		map.addSource('stopmatches-unv', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});
		map.addLayer({
			id: 'stopmatches-unv',
			type: 'line',
			source: 'stopmatches-unv',
			paint: {
				'line-color': '#c026d3',
				'line-width': 3
			}
		});

		map.addSource('stopmatches-ver', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});
		map.addLayer({
			id: 'stopmatches-ver',
			type: 'line',
			source: 'stopmatches-ver',
			paint: {
				'line-color': '#e11d48',
				'line-width': 3
			}
		});

		map.addSource('gtfs', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});
		map.addLayer({
			id: 'gtfs',
			type: 'circle',
			source: 'gtfs',
			paint: {
				'circle-color': 'rgb(220, 150, 50)',
				'circle-radius': {
					base: 1.75,
					stops: [
						[0, 1.5],
						[11, 2],
						[18, 7]
					]
				},
				'circle-stroke-width': 1,
				'circle-stroke-color': '#fff'
			}
		});
		map.addLayer({
			id: 'gtfsLabels',
			type: 'symbol',
			source: 'gtfs',
			layout: {
				'text-field': ['get', 'id_name'],
				'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
				'text-size': 8,
				'text-offset': [5, 0],
				'text-anchor': 'left',
				'text-max-width': 150,
				'text-allow-overlap': false
				// 'text-ignore-placement': true
			},
			minzoom: 18
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
				'circle-color': 'rgb(50, 150, 220)',
				'circle-radius': {
					base: 1.75,
					stops: [
						[0, 1.5],
						[11, 2],
						[18, 7]
					]
				},
				'circle-stroke-width': 1,
				'circle-stroke-color': '#fff'
			}
		});

		map.addLayer(
			{
				id: 'trippreview',
				type: 'line',
				source: {
					type: 'geojson',
					data: {
						type: 'MultiLineString',
						coordinates: []
					}
				},
				paint: {
					'line-color': '#67e8f9',
					'line-width': 4
				}
			},
			'gtfs'
		);

		map.addLayer(
			{
				id: 'origins',
				type: 'line',
				source: {
					type: 'geojson',
					data: {
						type: 'MultiLineString',
						coordinates: []
					}
				},
				paint: {
					'line-color': '#16a34a',
					'line-width': 2
				}
			},
			'gtfs'
		);

		map.addLayer(
			{
				id: 'destinations',
				type: 'line',
				source: {
					type: 'geojson',
					data: {
						type: 'MultiLineString',
						coordinates: []
					}
				},
				paint: {
					'line-color': '#bef264',
					'line-width': 2
				}
			},
			'gtfs'
		);

		map.addSource('matchline', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});
	}

	function addEvents() {
		const canvas = map.getCanvasContainer();

		map.on('mouseenter', 'gtfs', () => {
			canvas.style.cursor = 'pointer';
		});
		map.on('mouseleave', 'gtfs', () => {
			canvas.style.cursor = '';
		});
		map.on('mouseenter', 'stops', () => {
			canvas.style.cursor = 'pointer';
		});
		map.on('mouseleave', 'stops', () => {
			canvas.style.cursor = '';
		});

		map.on('click', 'stops', (e) => {
			let stop = stops[e.features[0].properties.id];
			$selectedStop = stop;
		});

		map.on('click', 'gtfs', (e) => {
			if (map.getZoom() < 15) return;

			let stop = gtfs_stops[e.features[0].properties.id];
			$selectedGtfsStop = stop;

			// For each route, for each trip, build a three stop window with the previous, current and next stop
			const windows = new Map();
			stop.routes.forEach((route) => {
				for (const trip of route.trips) {
					// Find index of the current stop in the trip
					const idx = trip.stops.findIndex((s) => s === stop.id);
					// If not found, ignore
					if (idx === -1) continue;
					// If found, build a window with the previous, current and next stop
					const trip_window = JSON.stringify([trip.stops[idx - 1], trip.stops[idx + 1]]);
					// If the window is not in the map, add it, pointing to the current route, trip pair
					if (!windows.has(trip_window)) {
						windows.set(trip_window, [[route, trip]]);
					} else {
						// If the window is already in the map, add the current route, trip pair to the list
						windows.get(trip_window).push([route, trip]);
					}
				}
			});
			// Rebuild window with JSON parsed keys
			const parsedWindows = new Map();
			for (const [key, value] of windows) {
				parsedWindows.set(JSON.parse(key), value);
			}

			loadCurrentWindow(stop, Array.from(parsedWindows.keys()));
		});

		let draggedGtfsStop = null;
		let hoveredStop = null;

		function onMove(e) {
			const coords = e.lngLat;

			// Set a UI indicator for dragging.
			canvas.style.cursor = 'grabbing';

			if (hoveredStop) {
				map.getSource('matchline').setData({
					type: 'LineString',
					coordinates: [
						[draggedGtfsStop.lon, draggedGtfsStop.lat],
						[hoveredStop.lon, hoveredStop.lat]
					]
				});
			} else {
				map.getSource('matchline').setData({
					type: 'LineString',
					coordinates: [
						[draggedGtfsStop.lon, draggedGtfsStop.lat],
						[coords.lng, coords.lat]
					]
				});
			}
		}

		function onUp(e) {
			canvas.style.cursor = '';
			map.removeLayer('matchline');

			if (hoveredStop) {
				console.log('Matched', hoveredStop);
				console.log('with', draggedGtfsStop);
				// connectStops(draggedGtfsStop, hoveredStop);
			} else {
				console.log('Unmatched');
			}

			draggedGtfsStop = null;

			// Unbind mouse/touch events
			map.off('mousemove', onMove);
			map.off('touchmove', onMove);
		}

		map.on('mousedown', 'gtfs', (e) => {
			// Prevent the default map drag behavior.
			e.preventDefault();

			canvas.style.cursor = 'grab';

			draggedGtfsStop = gtfs_stops[e.features[0].properties.id];

			map.addLayer(
				{
					id: 'matchline',
					type: 'line',
					source: 'matchline',
					paint: {
						'line-color': 'grey',
						'line-width': 4
					}
				},
				'gtfs'
			);

			map.on('mousemove', onMove);
			map.once('mouseup', onUp);
		});

		map.on('touchstart', 'gtfs', (e) => {
			if (e.points.length !== 1) return;

			// Prevent the default map drag behavior.
			e.preventDefault();

			draggedGtfsStop = gtfs_stops[e.features[0].properties.id];

			map.addLayer(
				{
					id: 'matchline',
					type: 'line',
					source: 'matchline',
					paint: {
						'line-color': 'grey',
						'line-width': 4
					}
				},
				'gtfs'
			);

			map.on('touchmove', onMove);
			map.once('touchend', onUp);
		});

		map.on('mouseenter', 'stops', (e) => {
			hoveredStop = stops[e.features[0].properties.id];
		});
		map.on('mouseleave', 'stops', (e) => {
			hoveredStop = null;
		});
	}

	onMount(() => {
		map = new Maplibre({
			container: 'map',
			style: 'https://tiles.intermodal.pt/styles/positron/style.json',
			center: [-9.0, 38.605],
			zoom: 11,
			minZoom: 8,
			maxZoom: 20,
			maxBounds: [
				[-10.0, 38.3],
				[-8.0, 39.35]
			]
		});

		map.addControl(new NavigationControl(), 'top-right');

		map.on('load', function () {
			addSourcesAndLayers();
			addEvents();

			// mapLoaded = true;
			// if (stopsLoaded) {
			// 	loadStops();
			// }
		});
	});

	onDestroy(() => {
		map.remove();
	});
</script>

<div id="map" class="h-full relative">
	<div
		class="absolute left-0 z-10 flex flex-col justify-center h-full transition duration-750"
		class:-translate-x-[300px]={!$selectedGtfsStop}
	>
		<div
			class="w-[300px] bg-orange-900 grid grid-cols-1 h-full lg:h-[95%] lg:rounded-r-xl border-r-2 border-orange-700"
			style="grid-template-rows: auto 1fr;"
		>
			<div class="flex gap-1 justify-between p-1">
				<span class="text-base-100 font-bold self-center">{$selectedGtfsStop?.stop_name}</span>
				<button
					class="btn btn-circle btn-xs btn-error self-start"
					on:click={() => ($selectedGtfsStop = null)}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/></svg
					>
				</button>
			</div>
			<div class="w-full h-full overflow-y-scroll p-2 bg-base-100 flex flex-col lg:rounded-br-xl">
				<div class="flex gap-2">
					<span class="font-bold">GTFS ID:</span>
					<button
						class="btn btn-xs text-orange-200 bg-orange-600 border-orange-600"
						on:click={() => {
							if ($selectedGtfsStop) {
								flyToGtfsStop($selectedGtfsStop);
							}
						}}
					>
						{$selectedGtfsStop?.stop_id}
					</button>
				</div>
				<div class="flex flex-col">
					<h1 class="text-sm font-semibold self-center">Rotas</h1>
					<ul class="flex flex-col gap-3">
						{#each $selectedGtfsStopRoutes as route}
							<li class="flex flex-col">
								<span class="badge badge-secondary badge-outline">{route.id}</span>
								<ul class="ml-4 flex flex-col gap-2">
									{#each route.trips as trip}
										<li class="flex flex-col">
											<div class="flex">
												<button
													class="btn btn-outline btn-xs !rounded-r-0 grow"
													on:click={() => {
														flyToTrip(trip);
														$previewedTrip = trip;
													}}>{trip.id}</button
												>
												<button
													class="btn btn-outline btn-xs !rounded-l-0"
													class:btn-primary={trip === $previewedTrip}
													on:click={() => {
														$previewedTrip = trip === $previewedTrip ? null : trip;
													}}>Ver</button
												>
											</div>
											<span>Destino: <span class="font-bold">{trip.headsign}</span></span>
										</li>
									{/each}
								</ul>
							</li>
						{/each}
					</ul>
				</div>
			</div>
		</div>
	</div>
	<div
		class="absolute right-0 z-10 flex flex-col justify-center h-full transition duration-750"
		class:translate-x-[300px]={!$selectedStop}
	>
		<div
			class="w-[300px] bg-blue-950 grid grid-cols-1 h-full lg:h-[95%] lg:rounded-l-xl border-l-2 border-blue-700"
			style="grid-template-rows: auto 1fr;"
		>
			<div class="flex gap-1 justify-between p-1">
				<span class="text-base-100 font-bold self-center">{$selectedStop?.osm_name}</span>
				<button
					class="btn btn-circle btn-xs btn-error self-start"
					on:click={() => ($selectedStop = null)}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/></svg
					>
				</button>
			</div>
			<div
				class="w-full h-full overflow-y-scroll p-2 bg-base-100 flex flex-col gap-1 lg:rounded-bl-xl"
			>
				<div class="flex gap-2">
					<span class="font-bold">IML ID:</span>
					<div
						class="btn btn-xs text-blue-200 bg-blue-600 border-blue-600"
						on:click={() => {
							flyToStop($selectedStop);
						}}
					>
						{$selectedStop?.id}
					</div>
				</div>
				<div class="flex gap-2">
					<span class="font-bold">Coord:</span>
					<div class="flex">
						<input
							class="btn btn-primary btn-xs rounded-r-none"
							type="button"
							value={$selectedStop?.lat.toFixed(6)}
							on:click={() => {
								navigator.clipboard.writeText($selectedStop?.lat.toFixed(6));
							}}
						/>
						<input
							class="btn btn-primary btn-xs rounded-l-none"
							type="button"
							value={$selectedStop?.lon.toFixed(6)}
							on:click={() => {
								navigator.clipboard.writeText($selectedStop?.lon.toFixed(6));
							}}
						/>
					</div>
					<input
						class="btn btn-secondary btn-xs"
						type="button"
						value="Copiar"
						on:click={() => {
							navigator.clipboard.writeText(
								$selectedStop?.lat.toFixed(6) + '\t' + $selectedStop?.lon.toFixed(6)
							);
						}}
					/>
				</div>
				{#if $selectedStop?.tml_id}
					<div class="flex gap-1">
						<h1 class="text-xs font-bold">Ligada a</h1>
						{#if $selectedStop.gtfsStop}
							<button
								class="btn btn-xs text-orange-200 bg-orange-600 border-orange-600"
								on:click={() => {
									$selectedGtfsStop = $selectedStop.gtfsStop;
									flyToGtfsStop($selectedStop.gtfsStop);
								}}>{$selectedStop?.tml_id}</button
							>
						{:else}
							<button class="btn btn-xs text-orange-200 bg-orange-600 border-orange-600"
								>⚠️{$selectedStop?.tml_id}</button
							>
							<button class="btn btn-xs btn-error">Apagar erro</button>
						{/if}
					</div>
				{/if}
				<h1 class="text-sm self-center font-semibold">Rotas</h1>
				<ul class="flex flex-col gap-3">
					{#each $selectedStopRoutes || [] as route}
						<li class="flex flex-nowrap gap-1">
							<span class="badge badge-secondary badge-outline">{route.code}</span>
							<span class="font-bold">{route.name}</span>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</div>
	<div class="absolute bottom-0 z-10 flex justify-center w-full transition duration-750">
		<div class="flex justify-center gap-4 lg:w-[50%] mb-4">
			<button
				class="btn btn-primary"
				class:hidden={!($selectedStop && $selectedGtfsStop && !$hasMutualLink)}
				on:click={() => {
					connectStops($selectedStop, $selectedGtfsStop);
				}}>Ligar paragens</button
			>
			<!-- <button class="btn btn-warning">Adicionar alerta</button>
			<button class="btn btn-error" class:hidden={!$hasMutualLink}>Apagar ligação</button> -->
		</div>
	</div>
</div>
