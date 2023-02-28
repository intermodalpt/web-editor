<script>
	import { createEventDispatcher } from 'svelte';
	import L from 'leaflet?client';
	import 'leaflet.markercluster?client';
	import { stops } from '$lib/stores.js';
	import { icons, dotIcon } from '$lib/assets.js';

	export let lat;
	export let lon;

	let map;
	let marker = null;
	let location = {
		lat: lat,
		lon: lon
	};

	const dispatch = createEventDispatcher();

	let markerMoved = (e) => {
		let targetLoc = e.target.getLatLng();
		location.lon = targetLoc.lng;
		location.lat = targetLoc.lat;
		dispatchChange();
	};

	function createMap(container) {
		let m = L.map(container);

		const lastPos = JSON.parse(sessionStorage.getItem('lastPos'));

		if (lat && lon) {
			m.setView([lat, lon], 16);
		} else if (lastPos) {
			m.setView([lastPos[0], lastPos[1]], lastPos[2]);
		} else {
			m.setView([38.71856, -9.1372], 10);
		}

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution: '© OpenStreetMap contributors'
		}).addTo(m);

		m.maxBounds = new L.LatLngBounds(new L.LatLng(38.3, -10.0), new L.LatLng(39.35, -8.0));
		m.maxBoundsViscosity = 1.0;
		m.minZoom = 10;

		if (location.lat) {
			marker = L.marker([location.lat, location.lon], { draggable: true, icon: dotIcon });
			marker.addTo(m);
			marker.on('moveend', markerMoved);
		}

		m.on('click', function (e) {
			if (marker) {
				marker.removeFrom(map);
			}
			marker = L.marker([e.latlng.lat, e.latlng.lng], { draggable: true, icon: dotIcon });
			location.lon = e.latlng.lng;
			location.lat = e.latlng.lat;
			dispatchChange();
			marker.addTo(map);
			marker.on('moveend', markerMoved);
		});

		m.on('moveend', (e) => {
			sessionStorage.setItem(
				'lastPos',
				JSON.stringify([e.target.getCenter().lat, e.target.getCenter().lng, e.target.getZoom()])
			);
		});

		let stopsLayer = L.markerClusterGroup({
			showCoverageOnHover: false,
			disableClusteringAtZoom: 16
		});

		Object.values($stops).forEach((stop) => {
			let marker = L.marker([stop.lat, stop.lon], { icon: icons['osm'] });
			marker.bindTooltip(`${stop.id} - ${stop.name || stop.short_name}`);
			stopsLayer.addLayer(marker);
		});

		m.addLayer(stopsLayer);

		return m;
	}

	function dispatchChange() {
		dispatch('change', {
			lat: location.lat,
			lon: location.lon
		});
	}

	function mapAction(container) {
		map = createMap(container);

		return {
			destroy: () => {
				map.remove();
				map = null;
			}
		};
	}

	// function updateMarkerPosition() {
	// 	if (marker) {
	// 		marker.removeFrom(map);
	// 	}
	// 	marker = L.marker([e.latlng.lat, e.latlng.lng], { draggable: true });
	// 	location.lon = e.latlng.lng;
	// 	location.lat = e.latlng.lat;
	// 	dispatchChange();
	// 	marker.addTo(map);
	// 	marker.on('moveend', markerMoved);
	// }
</script>

<div class="rounded-lg grow-1 max-w-96 h-80 w-full cursor-crosshair" use:mapAction />

<style>
	@import 'leaflet/dist/leaflet.css';
	@import 'leaflet.markercluster/dist/MarkerCluster.css';
</style>
