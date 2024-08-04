<script lang="ts">
	import maplibre from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { onDestroy, onMount } from 'svelte';

	import OperatorCard from '$lib/components/OperatorCard.svelte';
	import { tileStyle } from '$lib/settings';
	import Menu from './Menu.svelte';

	let mapElem;
	let map;

	export let data;
	const region = data.region;
	const regions = data.regions;
	const operators = data.operators;

	let hoveredRegionId = null;

	function drawMapData() {
		map.getSource('regions').setData({
			type: 'FeatureCollection',
			features: regions.map((r) => ({
				type: 'Feature',
				id: r.id,
				properties: {
					name: r.name,
					main: r.id == region.id
				},
				geometry: r.geometry
			}))
		});

		const feature = {
			type: 'Feature',
			geometry: region.geometry
		};
		const bounds = new maplibre.LngLatBounds();
		feature.geometry.coordinates[0].forEach((coord) => bounds.extend(coord));

		map.fitBounds(bounds, { padding: 50 });
	}

	function addSourcesAndLayers() {
		map.addSource('regions', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});

		map.addLayer({
			id: 'regions-fills',
			type: 'fill',
			source: 'regions',
			layout: {},
			paint: {
				'fill-color': ['case', ['boolean', ['feature-state', 'main'], false], '#627BC1', '#627B88'],
				'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.2, 0.1]
			}
		});

		map.addLayer({
			id: 'region-borders',
			type: 'line',
			source: 'regions',
			layout: {},
			paint: {
				'line-color': ['case', ['boolean', ['feature-state', 'main'], false], '#627BC1', '#778588'],
				'line-width': 0.5
			}
		});

		map.addLayer({
			id: 'regions-labels',
			type: 'symbol',
			source: 'regions',
			layout: {
				'text-field': ['get', 'name'],
				'text-size': 20,
				'text-allow-overlap': true,
				'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold']
			},
			paint: {
				'text-color': '#fff',
				'text-halo-color': '#000',
				'text-halo-width': 0.5,
				'text-halo-blur': 1
			}
		});
	}

	function addEvents() {
		map.on('mousemove', 'regions-fills', (e) => {
			if (e.features.length > 0) {
				if (hoveredRegionId) {
					map.setFeatureState({ source: 'regions', id: hoveredRegionId }, { hover: false });
				}
				hoveredRegionId = e.features[0].id;
				map.setFeatureState({ source: 'regions', id: hoveredRegionId }, { hover: true });
			}
		});

		map.on('mouseleave', 'regions-fills', () => {
			if (hoveredRegionId) {
				map.setFeatureState({ source: 'regions', id: hoveredRegionId }, { hover: false });
			}
			hoveredRegionId = null;
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
			addEvents();
			drawMapData();
		});
	});

	onDestroy(() => map?.remove());
</script>

<Menu {region} page="root" />

<div bind:this={mapElem} class="h-[max(500px,50vh)] w-full" />

<div class="card-body">
	<h2 class="card-title">Operadores</h2>
	<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
		{#each operators as operator}
			<OperatorCard {operator} />
		{/each}
	</div>
</div>
