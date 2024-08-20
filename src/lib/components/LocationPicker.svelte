<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import maplibre from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import {
		defaultMapBounds,
		defaultMapCenter,
		defaultMapZoom,
		mapMinZoom,
		tileStyle
	} from '$lib/settings';
	import CoordViewer from '$lib/components/CoordViewer.svelte';

	export let lon: number | null;
	export let lat: number | null;

	export let canEdit: boolean = false;

	let originalLon = lon;
	let originalLat = lat;

	let map: maplibre.Map;
	let mapElem: HTMLDivElement;
	let marker: maplibre.Marker;

	onMount(() => {
		map = new maplibre.Map({
			container: mapElem,
			style: tileStyle,
			center: defaultMapCenter,
			zoom: defaultMapZoom,
			minZoom: mapMinZoom,
			maxZoom: 20,
			maxBounds: defaultMapBounds
		});

		if (lat && lon) {
			marker = new maplibre.Marker().setLngLat([lon, lat]).addTo(map);
		} else {
			marker = new maplibre.Marker();
		}

		if (canEdit) {
			map.on('click', function (e) {
				let lngLat = e.lngLat;
				lat = lngLat.lat;
				lon = lngLat.lng;
				marker.setLngLat(lngLat).addTo(map);
			});
		}
	});

	onDestroy(() => map?.remove());
</script>

<div bind:this={mapElem} class="w-full h-96 relative">
	{#if lat && lon}
		<div class="absolute top-0 left-0 z-10 p-2 flex gap-2">
			<CoordViewer {lat} {lon} />
		</div>
	{/if}
	{#if canEdit}
		<div class="absolute bottom-0 left-0 z-10 p-2 flex gap-2">
			{#if originalLat != lat && originalLon != lon && originalLat != null && originalLon != null}
				<button
					class="btn btn-xs btn-neutral"
					on:click={() => {
						lat = originalLat;
						lon = originalLon;
						marker.remove();
					}}>Reverter</button
				>
			{/if}
			{#if lat && lon}
				<button
					class="btn btn-xs btn-error"
					on:click={() => {
						lat = null;
						lon = null;
						marker.remove();
					}}>Limpar</button
				>
			{/if}
		</div>
	{/if}
</div>
