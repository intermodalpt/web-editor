<script>
	import L from 'leaflet?client';
	import { listDifferences, getNearestStops } from '$lib/utils.js';
	import { stops } from '$lib/stores.js';
	import { tick } from 'svelte';

	export let change;

	let expand = false;
	let loadTimestamp = Date.now();
	const mapId = 'map-' + loadTimestamp;
	let mapElem;

	$: diffs = listDifferences(change.original, change.patch);

	function loadMap() {
		const map = L.map(mapElem, {
			contextmenu: true,
			minZoom: 10,
			maxZoom: 20,
			zoomControl: false,
			closePopupOnClick: false,
			maxBounds: new L.LatLngBounds(new L.LatLng(38.3, -10.0), new L.LatLng(39.35, -8.0)),
			maxBoundsViscosity: 1.0
		}).setView([change.original.lat, change.original.lon], 18);

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution: '© OpenStreetMap e contribuidores'
		}).addTo(map);

		let icon = L.divIcon({
			className:
				'rounded-full bg-accent-content border-2 text-accent border-accent text-xl font-mono font-bold !flex justify-center items-center',
			iconSize: [16, 16],
			tooltipAnchor: [16, 0]
		});

		L.marker([change.original.lat, change.original.lon], { icon: icon }).addTo(map);

		let othersIcon = L.divIcon({
			className:
				'rounded-full bg-primary-content border-2 border-primary text-xl !flex justify-center items-center',
			iconSize: [16, 16],
			tooltipAnchor: [16, 0]
		});

		getNearestStops(Object.values($stops), change.original.lat, change.original.lon, 30)
			.slice(1)
			.forEach((stop) => {
				L.marker([stop.lat, stop.lon], { icon: othersIcon }).addTo(map);
			});
	}
</script>

<h3 class="font-bold">
	Alteração paragem {change.original.id}; {change.original.name ||
		change.original.official_name ||
		change.osm_name}
</h3>

{#if expand}
	<div class="grid grid-cols-2">
		<ul>
			{#each diffs as diff}
				<li>
					{diff.key}:
					{#if diff.original}<span class="bg-red-300">{diff.original}</span>{/if}
					-> <span class="bg-green-300">{diff.new}</span>
				</li>
			{/each}
		</ul>
		<div bind:this={mapElem} class="h-96" />
	</div>
{:else}
	<span
		class="link"
		on:mouseup={async () => {
			expand = true;
			await tick();
			loadMap();
		}}>Mostrar</span
	>
{/if}

<style>
	@import 'leaflet/dist/leaflet.css';
	@import 'leaflet.markercluster/dist/MarkerCluster.css';
</style>
