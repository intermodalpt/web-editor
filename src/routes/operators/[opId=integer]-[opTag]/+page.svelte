<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import maplibre from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import polyline from '@mapbox/polyline';
	import { tileStyle } from '$lib/settings';
	import Menu from './Menu.svelte';

	let mapElem;
	let map;

	export let data;

	const operator = data.operator;
	const regions = data.regions;
	const routes = data.routes;
	const stops = data.stops;

	const subrouteCount = routes.reduce((acc, route) => acc + route.subroutes.length, 0);

	function drawMapData() {
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

		const srFeatures = [];

		const bounds = new maplibre.LngLatBounds();

		stops.forEach((stop) => {
			bounds.extend([stop.lon, stop.lat]);
		});

		if (stops.length > 0) {
			map.fitBounds(bounds, {
				padding: 50
			});
		}

		for (const route of routes) {
			for (const subroute of route.subroutes) {
				if (!subroute.polyline) {
					continue;
				}
				const coords = polyline.decode(subroute.polyline, 6).map((p) => p.reverse());
				for (const coord of coords) {
					bounds.extend(coord);
				}
				srFeatures.push({
					type: 'Feature',
					geometry: {
						type: 'LineString',
						coordinates: coords
					},
					properties: {
						color: route.badge_text,
						outlineColor: route.badge_bg
					}
				});
			}
		}

		map.getSource('routeline').setData({
			type: 'FeatureCollection',
			features: srFeatures
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

		map.addLayer({
			id: 'routeline-outline',
			type: 'line',
			source: 'routeline',
			paint: {
				'line-color': 'white',
				'line-width': 4
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
			minZoom: 6.5,
			maxZoom: 20,
			center: [-8.5, 39.5]
		});

		map.addControl(new maplibre.NavigationControl());

		map.on('load', () => {
			addSourcesAndLayers();
			drawMapData();
		});
	});

	onDestroy(() => map?.remove());
</script>

<Menu {operator} page="root" />

<div bind:this={mapElem} class="h-[max(500px,50vh)] w-full" />
<div class="stats stats-vertical lg:stats-horizontal">
	<div class="stat">
		<div class="stat-title">Linhas</div>
		<div class="stat-value">{routes.length ?? '?'}</div>
	</div>
	<div class="stat">
		<div class="stat-title">Variantes</div>
		<div class="stat-value">{subrouteCount}</div>
	</div>
	<div class="stat">
		<div class="stat-title">Calendários</div>
		<div class="stat-value">0</div>
		<!-- <div class="stat-value">{calendars.length}</div> -->
	</div>
</div>
