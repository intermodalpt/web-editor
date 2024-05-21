<script>
	import { onDestroy, onMount, createEventDispatcher } from 'svelte';
	import { Map as Maplibre, NavigationControl, GeolocateControl, LngLatBounds } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { SearchControl } from '$lib/stops/SearchControl.js';
	import { tileStyle } from '$lib/settings.js';

	const dispatch = createEventDispatcher();
	const DEFAULT_PADDING = 300;
	const EXTRA_PADDING = 350;

	export let mapParams;

	let map;
	let searchDialog;

	export function increaseSidePadding(show) {
		map.easeTo({
			padding: { left: show ? EXTRA_PADDING : DEFAULT_PADDING },
			duration: 300
		});
	}

	export function redrawTripPreview(trip) {
		map.getSource('trippreview').setData({
			type: 'LineString',
			coordinates: trip
		});
	}

	export function redrawFlow(lon, lat, bearing, origins, destinations) {
		map.getSource('origins').setData({
			type: 'MultiLineString',
			coordinates: origins
		});

		map.getSource('destinations').setData({
			type: 'MultiLineString',
			coordinates: destinations
		});

		// Fly to the current stop
		map.flyTo({
			center: [lon, lat],
			zoom: 16,
			bearing: bearing,
			duration: 2000,
			pitch: 45
		});
	}

	export function redrawMatches(unverified, verified) {
		const matchToFeature = (stop) => {
			return {
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: [
						[stop.lon, stop.lat],
						[stop.gtfsStop.lon, stop.gtfsStop.lat]
					]
				}
			};
		};

		map.getSource('stopmatches-unv').setData({
			type: 'FeatureCollection',
			features: unverified.map(matchToFeature)
		});
		map.getSource('stopmatches-ver').setData({
			type: 'FeatureCollection',
			features: verified.map(matchToFeature)
		});
	}

	export function redrawStops(used, unused, gtfs) {
		map.getSource('used-stops').setData({
			type: 'FeatureCollection',
			features: used
		});

		map.getSource('unused-stops').setData({
			type: 'FeatureCollection',
			features: unused
		});

		map.getSource('gtfs').setData({
			type: 'FeatureCollection',
			features: gtfs
		});
	}

	export function flyToTrip(coords) {
		const bounds = new LngLatBounds();

		coords.forEach((c) => {
			bounds.extend([c.lon, c.lat]);
		});
		map.fitBounds(bounds, {
			padding: 50
		});
	}

	export function flyTo(lon, lat) {
		console.log('Flying to', lon, lat);
		map.flyTo({
			center: [lon, lat],
			zoom: 17.5
		});
	}

	export function setCenterAndZoom(center, zoom) {
		map.setCenter(mapParams.center);
		map.setZoom(mapParams.zoom);
	}

	function addSourcesAndLayers() {
		// The UNVERIFIED matches between operator stops and GTFS stops
		map.addSource('stopmatches-unv', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});
		map.addLayer({
			id: 'stopmatches-unv',
			type: 'line',
			source: 'stopmatches-unv',
			paint: {
				'line-color': '#c026d3',
				'line-width': 3
			}
		});

		// The VERIFIED matches between operator stops and GTFS stops
		map.addSource('stopmatches-ver', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});
		map.addLayer({
			id: 'stopmatches-ver',
			type: 'line',
			source: 'stopmatches-ver',
			paint: {
				'line-color': '#e11d48',
				'line-width': 3
			}
		});

		// THE GTFS stops
		map.addSource('gtfs', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});
		map.addLayer({
			id: 'gtfs',
			type: 'circle',
			source: 'gtfs',
			paint: {
				'circle-color': 'rgb(220, 150, 50)',
				'circle-radius': {
					base: 1.75,
					stops: [
						[0, 1.5],
						[11, 2],
						[17, 7],
						[18, 15]
					]
				},
				'circle-stroke-width': 1,
				'circle-stroke-color': '#fff'
			}
		});
		map.addLayer({
			id: 'gtfsLabels',
			type: 'symbol',
			source: 'gtfs',
			layout: {
				'text-field': ['get', 'id_name'],
				'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
				'text-size': 8,
				'text-offset': [5, 0],
				'text-anchor': 'left',
				'text-max-width': 150,
				'text-allow-overlap': false
				// 'text-ignore-placement': true
			},
			minzoom: 18
		});

		// The used IML stops (both within and outside the region)
		map.addSource('used-stops', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});

		map.addLayer({
			id: 'used-stops',
			type: 'circle',
			source: 'used-stops',
			paint: {
				'circle-color': 'rgba(50, 150, 220, 0.7)',
				'circle-radius': {
					base: 1.75,
					stops: [
						[0, 1.5],
						[11, 2],
						[17, 7],
						[18, 15]
					]
				},
				'circle-stroke-width': ['case', ['get', 'missing'], 2, 1],
				// Depends on the property "missing"
				'circle-stroke-color': ['case', ['get', 'missing'], 'red', 'white']
			}
		});

		// The unused region IML stops
		map.addSource('unused-stops', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});

		map.addLayer({
			id: 'unused-stops',
			type: 'circle',
			source: 'unused-stops',
			paint: {
				'circle-color': 'rgba(50, 150, 220, 0.3)',
				'circle-radius': {
					base: 1.75,
					stops: [
						[0, 1.5],
						[11, 2],
						[17, 7],
						[18, 15]
					]
				},
				'circle-stroke-width': 0.5,
				'circle-stroke-color': '#fff'
			}
		});

		map.addLayer(
			{
				id: 'trippreview',
				type: 'line',
				source: {
					type: 'geojson',
					data: {
						type: 'MultiLineString',
						coordinates: []
					}
				},
				paint: {
					'line-color': '#67e8f9',
					'line-width': 4
				}
			},
			'gtfs'
		);

		map.addLayer(
			{
				id: 'origins',
				type: 'line',
				source: {
					type: 'geojson',
					data: {
						type: 'MultiLineString',
						coordinates: []
					}
				},
				paint: {
					'line-color': '#16a34a',
					'line-width': 2
				}
			},
			'gtfs'
		);

		map.addLayer(
			{
				id: 'destinations',
				type: 'line',
				source: {
					type: 'geojson',
					data: {
						type: 'MultiLineString',
						coordinates: []
					}
				},
				paint: {
					'line-color': '#bef264',
					'line-width': 2
				}
			},
			'gtfs'
		);

		map.addSource('matchline', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});
	}

	function addEvents() {
		const style = map.getCanvasContainer().style;

		map.on('mouseenter', 'gtfs', () => {
			style.cursor = 'pointer';
		});
		map.on('mouseleave', 'gtfs', () => {
			style.cursor = '';
		});
		map.on('mouseenter', 'stops', () => {
			style.cursor = 'pointer';
		});
		map.on('mouseleave', 'stops', () => {
			style.cursor = '';
		});

		map.on('click', 'used-stops', (e) => {
			dispatch('used-click', { id: e.features[0].properties.id });
		});

		map.on('click', 'unused-stops', (e) => {
			dispatch('unused-click', { id: e.features[0].properties.id });
		});

		map.on('click', 'gtfs', (e) => {
			if (map.getZoom() < 15) return;
			dispatch('gtfs-click', { id: e.features[0].properties.id });
		});
	}

	onMount(() => {
		map = new Maplibre({
			container: 'map',
			style: tileStyle,
			center: mapParams.center,
			zoom: mapParams.zoom,
			minZoom: 8,
			maxZoom: 20
		});
		map.easeTo({ padding: { left: DEFAULT_PADDING } });

		map.addControl(new NavigationControl(), 'top-right');
		map.addControl(new SearchControl(() => searchDialog.showModal()), 'top-right');
		map.addControl(
			new GeolocateControl({
				positionOptions: {
					enableHighAccuracy: true
				},
				showUserHeading: true,
				trackUserLocation: true
			})
		);

		map.on('load', async function () {
			addSourcesAndLayers();
			addEvents();
			dispatch('load');
		});
	});

	onDestroy(() => {
		map.remove();
	});
</script>

<div id="map" class="h-full relative">
	<dialog bind:this={searchDialog} class="modal modal-bottom sm:modal-middle">
		<slot name="search-dialog" />
	</dialog>
	<slot />
</div>
