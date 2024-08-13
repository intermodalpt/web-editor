<script lang="ts">
	import { tick } from 'svelte';
	import polyline from '@mapbox/polyline';
	import LayerSettings from './LayerSettings.svelte';
	import Map from './Map.svelte';
	import { demoMapContent } from './dummydata';
	import { compileLayerFeatures } from './utils';
	import MapContent from '$lib/content/MapContent.svelte';
	import { getRouteThrough } from '$lib/api';
	import { toast } from '$lib/stores';
	import { isDeepEqual } from '$lib/utils';

	let map: Map;
	let mapLoaded = false;

	let mapContent: MapContent = {
		layers: [],
		features: [],
		bounding: [],
		camera: {
			center: [0, 0],
			zoom: 0,
			bearing: 0,
			pitch: 0
		},
		version: 1
	};

	$: layers = mapContent.layers;
	$: selectedLayer = state.selected.layer;

	let openSettingsLayerId: string | undefined;

	const modes = {
		select: 0,

		point: 11,
		line: 12,
		poly: 13,
		route: 14,
		bbox: 15
	};
	let mode = modes.select;

	// ------ Edition state variables ------

	// TODO colapse the root level. These can be made into different variables
	const state: EditionData = {
		selected: {
			layer: null,
			feature: null,
			controlPoint: {
				idx: null,
				isMoving: false
			},
			segmentIdx: null
		},
		drawn: {
			points: [],
			line: [],
			poly: [],
			edges: []
		},
		counters: {
			layer: 0,
			feature: 0,
			controlPoint: 0
		}
	};

	function addEmptyLayer() {
		const id = ++state.counters.layer + '';
		const newLayer = {
			id,
			features: [],
			spec: {
				points: {},
				lines: {},
				polys: {}
			},
			visible: true
		};

		layers.push(newLayer);
		map.addLayer(id, newLayer.spec);
		layers = layers;
	}

	function deleteLayer(layer: Layer) {
		mapContent.layers = mapContent.layers.filter((l) => l.id !== layer.id);
		if (state.selected.feature) {
			for (const feature of layer.features) {
				if (state.selected.feature.id === feature.id) {
					state.selected.feature = null;
					unselectFeature();
					break;
				}
			}
		}
		if (state.selected?.layer?.id === layer.id) {
			state.selected.layer = layers[0];
		}
		// Delete layer features
		map.deleteLayer(layer.id);
	}

	function newControlPoint(coords: [number, number]): number {
		const idx = state.counters.controlPoint++;
		state.drawn.points.push({ idx, coords });
		return idx;
	}

	function compileAndUpdateMapContent(content: MapContent) {
		content.layers.forEach((layer) => {
			map.updateLayerFeatures(layer.id, compileLayerFeatures(layer.features));
		});
	}

	function selectFeature(featureId: FeatureId) {
		const feature = layers.flatMap((l) => l.features).find((f) => f.id === featureId);
		unselectFeature();
		state.selected.feature = feature;

		switch (feature.type) {
			case 'point':
				newControlPoint(feature.loc);
				break;
			case 'line':
				feature.line.forEach((coords) => {
					state.drawn.line.push(newControlPoint(coords));
				});
				break;
			case 'route':
				let segmentCnt = 0;

				feature.edges.forEach((edge) => {
					let isFirstPoint = true;
					let lastControlPoint: ControlPointIdx | null = null;
					const controlPoints: ControlPointIdx[] = [];

					if (edge.type == 'string') {
						edge.line.forEach((coords) => {
							if (isFirstPoint) {
								if (!lastControlPoint) {
									lastControlPoint = newControlPoint(coords);
									controlPoints.push(lastControlPoint);
									state.drawn.line.push(lastControlPoint);
								}
							} else {
								lastControlPoint = newControlPoint(coords);
								controlPoints.push(lastControlPoint);
								state.drawn.line.push(lastControlPoint);
							}
							isFirstPoint = false;
						});
						state.drawn.edges.push({
							type: 'string',
							line: controlPoints
						});
					} else if (edge.type == 'snapped') {
						let firstWaypoint = true;
						edge.waypoints.forEach((coords) => {
							if (!(firstWaypoint && lastControlPoint)) {
								lastControlPoint = newControlPoint(coords);
							}
							controlPoints.push(lastControlPoint);
							firstWaypoint = false;
							isFirstPoint = false;
						});

						state.drawn.edges.push({
							type: 'snapped',
							waypoints: controlPoints,
							polyline: edge.polyline
						});
					}
					segmentCnt++;
				});
				break;
			case 'poly':
				feature.incl.forEach((coords) => {
					let cpId = newControlPoint(coords);
					state.drawn.line.push(cpId);
					state.drawn.poly.push(cpId);
				});
				break;
			default:
				return;
		}
		drawControlFeatures();
	}

	function unselectFeature() {
		state.selected.feature = null;
		state.selected.controlPoint.idx = null;
		state.selected.controlPoint.isMoving = false;
		state.selected.segmentIdx = null;
		state.drawn = { points: [], line: [], poly: [], edges: [] };
		state.counters.controlPoint = 0;
		map.clearEditData();
	}

	function updateSelectedControlPointPosition(newCoords) {
		if (state.selected.controlPoint.idx === null) {
			console.error('Attempted to move without a selected control point');
			return;
		}

		state.drawn.points[state.selected.controlPoint.idx].coords = newCoords;

		// Any edge that has this point as a waypoint should be updated
		state.drawn.edges.forEach((edge) => {
			if (edge.type == 'snapped') {
				if (edge.waypoints.includes(state.selected.controlPoint.idx)) {
					updateEdgePolyline(edge);
				}
			}
		});
		drawControlFeatures();
	}

	function drawControlFeatures() {
		const line = state.drawn.line.map((idx) => state.drawn.points[idx].coords);
		let poly = state.drawn.poly.map((idx) => state.drawn.points[idx].coords);

		if (state.drawn.poly.length > 2) {
			poly.push(state.drawn.points[state.drawn.poly[0]].coords);
		} else {
			poly = [];
		}

		const lines = [line];
		state.drawn.edges.forEach((edge) => {
			if (edge.type == 'string') {
				lines.push(edge.line.map((id) => state.drawn.points[id].coords));
			} else if (edge.type == 'snapped') {
				if (edge.polyline) {
					lines.push(polyline.decode(edge.polyline, 6).map((coords) => [coords[1], coords[0]]));
				}
			}
		});

		map.drawControlFeatures(state.drawn.points, lines, [poly]);
	}

	function finishEdition() {
		if (!selectedLayer) {
			console.log('No selected layer. This is a bug');
			return;
		}

		if (state.selected.feature) {
			switch (state.selected.feature.type) {
				case 'point':
					state.selected.feature.loc = state.drawn.points[0].coords;
					break;
				case 'line':
					state.selected.feature.line = state.drawn.line.map((id) => state.drawn.points[id].coords);
					break;
				case 'route':
					state.selected.feature.edges = state.drawn.edges.map((edge) => {
						if (edge.type == 'string') {
							return {
								type: 'string',
								line: edge.line.map((id) => state.drawn.points[id].coords)
							};
						} else if (edge.type == 'snapped') {
							return {
								type: 'snapped',
								waypoints: edge.waypoints.map((id) => state.drawn.points[id].coords),
								polyline: edge.polyline
							};
						}
					});
					break;
				case 'poly':
					state.selected.feature.incl = state.drawn.poly.map((id) => state.drawn.points[id].coords);
					break;
				default:
					console.error('Bug: Unknown feature type');
			}
		} else {
			switch (mode) {
				case modes.point:
					selectedLayer.features.push({
						id: ++state.counters.feature,
						type: 'point',
						loc: state.drawn.points[0].coords
					});
					break;
				case modes.line:
					if (state.drawn.line.length > 1) {
						selectedLayer.features.push({
							id: ++state.counters.feature,
							type: 'line',
							line: state.drawn.line.map((id) => state.drawn.points[id].coords)
						});
					}
					break;
				case modes.route:
					state.drawn.edges.map((edge) => {
						if (edge.type == 'string') {
							if (edge.line.length > 1) {
								selectedLayer.features.push({
									id: ++state.counters.feature,
									type: 'route',
									edges: [
										{
											type: 'string',
											line: edge.line.map((id) => state.drawn.points[id].coords)
										}
									]
								});
							} else {
								toast('Rota sem comprimento', 'warning');
							}
						} else if (edge.type == 'snapped') {
							if (edge.waypoints.length > 1) {
								selectedLayer.features.push({
									id: ++state.counters.feature,
									type: 'route',
									edges: [
										{
											type: 'snapped',
											waypoints: edge.waypoints.map((id) => state.drawn.points[id].coords),
											polyline: edge.polyline
										}
									]
								});
							} else {
								toast('Rota sem comprimento', 'warning');
							}
						}
					});
					break;
				case modes.poly:
					if (state.drawn.poly.length > 2) {
						state.drawn.poly.push(state.drawn.poly[0]);
						selectedLayer.features.push({
							id: ++state.counters.feature,
							type: 'poly',
							incl: state.drawn.poly.map((id) => state.drawn.points[id].coords),
							excl: []
						});
					}
					break;
			}
		}

		map.updateLayerFeatures(selectedLayer.id, compileLayerFeatures(selectedLayer.features));

		unselectFeature();
		mode = modes.select;
		layers = layers;
	}

	function handleMapClick(e) {
		const lngLat = e.detail.lngLat;
		switch (mode) {
			case modes.point:
				newControlPoint([lngLat.lng, lngLat.lat]);
				break;
			case modes.line:
				state.drawn.line.push(newControlPoint([lngLat.lng, lngLat.lat]));
				break;
			case modes.route:
				const lastEdge = state.drawn.edges[state.drawn.edges.length - 1];
				if (lastEdge?.type == 'string') {
					lastEdge.line.push(newControlPoint([lngLat.lng, lngLat.lat]));
				} else if (lastEdge?.type == 'snapped') {
					lastEdge.waypoints.push(newControlPoint([lngLat.lng, lngLat.lat]));
					updateEdgePolyline(lastEdge);
				} else {
					state.drawn.edges.push({
						type: 'snapped',
						waypoints: [newControlPoint([lngLat.lng, lngLat.lat])]
					});
				}

				break;
			case modes.poly:
				const cp = newControlPoint([lngLat.lng, lngLat.lat]);
				state.drawn.line.push(cp);
				state.drawn.poly.push(cp);
				break;
		}
		drawControlFeatures();
	}

	function updateEdgePolyline(edge: SnappedEdgeEdit) {
		if (edge.waypoints.length < 2) {
			console.error('Bug: Edge with less than 2 waypoints');
			return;
		}
		const throughPoints = structuredClone(
			edge.waypoints.map((idx) => state.drawn.points[idx].coords)
		);

		getRouteThrough(throughPoints, {
			onSuccess: (data) => {
				const current = edge.waypoints.map((idx) => state.drawn.points[idx]?.coords);
				// If this result is still valid
				if (isDeepEqual(throughPoints, current)) {
					edge.polyline = data.routes[0].geometry;
					drawControlFeatures();
				}
			},
			onError: (err) => {
				toast('Problema a calcular a rota', 'error');
			},
			toJson: true
		});
	}

	function handleFeatureClick(e) {
		selectFeature(e.detail.feature.id);
	}

	function onMapLoad() {
		mapLoaded = true;
		// This is test data. Delete me later
		loadData(demoMapContent);
	}

	function handleKeyboard(e) {
		// If enter is pressed
		if (e.key === 'Enter') {
			finishEdition();
		} else if (e.key === 'Escape') {
			unselectFeature();
			mode = modes.select;
		}
	}

	async function loadData(content: MapContent) {
		unselectFeature();
		state.selected.layer = null;
		state.counters.layer = 0;
		state.counters.feature = 0;
		mapContent = content;
		await tick();

		content.layers.forEach((layer) => {
			layer.id = ++state.counters.layer + '';
			layer.visible = true;
			layer.features.forEach((feature) => {
				feature.id = ++state.counters.feature;
			});
			map.addLayer(layer.id, layer.spec);
		});
		state.selected.layer = layers[0];
		compileAndUpdateMapContent(content);
	}

	function handleSpecChange(e) {
		const layer = e.detail.layer;
		map.updateLayerSpec(layer.id, layer.spec);
	}

	function handleVisibilityToggle(layer) {
		map.setLayerVisibility(layer.id, layer.visible);
	}

	function handleDeleteFeature(e) {
		const layer = e.detail.layer;
		map.updateLayerFeatures(layer.id, compileLayerFeatures(layer.features));
	}
</script>

<svelte:window on:keydown={handleKeyboard} />

<Map
	bind:this={map}
	on:mapload={onMapLoad}
	on:mapclick={handleMapClick}
	on:featureclick={handleFeatureClick}
	on:controlselect={(e) => {
		state.selected.controlPoint = {
			idx: e.detail.id,
			isMoving: false
		};
	}}
	on:controlmove={({ detail }) => {
		state.selected.controlPoint.isMoving = true;
		updateSelectedControlPointPosition(detail.coords);
	}}
	on:controlendmove={({ detail }) => {
		//
	}}
>
	<div class="absolute right-0 z-10 flex flex-col justify-start py-3 transition w-96">
		<div class="max-h-full rounded-l-xl shadow-lg flex flex-col border-2 bg-base-200">
			{#each mapContent.layers as layer}
				<div class="flex flex-col gap-2 p-2 rounded-md">
					<div class="flex gap-2 items-center">
						<label class="flex items-center grow gap-2">
							<span
								class="px-2 rounded-md"
								class:bg-primary={selectedLayer?.id == layer.id}
								class:text-primary-content={selectedLayer?.id == layer.id}
								class:bg-base-300={selectedLayer?.id != layer.id}>{layer.id}</span
							>
							<input
								type="radio"
								name="layers"
								value={layer}
								class="radio radio-sm"
								bind:group={state.selected.layer}
							/>
							<span class="font-bold">{layer.name ?? 'Sem nome'}</span>
						</label>
						<button
							class="btn btn-error btn-xs"
							on:click={() => {
								deleteLayer(layer);
							}}>-</button
						>
					</div>
					<div class="flex items-center gap-2 ml-2">
						<label class="flex items-center gap-1">
							<input
								type="checkbox"
								class="checkbox checkbox-sm"
								bind:checked={layer.visible}
								on:change={() => {
									handleVisibilityToggle(layer);
								}}
							/>
							<span>Visível</span>
						</label>
						<span class="grow text-right">{layer.features.length} objetos</span>
						<button
							class="btn btn-neutral btn-outline btn-xs"
							on:click={() => {
								openSettingsLayerId = layer.id;
							}}>Edit</button
						>
						<button class="btn btn-neutral btn-outline btn-xs">⬆</button>
						<button class="btn btn-neutral btn-outline btn-xs">⬇</button>
					</div>
				</div>

				{#if openSettingsLayerId && openSettingsLayerId == layer.id}
					<div class="bg-white">
						<LayerSettings
							bind:layer
							on:change={handleSpecChange}
							on:featuredelete={handleDeleteFeature}
						/>
						<div class="flex justify-end">
							<button
								class="btn btn-primary btn-sm btn-outline my-2"
								on:click={() => {
									openSettingsLayerId = undefined;
								}}>Guardar</button
							>
						</div>
						<hr />
					</div>
				{/if}
			{/each}
			<span class="grow"></span>
			<button class="btn btn-primary btn-md rounded-r-none" on:click={addEmptyLayer}
				>Nova camada</button
			>
		</div>
	</div>

	<div class="absolute left-0 z-10 p-3 flex gap-2 bg-white rounded-br-md">
		<span>{state.selected.featureId ? 'A editar' : 'Inserir'}</span>
		<button
			class="btn btn-xs"
			class:btn-primary={mode === modes.point}
			on:click={() => {
				unselectFeature();
				mode = modes.point;
			}}>Ponto</button
		>
		<button
			class="btn btn-xs"
			class:btn-primary={mode === modes.line}
			on:click={() => {
				unselectFeature();
				mode = modes.line;
			}}>Linha</button
		>
		<button
			class="btn btn-xs"
			class:btn-primary={mode === modes.route}
			on:click={() => {
				unselectFeature();
				mode = modes.route;
			}}>Caminho</button
		>
		<button
			class="btn btn-xs"
			class:btn-primary={mode === modes.poly}
			on:click={() => {
				unselectFeature();
				mode = modes.poly;
			}}>Poligono</button
		>
		<button class="btn btn-xs">BBOX</button>
	</div>

	<div class="absolute left-0 bottom-0 z-10 p-3 flex gap-2 bg-white rounded-br-md">
		<textarea class="w-96 h-96">{JSON.stringify(state.selected?.layer, null, 2)}</textarea>
		<textarea class="w-96 h-96">{JSON.stringify(layers, null, 2)}</textarea>
	</div>
</Map>
