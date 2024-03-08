<script>
	import { onDestroy, onMount, createEventDispatcher } from 'svelte';
	import { tileStyle } from '$lib/settings.js';
	import { Map, Marker } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { writable } from 'svelte/store';

	let mapElem;
	export let lat;
	export let lon;
	export let stops;
	export let canSelectStops = false;
	export let selectedStopIds = writable([]);

	let map;
	let marker = null;
	let location = {
		lat: lat,
		lon: lon
	};

	let mapLoaded = false;

	const dispatch = createEventDispatcher();

	selectedStopIds.subscribe(() => {
		if (!mapLoaded) return;

		drawSelectedStops();
	});

	export function setMarkerPosition(lon, lat) {
		if (!mapLoaded) return;

		location.lon = lon;
		location.lat = lat;

		if (marker) {
			marker.setLngLat([lon, lat]);
		} else {
			marker = new Marker({ draggable: true }).setLngLat([lon, lat]).setDraggable(true).addTo(map);
			marker.on('dragend', markerMoved);
		}
	}

	const drawStops = () => {
		map.getSource('stops').setData({
			type: 'FeatureCollection',
			features: Object.values($stops).map((stop) => {
				return {
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: [stop.lon, stop.lat]
					},
					properties: {
						id: stop.id,
						label: `${stop.id} - ${stop.name}`
					}
				};
			})
		});
	};

	const drawSelectedStops = () => {
		const source = map.getSource('selected-stops');
		source.setData({
			type: 'FeatureCollection',
			features: $selectedStopIds
				.filter((id) => $stops[id])
				.map((id) => {
					const stop = $stops[id];
					return {
						type: 'Feature',
						geometry: {
							type: 'Point',
							coordinates: [stop.lon, stop.lat]
						}
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
		dispatch('change', {
			lat: location.lat,
			lon: location.lon
		});
	}

	function dispatchSelect() {
		dispatch('stop-selection-change', {
			selectedStopIds: $selectedStopIds
		});
	}

	function addSourcesAndLayers() {
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
				'circle-radius': {
					base: 1.75,
					stops: [
						[0, 2],
						[16, 3],
						[17, 15],
						[18, 20]
					]
				},
				'circle-opacity': 0.6,
				'circle-stroke-width': 1,
				'circle-stroke-color': '#ffffff'
			}
		});

		map.addSource('selected-stops', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});
		map.addLayer({
			id: 'selected-stops',
			type: 'circle',
			source: 'selected-stops',
			paint: {
				'circle-color': '#ff7799',
				'circle-radius': {
					base: 1.75,
					stops: [
						[0, 2],
						[16, 3],
						[17, 15],
						[18, 20]
					]
				},
				'circle-stroke-width': 1,
				'circle-stroke-color': '#ffffff'
			}
		});

		map.addLayer({
			id: 'stopLabels',
			type: 'symbol',
			source: 'stops',
			layout: {
				'text-field': ['get', 'label'],
				'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
				'text-size': 8,
				'text-offset': [5, 0],
				'text-anchor': 'left',
				'text-max-width': 150,
				'text-allow-overlap': false
			},
			minzoom: 18
		});
	}

	onMount(() => {
		const lastPos = JSON.parse(sessionStorage.getItem('lastPos'));

		map = new Map({
			container: mapElem,
			style: tileStyle,
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
			if (canSelectStops) {
				const selectedFeatures = map.queryRenderedFeatures(e.point, {
					layers: ['stops']
				});
				if (selectedFeatures.length == 1) {
					const id = selectedFeatures[0].properties.id;
					if ($selectedStopIds.includes(id)) {
						$selectedStopIds = $selectedStopIds.filter((stopId) => stopId !== id);
					} else {
						$selectedStopIds.push(id);
						$selectedStopIds = $selectedStopIds;
					}
					drawSelectedStops();
					dispatchSelect();
					return;
				} else if (selectedFeatures.length >= 2) {
					alert('More than one stop selected at once. Try again');
				}
			}

			location.lat = e.lngLat.lat;
			location.lon = e.lngLat.lng;

			console.log('Map click');

			if (marker) {
				marker.setLngLat(e.lngLat).addTo(map);
			} else {
				marker = new Marker({ draggable: true }).setLngLat(e.lngLat).setDraggable(true).addTo(map);
				marker.on('dragend', markerMoved);
			}

			dispatchChange();
		});

		map.on('load', function () {
			addSourcesAndLayers();
			mapLoaded = true;

			drawStops();

			if ($selectedStopIds?.length) {
				drawSelectedStops();
			}
		});

		map.on('moveend', (e) => {
			sessionStorage.setItem(
				'lastPos',
				JSON.stringify([e.target.getCenter().lng, e.target.getCenter().lat, e.target.getZoom()])
			);
		});
	});

	onDestroy(() => {
		mapLoaded = false;
		map.remove();
	});
</script>

<div class="rounded-lg grow-1 max-w-96 h-96 w-full cursor-crosshair" bind:this={mapElem} />
