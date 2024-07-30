<script>
	import { onDestroy, onMount, createEventDispatcher } from 'svelte';
	import { tileStyle } from '$lib/settings';
	import { Map as Maplibre, NavigationControl, GeolocateControl } from 'maplibre-gl?client';

	const dispatch = createEventDispatcher();

	export let pictures;
	export let stops;
	export let compact;

	let map;
	let mapEl;
	let mapLoaded = false;

	pictures.subscribe(() => {
		updateData();
	});

	stops.subscribe(() => {
		updateData();
	});

	function updateData() {
		if (!mapLoaded || !$stops) {
			return;
		}

		map.getSource('pics').setData({
			type: 'FeatureCollection',
			features: $pictures
				.filter((pic) => pic.lat && pic.lon)
				.map((pic) => {
					return {
						type: 'Feature',
						geometry: {
							type: 'Point',
							coordinates: [pic.lon, pic.lat]
						},
						properties: {
							id: pic.id
						}
					};
				})
		});

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

		let relFeatures = [];
		$pictures
			.filter((pic) => pic.lat && pic.lon)
			.forEach((pic) => {
				pic.stops.map((stopId) => {
					let stop = $stops[stopId];
					relFeatures.push({
						type: 'Feature',
						geometry: {
							type: 'LineString',
							coordinates: [[pic.lon, pic.lat], stop ? [stop.lon, stop.lat] : [0.0, 90.0]]
						}
					});
				});
			});

		map.getSource('relations').setData({
			type: 'FeatureCollection',
			features: relFeatures
		});
	}

	function addSourcesAndLayers() {
		map.addSource('relations', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});
		map.addLayer({
			id: 'relations',
			type: 'line',
			source: 'relations',
			paint: {
				'line-color': 'rgb(200, 150, 230)',
				'line-width': 2
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

		map.addLayer({
			id: 'stops',
			type: 'circle',
			source: 'stops',
			paint: {
				'circle-color': 'rgb(50, 150, 220)',
				'circle-radius': {
					base: 1.2,
					stops: [
						[0, 1.5],
						[11, 2],
						[17, 7],
						[18, 20]
					]
				},
				'circle-stroke-width': {
					stops: [
						[0, 0.1],
						[14, 0.5],
						[18, 1]
					]
				},
				'circle-stroke-color': '#fff'
			}
		});

		map.addSource('pics', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});
		map.addLayer({
			id: 'pics',
			type: 'circle',
			source: 'pics',
			paint: {
				'circle-color': 'rgba(230, 210, 150, 0.8)',
				'circle-radius': {
					base: 1.2,
					stops: [
						[0, 1.5],
						[11, 2],
						[17, 7],
						[18, 15]
					]
				},
				'circle-stroke-width': {
					stops: [
						[0, 0.1],
						[14, 0.5],
						[18, 1]
					]
				},
				'circle-stroke-color': '#fff'
			}
		});
	}

	function addEvents() {
		const canvas = map.getCanvasContainer();
		map.on('mouseenter', 'pics', () => {
			canvas.style.cursor = 'pointer';
		});
		map.on('mouseleave', 'pics', () => {
			canvas.style.cursor = '';
		});
		map.on('mouseenter', 'stops', () => {
			canvas.style.cursor = 'pointer';
		});
		map.on('mouseleave', 'stops', () => {
			canvas.style.cursor = '';
		});

		map.on('click', 'stops', (e) => {
			let stopId = e.features[0].properties.id;
			dispatch('selectStop', { id: stopId });
		});

		map.on('click', 'pics', (e) => {
			let picId = e.features[0].properties.id;
			dispatch('selectPic', { id: picId });
		});
	}

	onMount(() => {
		map = new Maplibre({
			container: mapEl,
			style: tileStyle,
			center: [-9.0, 38.65],
			zoom: 10,
			minZoom: 8,
			maxZoom: 20,
			maxBounds: [
				[-10.0, 38.3],
				[-8.0, 39.35]
			]
		});

		map.addControl(new NavigationControl(), 'top-right');
		map.addControl(new GeolocateControl(), 'top-right');

		map.on('load', function () {
			addSourcesAndLayers();
			addEvents();

			mapLoaded = true;
			updateData();
		});
	});

	onDestroy(() => {
		mapLoaded = false;
		map.remove();
	});
</script>

<div
	bind:this={mapEl}
	class="w-full max-h-[50vh]"
	class:h-[40em]={$compact}
	class:h-[50em]={!$compact}
/>
