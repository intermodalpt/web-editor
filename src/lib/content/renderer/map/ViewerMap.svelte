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
	export function addLayer(id: LayerId, spec: LayerSpec, features: GeoJsonFeature[]) {
		const dLayer = {
			id,
			features: [],
			spec: completeLayerSpec(spec),
			source: '' + id,
			sublayers: [],
			visible: true
		};
		instantiateLayerSpec(dLayer);
		map.getSource(dLayer.source).setData({
			type: 'FeatureCollection',
			features: features
		});
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

	function instantiateLayerSpec(layer) {
		map.addSource(layer.source, {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: layer.features
			}
		});

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

	// ----- Generic events -----
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

		map.addControl(new maplibre.FullscreenControl(), 'top-right');

		map.on('load', () => {
			mapLoaded = true;
			dispatch('mapload');
		});
	});

	onDestroy(() => map?.remove());
</script>

<div bind:this={mapElem} class="w-full h-full relative">
	<slot />
</div>
