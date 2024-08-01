<script lang="ts">
	import { tileStyle } from '$lib/settings';
	import maplibre from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { onDestroy, onMount } from 'svelte';
	import Menu from '../Menu.svelte';

	export let data;

	let mapElem;
	let map;
	let mapLoaded = false;

	const operator = data.operator;
	const stops = data.stops;
	console.log(stops);

	function drawStops() {
		if (stops.length === 0) return;

		map.getSource('stops').setData({
			type: 'FeatureCollection',
			features: stops.map((stop) => ({
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: [stop.lon, stop.lat]
				},
				properties: {
					id: stop.id
				}
			}))
		});

		const bounds = new maplibre.LngLatBounds();
		stops.forEach((stop) => {
			bounds.extend([stop.lon, stop.lat]);
		});
		map.fitBounds(bounds, {
			padding: 50
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
				'line-color': ['get', 'color'],
				'line-width': 5
			}
		});
		// ################################
		// Display every stop
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
				'circle-color': 'rgb(40, 100, 150)',
				'circle-radius': {
					stops: [
						[12, 2],
						[14, 5]
					]
				}
			}
		});
	}

	onMount(() => {
		map = new maplibre.Map({
			container: mapElem,
			style: tileStyle,
			minZoom: 6.0,
			maxZoom: 20,
			center: [-8.5, 39.5]
		});

		map.addControl(new maplibre.NavigationControl());
		map.addControl(new maplibre.FullscreenControl());
		map.addControl(new maplibre.ScaleControl());
		map.addControl(
			new maplibre.GeolocateControl({
				positionOptions: {
					enableHighAccuracy: true
				},
				trackUserLocation: true
			})
		);

		map.on('load', () => {
			addSourcesAndLayers();

			mapLoaded = true;
			drawStops();
		});
	});

	onDestroy(() => map?.remove());
</script>

<Menu {operator} page="stops" />

<div bind:this={mapElem} class="h-[max(500px,75vh)] w-full relative">
	<div class="absolute top-2 left-2 z-50">
		<a class="btn btn-primary" href="/operators/{operator.id}-{operator.tag}/matcher"
			>Emparelhamento</a
		>
	</div>
</div>
<i class="py-4"></i>
