<script>
	import { onDestroy, onMount, createEventDispatcher } from 'svelte';
	import { Map as Maplibre, NavigationControl, GeolocateControl } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { SearchControl } from '$lib/stops/SearchControl.js';
	import { tileStyle } from '$lib/settings.js';

	const dispatch = createEventDispatcher();
	const DEFAULT_PADDING = 0;
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

	export function redrawStops(
		stops,
		unpositionedStops,
		underpositionedStops,
		needsPicStops,
		reportIssueStops,
		otherStops
	) {
		console.log(unpositionedStops.length);
		map.getSource('stops').setData({
			type: 'FeatureCollection',
			features: stops
		});
		map.getSource('unpositioned-stops').setData({
			type: 'FeatureCollection',
			features: unpositionedStops
		});
		map.getSource('underpositioned-stops').setData({
			type: 'FeatureCollection',
			features: underpositionedStops
		});
		map.getSource('needs-pic-stops').setData({
			type: 'FeatureCollection',
			features: needsPicStops
		});
		map.getSource('report-issue-stops').setData({
			type: 'FeatureCollection',
			features: reportIssueStops
		});
		map.getSource('other-stops').setData({
			type: 'FeatureCollection',
			features: otherStops
		});
	}

	export function flyTo(lon, lat) {
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
		const circleRadius = {
			base: 1.75,
			stops: [
				[0, 1.5],
				[11, 2],
				[17, 7],
				[18, 15]
			]
		};
		const layers = [
			'stops',
			'unpositioned-stops',
			'underpositioned-stops',
			'needs-pic-stops',
			'report-issue-stops',
			'other-stops'
		];
		for (const layer of layers) {
			map.addSource(layer, {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: []
				}
			});
		}

		map.addLayer({
			id: 'stops',
			source: 'stops',
			type: 'circle',
			paint: {
				'circle-color': 'rgba(50, 150, 220, 0.7)',
				'circle-radius': circleRadius,
				'circle-stroke-width': 1,
				'circle-stroke-color': 'white'
			}
		});

		map.addLayer({
			id: 'labels',
			source: 'stops',
			type: 'symbol',
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
			minzoom: 17
		});
		// ------------------

		map.addLayer({
			id: 'unpositioned-stops',
			source: 'unpositioned-stops',
			type: 'circle',
			paint: {
				'circle-color': 'red',
				'circle-radius': circleRadius,
				'circle-stroke-width': 1,
				'circle-stroke-color': 'maroon'
			}
		});

		map.addLayer({
			id: 'underpositioned-stops',
			source: 'underpositioned-stops',
			type: 'circle',
			paint: {
				'circle-color': 'orange',
				'circle-radius': circleRadius,
				'circle-stroke-width': 1,
				'circle-stroke-color': 'orchid'
			}
		});

		map.addLayer({
			id: 'needs-pic-stops',
			source: 'needs-pic-stops',
			type: 'circle',
			paint: {
				'circle-color': 'lime',
				'circle-radius': circleRadius,
				'circle-stroke-width': 2,
				'circle-stroke-color': 'green'
			}
		});

		// map.addLayer({
		// 	id: 'report-issue-stops',
		// 	source: 'report-issue-stops',
		// 	type: 'circle',
		// 	paint: {
		// 		'circle-color': 'cyan',
		// 		'circle-radius': circleRadius,
		// 		'circle-stroke-width': 2,
		// 		'circle-stroke-color': 'blue'
		// 	}
		// });
		map.addLayer({
			id: 'report-issue-stops',
			source: 'report-issue-stops',
			type: 'circle',
			paint: {
				'circle-color': 'indigo',
				'circle-radius': circleRadius,
				'circle-stroke-width': 1,
				'circle-stroke-color': 'lavender'
			}
		});

		map.addLayer({
			id: 'other-stops',
			source: 'other-stops',
			type: 'circle',
			paint: {
				'circle-color': 'yellow',
				'circle-radius': circleRadius,
				'circle-stroke-width': 2,
				'circle-stroke-color': 'tomato'
			}
		});
	}

	function addEvents() {
		const style = map.getCanvasContainer().style;
		map.on('mouseenter', 'stops', () => {
			style.cursor = 'pointer';
		});
		map.on('mouseleave', 'stops', () => {
			style.cursor = '';
		});

		map.on('click', 'stops', (e) => {
			dispatch('stop-click', { id: e.features[0].properties.id });
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
