<script>
	import { createEventDispatcher } from 'svelte';
	import L from 'leaflet?client';
	import 'leaflet.markercluster?client';
	import { stops } from '$lib/stores.js';
	import { icons } from '$lib/assets.js';

	export let image;

	const dispatch = createEventDispatcher();

	let map;

	function mapAction(container) {
		map = L.map(container);

		const lastPos = JSON.parse(sessionStorage.getItem('lastPos'));

		if ($image.lat && $image.lon) {
			map.setView([$image.lat, $image.lon], 16);
		} else if (lastPos) {
			map.setView([lastPos[0], lastPos[1]], lastPos[2]);
		} else {
			map.setView([38.71856, -9.1372], 10);
		}

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution: '© OpenStreetMap'
		}).addTo(map);

		map.maxBounds = new L.LatLngBounds(new L.LatLng(38.3, -10.0), new L.LatLng(39.35, -8.0));
		map.maxBoundsViscosity = 1.0;
		map.minZoom = 10;

		let stopsLayer = L.markerClusterGroup({
			showCoverageOnHover: false,
			disableClusteringAtZoom: 16
		});

		Object.values($stops).forEach((stop) => {
			let marker = L.marker([stop.lat, stop.lon], { icon: icons['osm'] });

			marker.stopId = stop.id;

			marker.on('click', (e) => dispatch('selectStop', e.target.stopId));
			marker.bindTooltip(`${stop.id} - ${stop.official_name | stop.name || stop.short_name}`);
			stopsLayer.addLayer(marker);
		});

		map.addLayer(stopsLayer);

		return {
			destroy: () => {
				map.remove();
				map = null;
			}
		};
	}
</script>

<div class="rounded-lg grow-1 max-w-96 h-64 w-full cursor-crosshair" use:mapAction />

<style>
	@import 'leaflet/dist/leaflet.css';
	@import 'leaflet.markercluster/dist/MarkerCluster.css';
</style>
