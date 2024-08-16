<script lang="ts">
	import maplibre from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { onDestroy, onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	import * as turf from '@turf/turf';
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

	export function deleteAllLayers() {
		dLayers.forEach((layer) => {
			dropLayerSpecDerivatives(layer);
		});
		dLayers = [];
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
		midpoints: any[],
		lines: [number, number][][],
		poly: [number, number][][]
	) {
		let features = [];
		let pointIdx = 0;
		features = points.map((point) => ({
			type: 'Feature',
			id: pointIdx++,
			geometry: {
				type: 'Point',
				coordinates: point.coords
			},
			properties: {
				isControl: true
			}
		}));
		midpoints.forEach((point) =>
			features.push({
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: point.coords
				},
				properties: {
					cp1: point.cp1,
					cp2: point.cp2,
					isMidpoint: true
				}
			})
		);
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

	export function drawBoundaryFeatures(boundary: ControlPoint[]) {
		let pointIdx = 0;
		const boundaryFeatures = boundary.map((point) => ({
			id: pointIdx++,
			type: 'Feature',
			geometry: {
				type: 'Point',
				coordinates: point.coords
			}
		}));

		// Calculate the convex polygon of the boundary
		if (boundary.length > 2) {
			const boundaryCoords = boundary.map((point) => point.coords);
			const convexHull = turf.convex(turf.multiPoint(boundaryCoords));
			boundaryFeatures.push(convexHull);
		}

		map.getSource('boundary').setData({
			type: 'FeatureCollection',
			features: boundaryFeatures
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
			filter: ['all', ['==', '$type', 'Point'], ['has', 'isControl']],
			paint: {
				'circle-radius': 10,
				'circle-color': '#ff0000',
				'circle-opacity': 0.5,
				'circle-stroke-color': '#0000ff',
				'circle-stroke-opacity': 0.5,
				'circle-stroke-width': 2
			}
		});

		map.addLayer({
			id: 'control-midpoints',
			type: 'circle',
			source: 'editing',
			// The property isMidpoint is true
			filter: ['all', ['==', '$type', 'Point'], ['has', 'isMidpoint']],
			paint: {
				'circle-radius': 6,
				'circle-color': '#ff0000',
				'circle-opacity': 0.3,
				'circle-stroke-color': '#0000ff',
				'circle-stroke-opacity': 0.3,
				'circle-stroke-width': 1.5
			}
		});

		map.addSource('boundary', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});

		map.addLayer({
			id: 'boundary-points',
			type: 'circle',
			source: 'boundary',
			filter: ['==', '$type', 'Point'],
			paint: {
				'circle-radius': 10,
				'circle-color': '#0000ff',
				'circle-opacity': 0.5,
				'circle-stroke-color': '#0000ff',
				'circle-stroke-opacity': 0.7,
				'circle-stroke-width': 2
			}
		});

		map.addLayer({
			id: 'boundary-outline',
			type: 'line',
			source: 'boundary',
			filter: ['==', '$type', 'Polygon'],
			layout: {
				'line-cap': 'round',
				'line-join': 'round'
			},
			paint: {
				'line-width': 2,
				'line-color': '#0000ff',
				'line-opacity': 0.7
			}
		});
	}

	function addEditionEvents() {
		const canvas = map.getCanvas();

		map.on('mouseenter', 'control-points', () => {
			// map.setPaintProperty('point', 'circle-color', '#3bb2d0');
			canvas.style.cursor = 'move';
		});
		map.on('mouseleave', 'control-points', () => {
			// map.setPaintProperty('point', 'circle-color', '#3887be');
			canvas.style.cursor = '';
		});
		map.on('mouseenter', 'control-midpoints', () => {
			canvas.style.cursor = 'move';
		});
		map.on('mouseleave', 'control-midpoints', () => {
			canvas.style.cursor = '';
		});

		map.on('click', (e) => {
			handleMapClick(e);
		});
		// ----- Control point dragging

		function onControlPointDown(e) {
			// Prevent the default map drag behavior.
			e.preventDefault();
			canvas.style.cursor = 'grab';
			const idx = e.features[0].id;
			dispatch('controlselect', { idx });

			const onMove = (e) => {
				canvas.style.cursor = 'grabbing';
				const coords = e.lngLat;
				dispatch('controlmove', { coords: [coords.lng, coords.lat] });
			};
			const onUp = (e) => {
				const coords = e.lngLat;
				canvas.style.cursor = '';
				dispatch('controlselectend', { coords });
				map.off('mousemove', onMove);
				map.off('touchmove', onMove);
			};

			map.on('mousemove', onMove);
			map.once('mouseup', onUp);
		}
		map.on('mousedown', 'control-points', onControlPointDown);
		map.on('touchstart', 'control-points', onControlPointDown);

		function onControlMidpointDown(e) {
			// Prevent the default map drag behavior.
			e.preventDefault();
			canvas.style.cursor = 'grab';
			dispatch('midpointselect', {
				cp1: e.features[0].properties.cp1,
				cp2: e.features[0].properties.cp2
			});

			const onMove = (e) => {
				canvas.style.cursor = 'grabbing';
				const coords = e.lngLat;
				dispatch('controlmove', { coords: [coords.lng, coords.lat] });
			};

			const onUp = (e) => {
				const coords = e.lngLat;
				canvas.style.cursor = '';
				dispatch('controlselectend', { coords });
				map.off('mousemove', onMove);
				map.off('touchmove', onMove);
			};

			map.on('mousemove', onMove);
			map.once('mouseup', onUp);
		}
		map.on('mousedown', 'control-midpoints', onControlMidpointDown);
		map.on('touchstart', 'control-midpoints', onControlMidpointDown);

		function onBoundaryDown(e) {
			e.preventDefault();
			canvas.style.cursor = 'grab';
			const idx = e.features[0].id;

			const onMove = (e) => {
				canvas.style.cursor = 'grabbing';
				const coords = e.lngLat;
				dispatch('boundarymove', { idx, coords: [coords.lng, coords.lat] });
			};
			const onUp = (e) => {
				const coords = e.lngLat;
				canvas.style.cursor = '';
				dispatch('boundaryselectend', { idx, coords });
				map.off('mousemove', onMove);
				map.off('touchmove', onMove);
			};

			map.on('mousemove', onMove);
			map.once('mouseup', onUp);
		}
		map.on('mousedown', 'boundary-points', onBoundaryDown);
		map.on('touchstart', 'boundary-points', onBoundaryDown);
	}

	// ----- Map user interaction -----
	export function fitToPoints(points: [number, number][]) {
		if (points.length < 2) {
			console.error('Attempted to fit map to less than 2 points');
			return;
		}
		const bounds = points.reduce(
			(bounds, point) => {
				return bounds.extend(point);
			},
			new maplibre.LngLatBounds(points[0], points[0])
		);
		map.fitBounds(bounds, { padding: 20 });
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

		map.addControl(new maplibre.FullscreenControl(), 'top-left');
		map.addControl(new maplibre.FullscreenControl(), 'top-left');

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
