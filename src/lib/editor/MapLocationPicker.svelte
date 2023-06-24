<script>
	import { onDestroy, onMount, createEventDispatcher } from 'svelte';
	import { Map, Marker } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';

	let mapElem;
	export let lat;
	export let lon;
	export let stops = {};

	let map;
	let marker = null;
	let location = {
		lat: lat,
		lon: lon
	};

	const dispatch = createEventDispatcher();

	const drawStops = (stops) => {
		map.getSource('stops').setData({
			type: 'FeatureCollection',
			features: stops.map((stop) => {
				return {
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: [stop.lon, stop.lat]
					},
					properties: {}
				};
			})
		});
	};

	let markerMoved = (e) => {
		let targetLoc = e.target.getLngLat();
		location.lon = targetLoc.lng;
		location.lat = targetLoc.lat;
		dispatchChange();
	};

	function dispatchChange() {
		console.log('dispatching change', location);
		dispatch('change', {
			lat: location.lat,
			lon: location.lon
		});
	}

	onMount(() => {
		const lastPos = JSON.parse(sessionStorage.getItem('lastPos'));

		map = new Map({
			container: mapElem,
			style: 'https://tiles2.intermodal.pt/styles/iml/style.json',
			center: [-9.0, 38.605],
			zoom: 11,
			minZoom: 8,
			maxZoom: 20,
			maxBounds: [
				[-10.0, 38.3],
				[-8.0, 39.35]
			]
		});

		if (lat && lon) {
			map.setCenter([lon, lat]);
			map.setZoom(16);
		} else if (lastPos) {
			map.setCenter([lastPos[0], lastPos[1]]);
			map.setZoom(lastPos[2]);
		} else {
			map.setCenter([-9.1372, 38.71856]);
			map.setZoom(10);
		}

		if (location.lon && location.lat) {
			marker = new Marker().setLngLat([location.lon, location.lat]).setDraggable(true).addTo(map);
			marker.on('dragend', markerMoved);
		}

		map.on('click', function (e) {
			location.lat = e.lngLat.lat;
			location.lon = e.lngLat.lng;

			if (marker) {
				marker.setLngLat(e.lngLat).addTo(map);
			} else {
				marker = new Marker({ draggable: true }).setLngLat(e.lngLat).setDraggable(true).addTo(map);
				marker.on('dragend', markerMoved);
			}
			dispatchChange();
		});

		map.on('load', function () {
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
					'circle-color': '#7799ff',
					'circle-radius': 3,
					'circle-opacity': 0.5,
					'circle-stroke-width': 1,
					'circle-stroke-color': '#ffffff'
				}
			});

			drawStops(Object.values(stops));
		});

		map.on('moveend', (e) => {
			sessionStorage.setItem(
				'lastPos',
				JSON.stringify([e.target.getCenter().lng, e.target.getCenter().lat, e.target.getZoom()])
			);
		});
	});

	onDestroy(() => {
		map.remove();
	});
</script>

<div class="rounded-lg grow-1 max-w-96 h-96 w-full cursor-crosshair" bind:this={mapElem} />
