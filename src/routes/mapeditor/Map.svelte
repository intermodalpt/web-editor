<script lang="ts">
	import {
		defaultMapBounds,
		defaultMapCenter,
		defaultMapZoom,
		mapMinZoom,
		tileStyle
	} from '$lib/settings';
	import { json } from '@sveltejs/kit';
	import maplibre from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { onDestroy, onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';

	let map;
	let mapElem;
	let mapLoaded = false;

	const dispatch = createEventDispatcher();

	let drawnLayers: DrawnLayer[] = [];

	let layers: Layer[] = [];

	export function redraw() {
		drawnLayers.forEach((pair) => {
			pair.sublayers.forEach((layerId) => {
				map.removeLayer(layerId);
			});
			map.removeSource(pair.source);
		});

		drawnLayers = [];
		layers.forEach((layer) => drawLayer(layer));
	}

	export function addLayer(layer) {
		layers.push(layer);
		redraw();
	}

	export function deleteLayer(layerId) {
		layers = layers.filter((l) => l.id !== id);
		redraw();
	}

	export function setControlFeatures(
		points: ControlPoint[],
		line: [number, number][],
		poly: [number, number][][]
	) {
		console.log('setControlPoints at', new Date().getMilliseconds());
		let features = [];
		features = points.map((point) => ({
			type: 'Feature',
			id: point.id,
			geometry: {
				type: 'Point',
				coordinates: point.coords
			},
			properties: {}
		}));
		if (line.length > 0) {
			features.push({
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: line
				},
				properties: {}
			});
		}
		if (poly.length > 0) {
			features.push({
				type: 'Feature',
				geometry: {
					type: 'Polygon',
					coordinates: poly
				},
				properties: {}
			});
		}

		console.log(poly);
		console.log(JSON.stringify(features));

		map.getSource('editing').setData({
			type: 'FeatureCollection',
			features: features
		});
		console.log('done at', new Date().getMilliseconds());
		console.log('------------------------');
	}

	export function clearEditData() {
		map.getSource('editing').setData({
			type: 'FeatureCollection',
			features: []
		});
	}

	function handleMapClick(e) {
		dispatch('mapclick', e);
	}

	function handleFeatureClick(e) {
		e.preventDefault();
		dispatch('featureclick', { feature: e.features[0] });
	}

	function addClickEvent(layer) {
		map.on('click', layer, handleFeatureClick);

		const canvas = map.getCanvas();
		map.on('mouseenter', layer, () => {
			canvas.style.cursor = 'pointer';
		});

		map.on('mouseleave', layer, () => {
			canvas.style.cursor = '';
		});
	}

	function drawLayer(layer) {
		if (!layer.visible) return;

		const sourceId = '' + layer.id;
		map.addSource(sourceId, {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: layer.features
			}
		});

		const sublayers = [];

		if (layer.points) {
			const layerId = `${layer.id}-${layer.name ?? ''}-points`;
			sublayers.push(layerId);
			map.addLayer({
				id: layerId,
				type: 'circle',
				source: '' + layer.id,
				filter: ['==', '$type', 'Point'],
				paint: {
					'circle-radius': layer.points.size ?? 3,
					'circle-color': layer.points.color ?? '#000000',
					'circle-opacity': layer.points.opacity ?? 1,
					'circle-stroke-color': layer.points.outline?.color ?? '#000000',
					'circle-stroke-opacity': layer.points.outline?.opacity ?? 0,
					'circle-stroke-width': layer.points.outline?.size ?? 1
				}
			});
			addClickEvent(layerId);
		}

		if (layer.lines) {
			let lineThickness = layer.lines.size ?? 2;
			if (layer.lines.outline) {
				const layerId = `${layer.id}-${layer.name ?? ''}-lines-outline`;
				sublayers.push(layerId);
				map.addLayer({
					id: layerId,
					type: 'line',
					source: '' + layer.id,
					filter: ['==', '$type', 'LineString'],
					layout: {
						'line-cap': 'round',
						'line-join': 'round'
					},
					paint: {
						'line-width': lineThickness + (layer.lines.outline?.thickness ?? 1),
						'line-color': layer.lines.outline?.color ?? '#333333',
						'line-opacity': layer.lines.outline?.opacity ?? 1
						// 'line-dasharray': layer.lines.dashArray ?? []
					}
				});
				addClickEvent(layerId);
			}

			const layerId = `${layer.id}-${layer.name ?? ''}-lines`;
			sublayers.push(layerId);
			map.addLayer({
				id: layerId,
				type: 'line',
				source: '' + layer.id,
				filter: ['==', '$type', 'LineString'],
				layout: {
					'line-cap': 'round',
					'line-join': 'round'
				},
				paint: {
					'line-width': lineThickness,
					'line-color': layer.lines.color ?? '#ffffff',
					'line-opacity': layer.lines?.opacity ?? 1
					// 'line-dasharray': layer.lines.dashArray ?? []
				}
			});
			addClickEvent(layerId);
		}

		if (layer.polys) {
			const layerId = `${layer.id}-${layer.name ?? ''}-polys`;
			sublayers.push(layerId);
			map.addLayer({
				id: layerId,
				type: 'fill',
				source: '' + layer.id,
				// Accept polygons or multipolygons
				filter: ['==', '$type', 'Polygon'],
				paint: {
					'fill-color': layer.polys.color ?? '#000000',
					'fill-opacity': layer.polys.opacity ?? 1,
					'fill-outline-color': layer.polys.outline?.color ?? '#000000'
					// 'fill-outline-opacity': layer.polys.outline?.opacity ?? 0,
					// 'fill-outline-width': layer.polys.outline?.size ?? 1
				}
			});
			addClickEvent(layerId);

			if (layer.polys.outline) {
				const layerId = `${layer.id}-${layer.name ?? ''}-polys-outline`;
				sublayers.push(layerId);
				map.addLayer({
					id: layerId,
					type: 'line',
					source: '' + layer.id,
					filter: ['==', '$type', 'Polygon'],
					layout: {
						'line-cap': 'round',
						'line-join': 'round'
					},
					paint: {
						'line-width': layer.polys.outline.size ?? 1,
						'line-color': layer.polys.outline.color ?? '#333333',
						'line-opacity': layer.polys.outline.opacity ?? 1
						// 'line-dasharray': layer.lines.dashArray ?? []
					}
				});
				addClickEvent(layerId);
			}
		}

		drawnLayers.push({
			id: layer.id,
			source: sourceId,
			sublayers
		});
	}

	function addSourcesAndLayers() {
		map.addSource('editing', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});

		map.addLayer({
			id: 'editing-polys',
			type: 'fill',
			source: 'editing',
			filter: ['==', '$type', 'Polygon'],
			paint: {
				'fill-color': '#0000ff',
				'fill-opacity': 0.5
			}
		});
		map.addLayer({
			id: 'editing-lines',
			type: 'line',
			source: 'editing',
			filter: ['==', '$type', 'LineString'],
			layout: {
				'line-cap': 'round',
				'line-join': 'round'
			},
			paint: {
				'line-width': 5,
				'line-color': '#ff0000',
				'line-opacity': 0.5,
				'line-dasharray': [2, 2]
			}
		});

		map.addLayer({
			id: 'control-points',
			type: 'circle',
			source: 'editing',
			filter: ['==', '$type', 'Point'],
			paint: {
				'circle-radius': 10,
				'circle-color': '#ff0000',
				'circle-opacity': 0.5,
				'circle-stroke-color': '#0000ff',
				'circle-stroke-opacity': 0.5,
				'circle-stroke-width': 2
			}
		});
	}

	function addEvents() {
		const canvas = map.getCanvas();
		map.on('click', (e) => {
			handleMapClick(e);
		});

		// ----- Control point dragging

		const controlPointOnMove = (e) => {
			canvas.style.cursor = 'grabbing';
			const coords = e.lngLat;
			console.log('Dragging at', new Date().getMilliseconds());
			dispatch('controlmove', { coords: [coords.lng, coords.lat] });
		};

		const controlPointOnUp = (e) => {
			const coords = e.lngLat;

			canvas.style.cursor = '';

			dispatch('controlselectend', { coords });
			// Unbind mouse/touch events
			map.off('mousemove', controlPointOnMove);
			map.off('touchmove', controlPointOnMove);
		};

		map.on('mouseenter', 'control-points', () => {
			// map.setPaintProperty('point', 'circle-color', '#3bb2d0');
			canvas.style.cursor = 'move';
		});

		map.on('mouseleave', 'control-points', () => {
			// map.setPaintProperty('point', 'circle-color', '#3887be');
			canvas.style.cursor = '';
		});

		map.on('mousedown', 'control-points', (e) => {
			// Prevent the default map drag behavior.
			e.preventDefault();

			canvas.style.cursor = 'grab';

			dispatch('controlselect', { id: e.features[0].id });
			map.on('mousemove', controlPointOnMove);
			map.once('mouseup', controlPointOnUp);
		});

		map.on('touchstart', 'control-points', (e) => {
			if (e.points.length !== 1) return;

			// Prevent the default map drag behavior.
			e.preventDefault();

			dispatch('controlselect', { id: e.features[0].id });
			map.on('touchmove', controlPointOnMove);
			map.once('touchend', controlPointOnUp);
		});
	}

	onMount(async () => {
		map = new maplibre.Map({
			container: mapElem,
			style: tileStyle,
			minZoom: mapMinZoom,
			zoom: defaultMapZoom,
			maxZoom: 11,
			maxBounds: defaultMapBounds,
			center: defaultMapCenter
		});

		map.on('load', () => {
			addSourcesAndLayers();
			addEvents();
			mapLoaded = true;
			redraw();
			dispatch('mapload');
		});
	});

	onDestroy(() => map?.remove());
</script>

<div bind:this={mapElem} class="w-full h-full relative">
	<slot />
</div>
