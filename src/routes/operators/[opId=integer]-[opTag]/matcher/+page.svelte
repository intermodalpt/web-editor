<script>
	import { onDestroy, onMount, tick } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import { Map as Maplibre, NavigationControl, GeolocateControl, LngLatBounds } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import * as turf from '@turf/turf';
	import { liveQuery } from 'dexie';
	import { fetchStops, getStops, softInvalidateStops, selectedRegion } from '$lib/db';
	import { regionMapParams } from '$lib/utils.js';
	import { SearchControl } from '$lib/stops/SearchControl.js';
	import { decodedToken, token } from '$lib/stores.js';
	import { apiServer, tileStyle } from '$lib/settings.js';

	const credibleSources = ['tml', 'manual', 'flags', 'h1'];

	/** @type {import('./$types').PageData} */
	export let data;

	const operator = data.operator;
	const operatorId = operator.id;
	//const operatorStops = data.operatorStops;

	let map;

	let stopsLoaded = false;
	let gtfsStopsLoaded = true;
	let gtfsTripsLoaded = true;
	let mapLoaded = false;
	$: loading = !stopsLoaded || !gtfsStopsLoaded || !gtfsTripsLoaded || !mapLoaded;

	const regionStops = liveQuery(() => getStops());

	const genericNames = derived(regionStops, ($regionStops) => {
		if (!$regionStops) return {};
		return Object.fromEntries(Object.values($regionStops).map((stop) => [stop.name, stop]));
	});

	const gtfsStops = writable(data.gtfsStops);
	const gtfsRoutes = writable(data.gtfsRoutes);
	// const operatorStops = writable(Object.fromEntries(data.operatorStops.map((stop) => [stop.id, stop])));

	const knownGtfsIds = new Set(Object.values(data.gtfsStops).map((stop) => stop.stop_id));
	const usedGtfsIds = new Set(
		data.operatorStops
			.filter((stop) => knownGtfsIds.has(stop.stop_ref))
			.map((stop) => stop.stop_ref)
	);
	const danglingGtfsIds = new Set(
		data.operatorStops
			.filter((stop) => knownGtfsIds.has(stop.stop_ref))
			.map((stop) => stop.stop_ref)
	);

	// Every stop ID that is matched with a GTFS stop
	const usedStopIds = new Set(data.operatorStops.map((stop) => stop.id));
	// const usedStopIds = new Set(
	// 	knownGtfsIds.length > 0
	// 		? data.operatorStops.filter((stop) => knownGtfsIds.has(stop.stop_ref)).map((stop) => stop.id)
	// 		: data.operatorStops.map((stop) => stop.id)
	// );

	// IML stops that are linked
	const operatorStops = writable(data.operatorStops);

	const stopIndex = derived([regionStops, operatorStops], ([$regionStops, $operatorStops]) => {
		if (!$regionStops || !$operatorStops) return {};

		const opStops = $operatorStops.map((stop) => {
			return {
				id: stop.id,
				name: stop.official_name || genericNames[stop.id] || '{?}',
				stop_ref: stop.stop_ref,
				source: stop.source,
				lat: stop.lat,
				lon: stop.lon
			};
		});

		const regStops = Object.values($regionStops).map((stop) => {
			return {
				id: stop.id,
				name: stop.name,
				lat: stop.lat,
				lon: stop.lon,
				stop_ref: null,
				source: null
			};
		});

		// Merge them into a single object where the operatorStops have precedence
		return Object.fromEntries([...opStops, ...regStops].map((stop) => [stop.id, stop]));
	});

	// IML stops that are not linked
	const unusedRegionStops = derived(regionStops, ($regionStops) => {
		if (!$regionStops) return [];

		return Object.values($regionStops).filter((stop) => !usedStopIds.has(stop.id));
	});

	const linkedStops = derived([regionStops, gtfsStops], ([$stops, $gtfsStops]) => {
		if (!$stops || !$gtfsStops) return {};

		return Object.fromEntries(
			Object.values($stops).map((stop) => {
				const rel = stop.operators.find((operatorStop) => operatorStop.operator_id === operatorId);
				if (!rel) return [stop.id, stop];
				return [
					stop.id,
					Object.assign(stop, {
						official_name: rel.name,
						source: rel.source,
						gtfsStop: $gtfsStops[rel.stop_ref] || null
					})
				];
			})
		);
	});

	const selectedOperatorStop = writable(null);
	const selectedUnusedtop = writable(null);
	const selectedGtfsStop = writable(null);

	const selectedImlStop = derived(
		[selectedOperatorStop, selectedUnusedtop],
		([$selectedOperatorStop, $selectedUnrelatedStop]) => {
			if ($selectedOperatorStop) {
				return {
					id: $selectedOperatorStop.id,
					name: $selectedOperatorStop.official_name,
					lat: $selectedOperatorStop.lat,
					lon: $selectedOperatorStop.lon,
					layer: 'operator'
				};
			}
			if ($selectedUnrelatedStop) {
				return {
					id: $selectedUnrelatedStop.id,
					name: $selectedUnrelatedStop.name,
					lat: $selectedUnrelatedStop.lat,
					lon: $selectedUnrelatedStop.lon,
					layer: 'region'
				};
			}
			return null;
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

	const hasMutualLink = derived(
		[selectedOperatorStop, selectedGtfsStop],
		([$selectedOperatorStop, $selectedGtfsStop]) => {
			if (!$selectedOperatorStop || !$selectedGtfsStop) {
				return false;
			}
			return $selectedOperatorStop.stop_ref === $selectedGtfsStop.stop_id;
		}
	);

	const selectedStopRoutes = derived(
		[selectedOperatorStop, selectedUnusedtop],
		([$selectedOperatorStop, $selectedUnrelatedStop], set) => {
			const selectedStopId = $selectedOperatorStop?.id ?? $selectedUnrelatedStop?.id;

			if (!selectedStopId) return null;

			fetch(`${apiServer}/v1/stops/${selectedStopId}/spider`)
				.then((r) => r.json())
				.then((r) => {
					set(
						Object.values(r.routes).sort(
							(a, b) => parseInt(a.code) - parseInt(b.code) || a.code.localeCompare(b.code)
						)
					);
				});
		}
	);

	const previewedTrip = writable(null);

	selectedGtfsStop.subscribe((gtfsStop) => {
		previewedTrip.set(null);
		if (!map) return;

		map.easeTo({
			padding: { left: gtfsStop || $selectedOperatorStop || $selectedUnusedtop ? 300 : 0 },
			duration: 750
		});
		return;
	});

	selectedOperatorStop.subscribe((selectedOperatorStop) => {
		if (selectedOperatorStop) {
			$selectedUnusedtop = null;
		}
		if (!map) return;

		map.easeTo({
			padding: { left: $selectedGtfsStop || selectedOperatorStop || $selectedUnusedtop ? 300 : 0 },
			duration: 750
		});
		return;
	});

	selectedUnusedtop.subscribe((selectedUnusedtop) => {
		if (selectedUnusedtop) {
			$selectedOperatorStop = null;
		}
		if (!map) return;

		map.easeTo({
			padding: { left: $selectedGtfsStop || $selectedOperatorStop || selectedUnusedtop ? 300 : 0 },
			duration: 750
		});
		return;
	});

	const stopSearchInput = writable(null);

	const stopSearchResults = derived(
		[stopSearchInput, linkedStops, gtfsStops],
		([$stopSearchInput, $linkedStops, $gtfsStops]) => {
			if (!$stopSearchInput || $stopSearchInput.length < 3) {
				return;
			}

			let lowerInput = $stopSearchInput.toLowerCase();

			const stop_results = Object.values($linkedStops)
				.filter((stop) => {
					return (
						(stop.id && ('' + stop.id).includes($stopSearchInput)) ||
						stop.operators.some(
							(op) =>
								op.stop_ref?.toLowerCase().includes($stopSearchInput) ||
								op.name?.toLowerCase().includes($stopSearchInput)
						) ||
						(stop.name && stop.name.toLowerCase().includes(lowerInput))
					);
				})
				.map((stop) => {
					return {
						id: stop.id,
						stopRef: stop.operators.find((op) => op.operator_id === operatorId)?.stop_ref,
						type: 'iml',
						name: stop.name,
						lat: stop.lat,
						lon: stop.lon
					};
				});

			const gtfs_results = Object.values($gtfsStops)
				.filter((stop) => {
					return (
						(stop.stop_id && stop.stop_id.includes($stopSearchInput)) ||
						(stop.stop_name && stop.stop_name.toLowerCase().includes(lowerInput))
					);
				})
				.map((stop) => {
					return {
						id: stop.id,
						stopRef: stop.stop_id,
						type: 'gtfs',
						name: stop.stop_name,
						lat: stop.lat,
						lon: stop.lon
					};
				});

			return stop_results.concat(gtfs_results).sort((a, b) => {
				return a.name?.localeCompare(b.name);
			});
		}
	);

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
			coordinates: trip.stops.map((stop) => [$gtfsStops[stop].lon, $gtfsStops[stop].lat])
		});
	});

	async function loadData() {
		await fetchStops().then(async () => {
			await tick();
			stopsLoaded = true;
		});
	}

	loadData().then(() => {
		console.log('Data loaded');
	});

	function refreshMatches() {
		let unvStops = $operatorStops.filter(
			(stop) => stop.source && !credibleSources.includes(stop.source) && stop.gtfsStop
		);
		let verStops = $operatorStops.filter(
			(stop) => stop.source && credibleSources.includes(stop.source) && stop.gtfsStop
		);

		console.log('unv', unvStops);
		console.log('ver', verStops);

		const matchToFeature = (stop) => {
			return {
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: [
						[stop.lon, stop.lat],
						[stop.gtfsStop.lon, stop.gtfsStop.lat]
					]
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

		const origins = prev_succ_pairs.filter((w) => w[0]).map((w) => $gtfsStops[w[0]]);
		const destinations = prev_succ_pairs.filter((w) => w[1]).map((w) => $gtfsStops[w[1]]);
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

		map.getSource('used-stops').setData({
			type: 'FeatureCollection',
			features: Object.values($operatorStops).map((stop) => {
				return {
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: [stop.lon, stop.lat]
					},
					properties: {
						id: stop.id,
						missing: !knownGtfsIds.has(stop.stop_ref)
					}
				};
			})
		});

		map.getSource('unused-stops').setData({
			type: 'FeatureCollection',
			features: $unusedRegionStops.map((stop) => {
				return {
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: [stop.lon, stop.lat]
					},
					properties: {
						id: stop.id
					}
				};
			})
		});

		map.getSource('gtfs').setData({
			type: 'FeatureCollection',
			features: Object.values($gtfsStops).map((stop) => {
				return {
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: [stop.stop_lon, stop.stop_lat]
					},
					properties: {
						id: stop.id,
						id_name: `${stop.id} - ${stop.stop_name}`
					}
				};
			})
		});
	}

	function flyToTrip(trip) {
		const bounds = new LngLatBounds();
		trip.stops
			.map((s) => $gtfsStops[s])
			.forEach((stop) => {
				bounds.extend([stop.lon, stop.lat]);
			});
		map.fitBounds(bounds, {
			padding: 50
		});
	}

	function flyToGtfsStop(gtfsStop) {
		document.getElementById('stop-search-modal').checked = false;

		map.flyTo({
			center: [gtfsStop.lon, gtfsStop.lat],
			zoom: 17.5
		});
	}

	function flyToStop(stop) {
		document.getElementById('stop-search-modal').checked = false;

		map.flyTo({
			center: [stop.lon, stop.lat],
			zoom: 17.5
		});
	}

	function connectStops(stop, gtfsStop) {
		const prevOpStopRel = stop.operators.find((rel) => rel.operator_id == operatorId);

		if (
			stop.gtfsStop &&
			stop.gtfsStop != gtfsStop &&
			!confirm('Paragem já está ligada a outra paragem GTFS. Continuar?')
		) {
			// GTFS link conflict
			return;
		}

		if (
			prevOpStopRel &&
			credibleSources.includes(prevOpStopRel.source) &&
			!confirm('Paragem já tem um ID confirmado. Alterar?')
		) {
			//GTFS didn't change but the source is going to change
			return;
		}

		const beingUsed = Object.values(regionStops).some((s) => s != stop && s.gtfsStop == gtfsStop);

		if (beingUsed && !confirm('Paragem GTFS já está ligada a outra paragem. Continuar?')) {
			return;
		}

		fetch(`${apiServer}/v1/operators/${operatorId}/stops/${stop.id}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				authorization: `Bearer ${$token}`
			},
			body: JSON.stringify({
				official_name: gtfsStop.stop_name,
				stop_ref: gtfsStop.stop_id,
				source: 'h1'
			})
		}).then(async (r) => {
			if (r.ok) {
				console.log('ID da paragem atualizado com sucesso.');
				stop.gtfsStop = gtfsStop;

				stop.operators = stop.operators.filter((rel) => rel.operator_id != operatorId);
				stop.operators.push({
					operator_id: operatorId,
					stop_ref: gtfsStop.stop_id,
					name: gtfsStop.stop_name,
					source: 'h1'
				});
				await softInvalidateStops();

				refreshStops();
				// Force data refresh
				$selectedGtfsStop = $selectedGtfsStop;
				$selectedOperatorStop = $selectedOperatorStop;
			} else {
				alert('Erro a atualizar o ID da paragem.\nRecarregue e tente novamente.');
			}
		});
	}

	function disconnectStops(stop, gtfsStop) {
		if (stop.gtfsStop != gtfsStop) {
			console.error('BUG: Tentativa de desligar paragens desligadas');
			return;
		}

		if (!confirm(`De certeza que quer desligar #${stop.id} de GTFS#${gtfsStop.stop_id}?`)) {
			return;
		}

		fetch(`${apiServer}/v1/operators/${operatorId}/stops/${stop.id}`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				authorization: `Bearer ${$token}`
			}
		}).then(async (r) => {
			if (r.ok) {
				console.log('ID da paragem atualizado com sucesso.');
				stop.gtfsStop = undefined;

				stop.operators = stop.operators.filter((rel) => rel.operator_id != operatorId);
				await softInvalidateStops();

				refreshStops();
				// Force data refresh
				$selectedGtfsStop = $selectedGtfsStop;
				$selectedOperatorStop = $selectedOperatorStop;
			} else {
				alert('Erro a desligar paragens.\nRecarregue e tente novamente.');
			}
		});
	}

	function addSourcesAndLayers() {
		// The UNVERIFIED matches between operator stops and GTFS stops
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

		// The VERIFIED matches between operator stops and GTFS stops
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

		// THE GTFS stops
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
						[17, 7],
						[18, 15]
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

		// The used IML stops (both within and outside the region)
		map.addSource('used-stops', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});

		map.addLayer({
			id: 'used-stops',
			type: 'circle',
			source: 'used-stops',
			paint: {
				'circle-color': 'rgba(50, 150, 220, 0.7)',
				'circle-radius': {
					base: 1.75,
					stops: [
						[0, 1.5],
						[11, 2],
						[17, 7],
						[18, 15]
					]
				},
				'circle-stroke-width': ['case', ['get', 'missing'], 2, 1],
				// Depends on the property "missing"
				'circle-stroke-color': ['case', ['get', 'missing'], 'red', 'white']
			}
		});

		// The unused region IML stops
		map.addSource('unused-stops', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});

		map.addLayer({
			id: 'unused-stops',
			type: 'circle',
			source: 'unused-stops',
			paint: {
				'circle-color': 'rgba(50, 150, 220, 0.3)',
				'circle-radius': {
					base: 1.75,
					stops: [
						[0, 1.5],
						[11, 2],
						[17, 7],
						[18, 15]
					]
				},
				'circle-stroke-width': 0.5,
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

		map.on('click', 'used-stops', (e) => {
			let stop = $stopIndex[e.features[0].properties.id];
			$selectedOperatorStop = stop;
		});

		map.on('click', 'unused-stops', (e) => {
			let stop = $stopIndex[e.features[0].properties.id];
			$selectedUnusedtop = stop;
		});

		map.on('click', 'gtfs', (e) => {
			if (map.getZoom() < 15) return;

			let stop = $gtfsStops[e.features[0].properties.id];
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
					const tripWindow = JSON.stringify([trip.stops[idx - 1], trip.stops[idx + 1]]);
					// If the window is not in the map, add it, pointing to the current route, trip pair
					if (!windows.has(tripWindow)) {
						windows.set(tripWindow, [[route, trip]]);
					} else {
						// If the window is already in the map, add the current route, trip pair to the list
						windows.get(tripWindow).push([route, trip]);
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

			draggedGtfsStop = $gtfsStops[e.features[0].properties.id];

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

			draggedGtfsStop = $gtfsStops[e.features[0].properties.id];

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
			hoveredStop = regionStops[e.features[0].properties.id];
		});
		map.on('mouseleave', 'stops', (e) => {
			hoveredStop = null;
		});
	}

	selectedRegion.subscribe((region) => {
		if (!map || !region) return;
		console.log('Centering on', region);
		const mapParams = regionMapParams(region);
		map.setCenter(mapParams.center);
		map.setZoom(mapParams.zoom);
	});

	onMount(() => {
		const mapParams = regionMapParams($selectedRegion);
		console.log('Mounting', $selectedRegion);
		map = new Maplibre({
			container: 'map',
			style: tileStyle,
			center: mapParams.center,
			zoom: mapParams.zoom,
			minZoom: 8,
			maxZoom: 20
			/* maxBounds: [
				[-10.0, 38.3],
				[-8.0, 39.35]
			]*/
		});

		map.addControl(new NavigationControl(), 'top-right');
		map.addControl(new SearchControl(), 'top-right');
		map.addControl(
			new GeolocateControl({
				positionOptions: {
					enableHighAccuracy: true
				},
				showUserHeading: true,
				trackUserLocation: true
			})
		);

		map.on('load', async function () {
			addSourcesAndLayers();
			addEvents();

			mapLoaded = true;
			await tick();

			if (!loading) {
				refreshStops();
			}
		});
	});

	onDestroy(() => {
		mapLoaded = false;
		map.remove();
	});
</script>

<div id="map" class="h-full relative">
	{#if loading}
		<div style="background-color: #33336699" class="z-[2000] absolute inset-0" />
		<div class="absolute inset-x-0 m-auto w-full md:w-96 w z-[2001]">
			<div
				class="m-2 p-4 bg-base-100 flex flex-col gap-4 rounded-2xl shadow-3xl border-2 border-warning max-h-full"
			>
				<span class="text-xl">A carregar</span>
				<span
					>Mapa: <progress
						class="progress progress-primary w-full"
						value={mapLoaded ? 100 : 0}
						max="100"
					/></span
				>
				<span
					>Paragens: <progress
						class="progress progress-primary w-full"
						value={stopsLoaded ? 100 : 0}
						max="100"
					/></span
				>
				<span
					>Precursos GTFS: <progress
						class="progress progress-primary w-full"
						value={gtfsTripsLoaded ? 100 : 0}
						max="100"
					/></span
				>
				<span
					>Paragens GTFS: <progress
						class="progress progress-primary w-full"
						value={gtfsStopsLoaded ? 100 : 0}
						max="100"
					/></span
				>
			</div>
		</div>
	{/if}
	<div class="absolute left-0 z-20 flex flex-col justify-center h-full">
		<div
			class="w-[300px] h-full lg:h-[95%] overflow-y-scroll p-2 bg-base-100 flex flex-col gap-2 lg:rounded-r-xl shadow-md"
		>
			<div class="justify-center w-full">
				<a class="btn btn-xs shadow-sm p-2 font-bold" href="/operators/{operator.tag}">
					{operator.name}
				</a>
			</div>
			<div class="flex flex-col gap-2 p-2 rounded-lg border-2 border-orange-600 relative">
				{#if $selectedGtfsStop}
					<button
						class="btn btn-circle btn-xs btn-error self-start absolute -top-2 -right-2"
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
					<div class="flex gap-2">
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
						<span class="font-bold">{$selectedGtfsStop?.stop_name}</span>
					</div>
					<div class="border border-base-300 rounded-md p-2">
						<h1 class="text-sm font-semibold text-center">Rotas</h1>
						<div class="max-h-64 xl:max-h-96 overflow-scroll">
							<ul class="flex flex-col gap-3">
								{#each $selectedGtfsStopRoutes as route}
									<li class="flex flex-col">
										<span class="badge badge-neutral">{route.id}</span>
										<ul class="ml-4 flex flex-col gap-2">
											{#each route.trips as trip}
												<li class="flex flex-col">
													<div class="flex">
														<button
															class="btn btn-neutral btn-outline btn-xs !rounded-r-0 grow"
															on:click={() => {
																flyToTrip(trip);
																$previewedTrip = trip;
															}}>{trip.id}</button
														>
														<button
															class="btn btn-xs !rounded-l-0"
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
				{:else}
					<div class="text-slate-500 font-semibold text-lg">
						Pontos <span class="border-b-2 border-orange-600">laranja</span> denotam paragens no
						<a
							href="https://en.wikipedia.org/wiki/GTFS"
							target="_blank"
							class="link-primary font-bold">GTFS</a
						> do operador.
					</div>
				{/if}
			</div>

			{#if $decodedToken?.permissions?.is_admin}
				<div class="flex justify-center">
					{#if $selectedGtfsStop && $selectedOperatorStop}
						{#if !$hasMutualLink || ($hasMutualLink && !credibleSources.includes($selectedOperatorStop?.source))}
							<button
								class="btn btn-primary btn-sm"
								on:click={() => {
									connectStops($selectedOperatorStop, $selectedGtfsStop);
								}}>↑ Ligar paragens ↓</button
							>
						{:else if $hasMutualLink}
							<button
								class="btn btn-error btn-sm"
								on:click={() => {
									disconnectStops($selectedOperatorStop, $selectedGtfsStop);
								}}>↑ Apagar ligação ↓</button
							>
						{/if}
					{/if}
				</div>
			{/if}
			<div class="flex flex-col gap-2 p-2 rounded-lg border-2 border-blue-500 relative">
				{#if $selectedImlStop}
					<button
						class="btn btn-circle btn-xs btn-error self-start absolute -top-2 -right-2"
						on:click={() => {
							$selectedOperatorStop = null;
							$selectedUnusedtop = null;
						}}
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
					<div class="flex gap-1">
						<div
							class="btn btn-xs text-blue-200 bg-blue-500 border-blue-600"
							on:click={() => {
								flyToStop($selectedImlStop);
							}}
							on:keypress={() => {
								flyToStop($selectedImlStop);
							}}
						>
							{$selectedImlStop?.id}
						</div>
						<span class="font-bold">{$selectedImlStop?.name}</span>
					</div>
					<div class="flex gap-2">
						<div class="flex">
							<input
								class="btn btn-secondary btn-xs rounded-r-none"
								type="button"
								value={$selectedImlStop?.lat.toFixed(6)}
								on:click={() => {
									navigator.clipboard.writeText($selectedImlStop?.lat.toFixed(6));
								}}
							/>
							<input
								class="btn btn-secondary btn-xs rounded-l-none"
								type="button"
								value={$selectedImlStop?.lon.toFixed(6)}
								on:click={() => {
									navigator.clipboard.writeText($selectedImlStop?.lon.toFixed(6));
								}}
							/>
						</div>
						<input
							class="btn btn-secondary btn-xs"
							type="button"
							value="Copiar"
							on:click={() => {
								navigator.clipboard.writeText(
									$selectedImlStop?.lat.toFixed(6) + '\t' + $selectedImlStop?.lon.toFixed(6)
								);
							}}
						/>
					</div>
					{#if $selectedOperatorStop && !$hasMutualLink}
						<div class="flex gap-1">
							<h1 class="text-xs font-bold">Ligada a</h1>
							{#if $selectedOperatorStop.gtfsStop}
								<button
									class="btn btn-xs text-orange-200 bg-orange-600 border-orange-600"
									on:click={() => {
										$selectedGtfsStop = $selectedOperatorStop.gtfsStop;
										flyToGtfsStop($selectedOperatorStop.gtfsStop);
									}}>{$selectedOperatorStop?.stop_ref}</button
								>
							{:else}
								<button class="btn btn-xs text-orange-200 bg-orange-600 border-orange-600"
									>⚠️{$selectedOperatorStop?.stop_ref}</button
								>
							{/if}
						</div>
						<textarea class="w-full">{JSON.stringify($selectedOperatorStop)}</textarea>
					{/if}
					<h2 class="text-sm self-center font-semibold">Rotas</h2>
					<div class="w-full flex flex-wrap gap-1">
						{#each $selectedStopRoutes || [] as route}
							<div
								class="badge badge-secondary badge-outline"
								on:click={() => {
									alert(route.code + ' - ' + route.name);
								}}
								on:keypress={() => {
									alert(route.code + ' - ' + route.name);
								}}
							>
								{route.code}
							</div>
						{/each}
					</div>
				{:else}
					<div class="text-slate-500 font-semibold text-lg">
						Pontos <span class="border-b-2 border-blue-500">azuis</span> denotam paragens no intermodal.
					</div>
				{/if}
			</div>
		</div>
	</div>
	<div class="absolute">
		<input type="checkbox" id="stop-search-modal" class="modal-toggle" />
		<div class="modal z-30">
			<div
				class="modal-box relative z-30 max-w-5xl grid grid-cols-1"
				style="grid-template-rows: auto 1fr;"
			>
				<div>
					<label for="stop-search-modal" class="btn btn-sm btn-circle absolute right-2 top-2"
						>✕</label
					>
					<h3 class="text-lg font-bold">Pesquisar por paragem</h3>
					<input
						type="text"
						class="input input-primary input-bordered w-full"
						placeholder="Nome ou identificador"
						bind:value={$stopSearchInput}
					/>
				</div>
				{#if $stopSearchResults}
					<div class="flex flex-col gap-1 mt-2 overflow-y-scroll">
						{#each $stopSearchResults as result}
							<div
								class="card card-compact w-full bg-base-100 border-2 shadow-sm cursor-pointer"
								on:click={() => {
									flyToStop(result);
								}}
								on:keypress={() => {
									flyToStop(result);
								}}
							>
								<div class="card-body">
									<div class="flex gap-1">
										{#if result.type === 'iml'}
											<span class="px-2 mr-1 bg-blue-500 rounded-full" />
											<h2 class="text-md font-semibold">
												<span class="text-md border-b-2 border-blue-500">{result.id}</span>
												{result.name || result.official_name}
											</h2>
											{#if result.stopRef}
												→
												<span class="text-md border-b-2 border-orange-600 self-start">
													{result.stopRef}
												</span>
											{/if}
										{:else}
											<span class="px-2 mr-1 bg-orange-600 rounded-full" />
											<h2 class="text-md font-semibold">
												<span class="text-md border-b-2 border-orange-600">{result.id}</span>
												{result.name || result.official_name}
											</h2>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
