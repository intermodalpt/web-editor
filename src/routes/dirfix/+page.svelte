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
	import { Map as Maplibre, NavigationControl } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { apiServer } from '$lib/settings.js';
	import * as turf from '@turf/turf';

	let stops = [];
	let gtfs_stops = [];
	let gtfs_routes = [];
	let map;

	const selectedStop = writable(null);
	const selectedStopRoutes = derived(selectedStop, ($selectedStop) => {
		if ($selectedStop == null) return [];
		return Array.from($selectedStop.routes).sort((a, b) => a.id.localeCompare(b.id));
	});

	selectedStop.subscribe((stop) => {
		if (map) {
			if (stop == null) {
				map.easeTo({
					padding: { left: 0 },
					duration: 750
				});
				return;
			} else {
				map.easeTo({
					padding: { left: 300 },
					duration: 750
				});
			}
		} else if (stop == null) {
			return;
		}
	});

	Promise.all([
		fetch(`${apiServer}/v1/tml/stops`).then((r) => r.json()),
		fetch(`${apiServer}/v1/tml/gtfs_stops`).then((r) => r.json()),
		fetch(`${apiServer}/v1/tml/gtfs_routes`).then((r) => r.json())
	]).then(([resp_stops, resp_gtfs_stops, resp_gtfs_routes]) => {
		stops = Object.fromEntries(resp_stops.map((stop) => [stop.id, stop]));
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

		gtfs_routes = resp_gtfs_routes;

		gtfs_routes.forEach((route) => {
			route.trips.forEach((trip) => {
				trip.stops.forEach((stop) => {
					gtfs_stops[stop].routes.add(route);
				});
			});
		});

		loadStops();

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
			(stop) => stop.tml_id && !['manual', 'flags'].includes(stop.tml_id_source)
		);
		let verStops = Object.values(stops).filter(
			(stop) => stop.tml_id && ['manual', 'flags'].includes(stop.tml_id_source)
		);

		const matchToFeature = (stop) => {
			let gtfsStop = gtfs_stops[parseInt(stop.tml_id)];

			return {
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: [[stop.lon, stop.lat], gtfsStop ? [gtfsStop.lon, gtfsStop.lat] : [0.0, 0.0]]
				}
			};
		};

		// console.log(
		// 	JSON.stringify({
		// 		type: 'FeatureCollection',
		// 		features: verStops.map(matchToFeature)
		// 	})
		// );

		// map.getSource('stopmatches-unv').setData({
		// 	type: 'FeatureCollection',
		// 	features: unvStops.map(matchToFeature)
		// });
		map.getSource('stopmatches-ver').setData({
			type: 'FeatureCollection',
			features: verStops.map(matchToFeature)
		});
	}

	function getStopSources() {
		return {
			stops: {
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
			},
			gtfs: {
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
							name: stop.stop_name
						}
					};
				})
			}
		};
	}

	function loadCurrentWindow(curr_stop, prev_succ_pairs) {
		// Cleanup
		if (map.getLayer('origin')) {
			map.removeLayer('origin');
			map.removeSource('origin');
		}
		if (map.getLayer('destination')) {
			map.removeLayer('destination');
			map.removeSource('destination');
		}

		if (prev_succ_pairs.length === 0) {
			return;
		}

		const origins = prev_succ_pairs.map((w) => gtfs_stops[w[0]]);
		const destinations = prev_succ_pairs.map((w) => gtfs_stops[w[1]]);
		const ori_points = turf.points(origins.map((s) => [s.stop_lon, s.stop_lat]));
		const dst_points = turf.points(destinations.map((s) => [s.stop_lon, s.stop_lat]));
		const avg_ori = turf.center(ori_points);
		const avg_dst = turf.center(dst_points);
		const bearing = turf.bearing(avg_ori, avg_dst);

		map.addLayer(
			{
				id: 'origin',
				type: 'line',
				source: {
					type: 'geojson',
					data: {
						type: 'MultiLineString',
						coordinates: origins.map((s) => [
							[s.stop_lon, s.stop_lat],
							[curr_stop.stop_lon, curr_stop.stop_lat]
						])
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
				id: 'destination',
				type: 'line',
				source: {
					type: 'geojson',
					data: {
						type: 'MultiLineString',
						coordinates: destinations.map((s) => [
							[curr_stop.stop_lon, curr_stop.stop_lat],
							[s.stop_lon, s.stop_lat]
						])
					}
				},
				paint: {
					'line-color': '#bef264',
					'line-width': 2
				}
			},
			'gtfs'
		);

		// Fly to the current stop
		map.flyTo({
			center: [curr_stop.stop_lon, curr_stop.stop_lat],
			zoom: 16,
			bearing: bearing,
			duration: 2000,
			pitch: 45
		});
	}

	function loadStops() {
		map.addSource('stopmatches-unv', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
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
			id: 'stopmatches-unv',
			type: 'line',
			source: 'stopmatches-unv',
			paint: {
				'line-color': '#c026d3',
				'line-width': 2
			}
		});
		map.addLayer({
			id: 'stopmatches-ver',
			type: 'line',
			source: 'stopmatches-ver',
			paint: {
				'line-color': '#e11d48',
				'line-width': 2
			}
		});

		refreshMatches();

		let sources = getStopSources();
		map.addSource('stops', {
			type: 'geojson',
			data: sources.stops,
			// cluster: true,
			clusterRadius: 40,
			clusterMinPoints: 3
		});
		map.addSource('gtfs', {
			type: 'geojson',
			data: sources.gtfs,
			// cluster: true,
			clusterRadius: 40,
			clusterMinPoints: 3
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
						[0, 3],
						[18, 7]
					]
				},
				'circle-stroke-width': 1,
				'circle-stroke-color': '#fff'
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
						[0, 3],
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
				'text-field': ['get', 'name'],
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

		map.on('mouseenter', 'gtfs', () => {
			map.getCanvas().style.cursor = 'pointer';
		});
		map.on('mouseleave', 'gtfs', () => {
			map.getCanvas().style.cursor = '';
		});

		map.on('click', 'gtfs', (e) => {
			let stop = gtfs_stops[e.features[0].properties.id];
			$selectedStop = stop;

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

		// Add a single point to the map.
		map.addSource('matchline', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});

		let selectedPoint = null;
		let hoveredStop = null;
		const canvas = map.getCanvasContainer();

		function onMove(e) {
			const coords = e.lngLat;

			// Set a UI indicator for dragging.
			canvas.style.cursor = 'grabbing';

			if (hoveredStop) {
				map.getSource('matchline').setData({
					type: 'LineString',
					coordinates: [
						[selectedPoint.lon, selectedPoint.lat],
						[hoveredStop.lon, hoveredStop.lat]
					]
				});
			} else {
				map.getSource('matchline').setData({
					type: 'LineString',
					coordinates: [
						[selectedPoint.lon, selectedPoint.lat],
						[coords.lng, coords.lat]
					]
				});
			}
		}

		function onUp(e) {
			const coords = e.lngLat;

			canvas.style.cursor = '';
			map.removeLayer('matchline');

			if (hoveredStop) {
				console.log('Matched', hoveredStop);
				console.log('with', selectedPoint);
			} else {
				console.log('Unmatched');
			}

			selectedPoint = null;

			// Unbind mouse/touch events
			map.off('mousemove', onMove);
			map.off('touchmove', onMove);
		}

		map.on('mousedown', 'gtfs', (e) => {
			// Prevent the default map drag behavior.
			e.preventDefault();

			canvas.style.cursor = 'grab';

			selectedPoint = gtfs_stops[e.features[0].properties.id];

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

			selectedPoint = gtfs_stops[e.features[0].properties.id];

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

		// map.on('load', function () {
		// 	mapLoaded = true;
		// 	if (stopsLoaded) {
		// 		loadStops();
		// 	}
		// });
	});

	onDestroy(() => {
		map.remove();
	});
</script>

<div id="map" class="h-full relative">
	<div
		class="absolute left-0 z-10 flex flex-col justify-center h-full transition duration-750"
		class:-translate-x-[300px]={!$selectedStop}
	>
		<div
			class="w-[300px] w-full bg-zinc-500 grid grid-cols-1 lg:h-[95%] lg:rounded-r-xl border-r-2 border-neutral"
			style="grid-template-rows: auto 1fr;"
		>
			<div class="flex gap-1 justify-between p-1">
				<span class="text-base-100 font-bold">{$selectedStop?.stop_name}</span>
			</div>
			<div class="w-full h-full overflow-y-scroll p-2 bg-base-100 flex flex-col lg:rounded-br-xl">
				<div class="badge badge-primary">{$selectedStop?.stop_id}</div>
				<h1 class="text-sm">Rotas</h1>
				<ul>
					{#each $selectedStopRoutes as route}
						<li class="flex flex-col">
							<span class="badge badge-secondary badge-outline">{route.id}</span>
							<ul class="ml-2">
								{#each route.trips as trip}
									<li class="flex flex-col">
										<div>

										<span class="badge badge-xs badge-outline text-xs">{trip.id}</span>
										<span>{trip.headsign}</span>
										</div>
										<div class="flex justify-end">
											<button class="btn btn-outline btn-xs">Ver</button>
										</div>
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
