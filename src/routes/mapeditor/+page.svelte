<script lang="ts">
	import { onMount, tick } from 'svelte';
	import LayerSettings from './LayerSettings.svelte';
	import Map from './Map.svelte';
	import { demoLayer, demoMapContent } from './dummydata';
	import { compileLayerFeatures } from './utils';
	import MapContent from '$lib/content/MapContent.svelte';
	import ContentBlock from '$lib/content/ContentBlock.svelte';

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
	// $: layerIndex = Object.fromEntries(layers.map((l) => [l.id, l]));
	// $: featureIndex = Object.fromEntries(layers.flatMap((l) => l.features.map((f) => [f.id, f])));

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
			layerId: null,
			layer: null,
			featureId: null,
			feature: null,
			controlPoint: {
				id: null,
				isMoving: false
			},
			segmentIdx: null
		},
		drawn: {
			points: [],
			line: [],
			poly: []
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
		if (state.selected.layer.id === layer.id) {
			state.selected.layer = layers[0];
		}
		// Delete layer features
		map.deleteLayer(layer.id);
	}

	function newControlPoint(coords: [number, number]): number {
		const id = state.counters.controlPoint++;
		state.drawn.points.push({ id, coords });
		return id;
	}

	function compileAndUpdateMapContent(content: MapContent) {
		content.layers.forEach((layer) => {
			map.updateLayerFeatures(layer.id, compileLayerFeatures(layer.features));
		});
	}

	function selectFeature(feature: Feature) {
		console.log('selectFeature');
		unselectFeature();

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
					let lastControlPoint: ControlPointId | null = null;
					if (edge.type == 'string') {
						edge.line.forEach((coords) => {
							if (isFirstPoint) {
								if (!lastControlPoint) {
									lastControlPoint = newControlPoint(coords);
									state.drawn.line.push(lastControlPoint);
								}
							} else {
								lastControlPoint = newControlPoint(coords);
								state.drawn.line.push(lastControlPoint);
							}
							isFirstPoint = false;
						});
					} else if (edge.type == 'snapped') {
						edge.through.forEach((coords) => {
							if (isFirstPoint) {
								if (!lastControlPoint) {
									lastControlPoint = newControlPoint(coords);
									state.drawn.line.push(lastControlPoint);
								}
							} else {
								lastControlPoint = newControlPoint(coords);
								state.drawn.line.push(lastControlPoint);
							}
							isFirstPoint = false;
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
		state.selected.controlPoint.id = 0;
		state.selected.controlPoint.isMoving = false;
		state.selected.segmentIdx = null;
		state.drawn = { points: [], line: [], poly: [] };
		state.counters.controlPoint = 0;
		map.clearEditData();
	}

	function updateSelectedControlPointPosition(newCoords) {
		if (!state.selected.controlPoint.idx) {
			console.error('Attempted to move without a selected control point');
			return;
		}

		state.drawn.points[state.selected.controlPoint.idx].coords = newCoords;
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

		map.drawControlFeatures(state.drawn.points, line, [poly]);
	}

	function finishEdition() {
		if (!selectedLayer) {
			console.log('No selected layer. This is a bug');
			return;
		}

		if (state.selected.feature) {
			console.log('Updating');
			// switch (mode) {
			//     case modes.point:
			//         if (editedFeatureId) {
			//             editedFeature.geo
			//         } else {
			//             addToLayer.features.push({
			//                 type: 'Point',
			//                 coordinates: editedPoint
			//             });
			//         }
			//         break;
			//     case modes.line:
			//         if (editedLineVertices.length > 1) {
			//             selectedLayer.features.push({
			//                 type: 'LineString',
			//                 coordinates: editedLineVertices
			//             });
			//         }
			//         break;
			//     case modes.route:
			//         if (editedRouteVertices.length > 1) {
			//             selectedLayer.features.push({
			//                 type: 'LineString',
			//                 coordinates: editedRouteVertices
			//             });
			//         }
			//         break;
			//     case modes.poly:
			//         if (editedPolyVertices.length > 2) {
			//             selectedLayer.features.push({
			//                 type: 'Polygon',
			//                 coordinates: [editedPolyVertices]
			//             });
			//         }
			//         break;
			// }
		} else {
			console.log('Inserting');
			switch (mode) {
				case modes.point:
					selectedLayer.features.push({
						id: ++state.counters.feature + '',
						type: 'point',
						loc: state.drawn.points[0].coords
					});
					break;
				case modes.line:
					if (state.drawn.line.length > 1) {
						selectedLayer.features.push({
							id: ++state.counters.feature + '',
							type: 'line',
							line: state.drawn.line.map((id) => state.drawn.points[id].coords)
						});
					}
					break;
				case modes.route:
					// TODO This needs a proper implementation
					if (state.drawn.line.length > 1) {
						selectedLayer.features.push({
							id: ++state.counters.feature + '',
							type: 'line',
							line: state.drawn.line.map((id) => state.drawn.points[id].coords)
						});
					}
					break;
				case modes.poly:
					if (state.drawn.poly.length > 2) {
						state.drawn.poly.push(state.drawn.poly[0]);
						selectedLayer.features.push({
							id: ++state.counters.feature + '',
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
				state.drawn.line.push(newControlPoint([lngLat.lng, lngLat.lat]));
				break;
			case modes.poly:
				const cp = newControlPoint([lngLat.lng, lngLat.lat]);
				state.drawn.line.push(cp);
				state.drawn.poly.push(cp);
				break;
		}
		drawControlFeatures();
	}

	function handleFeatureClick(e) {
		console.log(e);
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

	onMount(() => {});
</script>

<svelte:window on:keydown={handleKeyboard} />

<Map
	bind:this={map}
	on:mapload={onMapLoad}
	on:mapclick={handleMapClick}
	on:featureclick={handleFeatureClick}
	on:controlselect={({ detail }) => {
		state.selected.controlPoint = {
			id: detail.id,
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
