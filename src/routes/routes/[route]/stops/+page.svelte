<script>
	import { onDestroy, onMount } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import { Map as Maplibre, NavigationControl, LngLatBounds } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import * as turf from '@turf/turf';
	import { decodedToken, token } from '$lib/stores.js';
	import { apiServer } from '$lib/settings.js';
	import DraggableList from '../../../../lib/stops/DraggableList.svelte';
	export let data = null;

	const credibleSources = ['tml', 'manual', 'flags', 'h1'];

	let stops = data.stops;
	let routeStops = data.routeStops;
	let routes = data.routes;
	let route = data.route;
	let routeIds = Object.values(routeStops)[0];
	$: routeStops = routeIds.map((stop) => stops[stop]);
	$: routeIds && updateRouteLine();
	let dragMode = 'move';
	let map;

	let mapLoaded = false;

	const selectedStop = writable(null);
	const selectedGtfsStop = writable(null);

	const previewedTrip = writable(null);

	selectedGtfsStop.subscribe((gtfsStop) => {
		previewedTrip.set(null);
		if (!map) return;

		console.log('padding', { left: gtfsStop ? 300 : 0, right: $selectedStop ? 300 : 0 });
		map.easeTo({
			padding: { left: gtfsStop ? 300 : 0, right: $selectedStop ? 300 : 0 },
			duration: 300
		});
		return;
	});

	selectedStop.subscribe((stop) => {
		if (!map) return;

		console.log('padding', { left: $selectedGtfsStop ? 300 : 0, right: stop ? 300 : 0 });
		map.easeTo({
			padding: { left: $selectedGtfsStop ? 300 : 0, right: stop ? 300 : 0 },
			duration: 300
		});
		return;
	});

	function addSourcesAndLayers() {
		map.addSource('routeline', {
			type: 'geojson',
			data: {
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: routeIds.map((stopNum) => [stops[stopNum].lon, stops[stopNum].lat])
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
				features: Object.values(stops).map((stop) => ({
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: [stop.lon, stop.lat]
					},
					properties: {
						id: stop.id,
						osm_name: stop.osm_name
					}
				}))
			}
		});

		map.addLayer({
			id: 'stops',
			type: 'circle',
			source: 'stops',
			paint: {
				'circle-color': 'rgb(50, 150, 220)',
				//  change size depending on zoom level
				'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 3, 14, 4, 16, 8, 18, 12, 20, 16],
				'circle-stroke-width': 1,
				'circle-stroke-color': '#fff'
			}
		});
	}

	function updateRouteLine() {
		if (!map || !map.getSource('routeline')) return;
		map.getSource('routeline').setData({
			type: 'LineString',
			coordinates: routeIds.map((stop) => {
				return [stops[stop].lon, stops[stop].lat];
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
			let rt = routeIds.map((stop) => [stops[stop].lon, stops[stop].lat]);

			let index = routeIds.indexOf(initDragStop.id);
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

			let rt = routeIds.map((stop) => [stops[stop].lon, stops[stop].lat]);

			rt.splice(
				routeIds.indexOf(initDragStop.id) + 1,
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
				let index = routeIds.indexOf(initDragStop.id);
				routeIds.splice(
					index + (dragMode === 'add' && index != 0 ? 1 : 0),
					dragMode === 'add' ? 0 : 1,
					hoveredStop.id
				);
				routeIds = routeIds;
			} else {
				console.log('Unmatched');
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
				routeIds.splice(routeIds.indexOf(initDragStop.id) + 1, 0, hoveredStop.id);
				routeIds = routeIds;
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
			if (!routeIds.includes(e.features[0].properties.id)) return;

			canvas.style.cursor = 'grab';

			initDragStop = stops[e.features[0].properties.id];

			map.on('mousemove', onMove);
			map.once('mouseup', onUp);
		}

		function mouseDownLine(e) {
			e.preventDefault();
			if (e.originalEvent.defaultPrevented) return;

			canvas.style.cursor = 'grab';

			var lineStringCoordinates = routeIds.map((stop) => [stops[stop].lon, stops[stop].lat]);
			var closestIndex = -1;
			var closestDistance = Infinity;

			for (var i = 0; i < lineStringCoordinates.length - 1; i++) {
				var start = lineStringCoordinates[i];
				var end = lineStringCoordinates[i + 1];
				var distance = turf.pointToLineDistance(turf.point([e.lngLat.lng, e.lngLat.lat]), [
					start,
					end
				]);
				if (distance < closestDistance) {
					closestDistance = distance;
					closestIndex = i;
				}
			}

			console.log('Clicked on segment with index:', closestIndex);
			initDragStop = stops[routeIds[closestIndex]];

			map.on('mousemove', onMoveLine);
			map.once('mouseup', onUpLine);
		}
		map.on('mousedown', 'stops', mouseDownStop);
		map.on('touchstart', 'stops', mouseDownStop);
		map.on('mousedown', 'routeline', mouseDownLine);

		map.on('mouseenter', 'stops', () => {
			canvas.style.cursor = 'pointer';
		});
		map.on('mouseenter', 'routeline', () => {
			canvas.style.cursor = 'pointer';
		});

		map.on('mouseenter', 'stops', (e) => {
			hoveredStop = stops[e.features[0].properties.id];
		});
		map.on('mouseleave', 'stops', (e) => {
			hoveredStop = null;
			canvas.style.cursor = '';
		});
		map.on('mouseleave', 'routeline', (e) => {
			canvas.style.cursor = '';
		});
	}

	onMount(() => {
		const coords = routeIds.map((s) => [stops[s].lon, stops[s].lat]);
		const bounds = coords.reduce((bounds, coord) => {
			return bounds.extend(coord);
		}, new LngLatBounds(coords[0], coords[0]));
		map = new Maplibre({
			container: 'map',
			style: 'https://tiles.intermodal.pt/styles/positron/style.json',
			center: bounds.getCenter(),
			minZoom: 8,
			maxZoom: 20,
			maxBounds: [
				[-10.0, 38.3],
				[-8.0, 39.35]
			]
		});
		map.fitBounds(bounds, { padding: 50 });

		map.addControl(new NavigationControl(), 'top-right');

		map.on('load', () => {
			addSourcesAndLayers();
			addEvents();

			mapLoaded = true;
		});
	});

	onDestroy(() => {
		map.remove();
	});
</script>

<div id="map" class="h-full relative">
	<div
		class="absolute lg:left-4 lg:bottom-4 bottom-2 left-2 z-10 tabs tabs-boxed flex-col items-stretch"
	>
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
	<div class="absolute right-0 z-10 flex flex-col justify-center h-full p-2 transition w-[40em]">
		<div class="bg-base-100 h-full rounded-xl shadow-lg p-4 overflow-y-scroll">
			<DraggableList bind:data={routeIds} itemsMap={stops} removesItems={true} />
		</div>
	</div>
</div>
