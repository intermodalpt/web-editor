<script lang="ts">
	import maplibre from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { onDestroy, onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	import {
		defaultMapBounds,
		defaultMapCenter,
		defaultMapZoom,
		mapMinZoom,
		tileStyle
	} from '$lib/settings';
	import { completeLayerSpec } from './utils';

	let map;
	let mapElem;
	let mapLoaded = false;

	const dispatch = createEventDispatcher();

	let dLayers: DrawnLayer[] = [];

	// ----- Rendered data handling -----

	export function addLayer(id: LayerId, spec: LayerSpec) {
		const dLayer = {
			id,
			features: [],
			spec: completeLayerSpec(spec),
			source: '',
			sublayers: [],
			visible: true
		};
		instantiateLayerSpec(dLayer);
		dLayers.push(dLayer);
	}

	export function setLayerVisibility(layerId: LayerId, visible: boolean) {
		const dLayer = dLayers.find((l) => l.id === layerId);
		if (!dLayer) {
			console.error('Attempted to set the visibility of an unrecognized layer');
			return;
		}
		if (dLayer.visible === visible) return;
		dLayer.visible = visible;
		if (visible) {
			map.getSource(dLayer.source).setData({
				type: 'FeatureCollection',
				features: dLayer.features
			});
		} else {
			map.getSource(dLayer.source).setData({
				type: 'FeatureCollection',
				features: []
			});
		}
	}

	export function deleteLayer(layerId: LayerId) {
		const dLayer = dLayers.find((l) => l.id == layerId);
		if (!dLayer) {
			console.error('Attempted to delete an unrecognized layer');
			return;
		}
		dropLayerSpecDerivatives(dLayer);
		dLayers = dLayers.filter((l) => l.id !== layerId);
	}

	export function updateLayerSpec(layerId: LayerId, spec: LayerSpec) {
		const dLayer = dLayers.find((l) => l.id === layerId);
		if (!dLayer) {
			console.error('Attempted to update the spec of an unrecognized layer');
			return;
		}
		dLayer.spec = completeLayerSpec(spec);
		dropLayerSpecDerivatives(dLayer);
		instantiateLayerSpec(dLayer);
	}

	export function updateLayerFeatures(layerId: LayerId, features: GeoJsonFeature[]) {
		const layer = dLayers.find((l) => l.id === layerId);
		if (!layer) {
			console.error('Attempted to update the features of an unrecognized layer');
			return;
		}
		layer.features = structuredClone(features);
		map.getSource(layer.source).setData({
			type: 'FeatureCollection',
			features: features
		});
	}

	function instantiateLayerSpec(layer) {
		const sourceId = '' + layer.id;
		map.addSource(sourceId, {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: layer.features
			}
		});
		layer.source = sourceId;

		const spec = layer.spec;

		if (spec.points) {
			const layerId = `${layer.id}-points`;
			layer.sublayers.push(layerId);
			map.addLayer({
				id: layerId,
				type: 'circle',
				source: '' + layer.id,
				filter: ['==', '$type', 'Point'],
				paint: {
					'circle-radius': spec.points.size ?? 3,
					'circle-color': spec.points.color ?? '#000000',
					'circle-opacity': spec.points.opacity ?? 1,
					'circle-stroke-color': spec.points.outline?.color ?? '#000000',
					'circle-stroke-opacity': spec.points.outline?.opacity ?? 0,
					'circle-stroke-width': spec.points.outline?.size ?? 1
				}
			});
			addClickEvent(layerId);
		}

		if (spec.lines) {
			let lineSize = spec.lines.size ?? 2;
			if (spec.lines.outline) {
				const layerId = `${layer.id}-lines-outline`;
				layer.sublayers.push(layerId);
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
						'line-width': lineSize + (spec.lines.outline?.size ?? 1),
						'line-color': spec.lines.outline?.color ?? '#333333',
						'line-opacity': spec.lines.outline?.opacity ?? 1
						// 'line-dasharray': spec.lines.dashArray ?? []
					}
				});
				addClickEvent(layerId);
			}

			const layerId = `${layer.id}-lines`;
			layer.sublayers.push(layerId);
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
					'line-width': lineSize,
					'line-color': spec.lines.color ?? '#ffffff',
					'line-opacity': spec.lines?.opacity ?? 1
					// 'line-dasharray': spec.lines.dashArray ?? []
				}
			});
			addClickEvent(layerId);
		}

		if (spec.polys) {
			const layerId = `${layer.id}-polys`;
			layer.sublayers.push(layerId);
			map.addLayer({
				id: layerId,
				type: 'fill',
				source: '' + layer.id,
				// Accept polygons or multipolygons
				filter: ['==', '$type', 'Polygon'],
				paint: {
					'fill-color': spec.polys.color ?? '#FF0000',
					'fill-opacity': spec.polys.opacity ?? 1,
					'fill-outline-color': spec.polys.outline?.color ?? '#000000'
					// 'fill-outline-opacity': spec.polys.outline?.opacity ?? 0,
					// 'fill-outline-width': spec.polys.outline?.size ?? 1
				}
			});
			addClickEvent(layerId);

			if (spec.polys.outline) {
				const layerId = `${layer.id}-polys-outline`;
				layer.sublayers.push(layerId);
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
						'line-width': spec.polys.outline.size ?? 1,
						'line-color': spec.polys.outline.color ?? '#333333',
						'line-opacity': spec.polys.outline.opacity ?? 1
						// 'line-dasharray': spec.lines.dashArray ?? []
					}
				});
				addClickEvent(layerId);
			}
		}
	}

	// Drops the layers and event handlers
	function dropLayerSpecDerivatives(layer) {
		layer.sublayers.forEach((layerId) => {
			map.removeLayer(layerId);
			map.off('click', layerId);
			map.off('mouseenter', layerId);
			map.off('mouseleave', layerId);
		});
		layer.sublayers = [];
		if (layer.source) {
			map.removeSource(layer.source);
			layer.source = undefined;
		}
	}

	// ----- Generic events -----

	function handleMapClick(e) {
		dispatch('mapclick', e);
	}

	function handleFeatureClick(e) {
		e.preventDefault();
		dispatch('featureclick', { feature: e.features[0] });
	}

	function addClickEvent(layerId) {
		map.on('click', layerId, handleFeatureClick);

		const canvas = map.getCanvas();
		map.on('mouseenter', layerId, () => {
			canvas.style.cursor = 'pointer';
		});

		map.on('mouseleave', layerId, () => {
			canvas.style.cursor = '';
		});
	}

	// ----- Edition handling -----

	export function drawControlFeatures(
		points: ControlPoint[],
		lines: [number, number][][],
		poly: [number, number][][]
	) {
		let features = [];
		features = points.map((point) => ({
			type: 'Feature',
			id: point.idx,
			geometry: {
				type: 'Point',
				coordinates: point.coords
			},
			properties: {}
		}));
		lines.forEach((line) => {
			features.push({
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: line
				},
				properties: {}
			});
		});
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

		map.getSource('editing').setData({
			type: 'FeatureCollection',
			features: features
		});
	}

	export function clearEditData() {
		map.getSource('editing').setData({
			type: 'FeatureCollection',
			features: []
		});
	}

	function instantiateEditionLayers() {
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

	function addEditionEvents() {
		const canvas = map.getCanvas();
		map.on('click', (e) => {
			handleMapClick(e);
		});

		// ----- Control point dragging

		const controlPointOnMove = (e) => {
			canvas.style.cursor = 'grabbing';
			const coords = e.lngLat;
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
			maxZoom: 20,
			maxBounds: defaultMapBounds,
			center: defaultMapCenter
		});

		map.on('load', () => {
			instantiateEditionLayers();
			addEditionEvents();
			mapLoaded = true;
			dispatch('mapload');
		});
	});

	onDestroy(() => map?.remove());
</script>

<div bind:this={mapElem} class="w-full h-full relative">
	<slot />
</div>
