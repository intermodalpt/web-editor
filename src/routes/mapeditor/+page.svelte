<script lang="ts">
	import { tick } from 'svelte';
	import polyline from '@mapbox/polyline';
	import * as turf from '@turf/turf';
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
	const selected: EditorSelection = {
		layer: null,
		feature: null,
		controlPoint: {
			idx: null,
			isMoving: false
		},
		segmentIdx: null
	};
	let drawn: EditorDrawings = {
		points: [],
		midpoints: [],
		line: [],
		poly: [],
		edges: []
	};
	const counters: EditorCounter = {
		layer: 0,
		feature: 0,
		controlPoint: 0
	};

	function addEmptyLayer() {
		const id = ++counters.layer + '';
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

		mapContent.layers.push(newLayer);
		map.addLayer(id, newLayer.spec);
		mapContent = mapContent;
	}

	function deleteLayer(layer: Layer) {
		mapContent.layers = mapContent.layers.filter((l) => l.id !== layer.id);
		if (selected.feature) {
			for (const feature of layer.features) {
				if (selected.feature.id === feature.id) {
					selected.feature = null;
					unselectFeature();
					break;
				}
			}
		}
		if (selected?.layer?.id === layer.id) {
			selected.layer = mapContent.layers[0];
		}
		// Delete layer features
		map.deleteLayer(layer.id);
	}

	function newControlPoint(coords: [number, number]): number {
		const idx = counters.controlPoint++;
		drawn.points.push({ idx, coords });
		return idx;
	}

	function compileAndUpdateMapContent(content: MapContent) {
		content.layers.forEach((layer) => {
			map.updateLayerFeatures(layer.id, compileLayerFeatures(layer.features));
		});
	}

	function selectFeature(featureId: FeatureId) {
		const feature = mapContent.layers.flatMap((l) => l.features).find((f) => f.id === featureId);
		unselectFeature();
		selected.feature = feature;

		if (feature.type == 'point') {
			newControlPoint(feature.loc);
		} else if (feature.type == 'line') {
			let isFirst = true;
			feature.line.forEach((coords) => {
				const cp = newControlPoint(coords);
				if (!isFirst) {
					const last = drawn.line[drawn.line.length - 1];
					drawn.midpoints.push({ cp1: last, cp2: cp });
				}
				drawn.line.push(cp);
				isFirst = false;
			});
		} else if (feature.type == 'route') {
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
								drawn.line.push(lastControlPoint);
							}
						} else {
							lastControlPoint = newControlPoint(coords);
							drawn.midpoints.push({ cp1: lastControlPoint - 1, cp2: lastControlPoint });
							controlPoints.push(lastControlPoint);
							drawn.line.push(lastControlPoint);
						}
						isFirstPoint = false;
					});
					drawn.edges.push({
						type: 'string',
						line: controlPoints
					});
				} else if (edge.type == 'snapped') {
					let firstWaypoint = true;
					edge.waypoints.forEach((coords) => {
						if (!(firstWaypoint && lastControlPoint)) {
							lastControlPoint = newControlPoint(coords);
							drawn.midpoints.push({ cp1: lastControlPoint - 1, cp2: lastControlPoint });
						}
						controlPoints.push(lastControlPoint);
						firstWaypoint = false;
						isFirstPoint = false;
					});

					drawn.edges.push({
						type: 'snapped',
						waypoints: controlPoints,
						polyline: edge.polyline
					});
				}
				segmentCnt++;
			});
		} else if (feature.type == 'poly') {
			feature.incl.forEach((coords) => {
				let cp = newControlPoint(coords);
				if (drawn.poly.length > 0) {
					const last = drawn.poly[drawn.poly.length - 1];
					drawn.midpoints.push({ cp1: last, cp2: cp });
				}
				drawn.line.push(cp);
				drawn.poly.push(cp);
			});
		} else {
			return;
		}
		drawControlFeatures();
	}

	function unselectFeature() {
		selected.feature = null;
		selected.controlPoint.idx = null;
		selected.controlPoint.isMoving = false;
		selected.segmentIdx = null;
		drawn = { points: [], midpoints: [], line: [], poly: [], edges: [] };
		counters.controlPoint = 0;
		map.clearEditData();
	}

	function updateSelectedControlPointPosition(newCoords) {
		if (selected.controlPoint.idx === null) {
			console.error('Attempted to move without a selected control point');
			return;
		}

		drawn.points[selected.controlPoint.idx].coords = newCoords;

		// Any edge that has this point as a waypoint should be updated
		drawn.edges.forEach((edge) => {
			if (edge.type == 'snapped') {
				if (edge.waypoints.includes(selected.controlPoint.idx)) {
					updateEdgePolyline(edge);
				}
			}
		});
		drawControlFeatures();
	}

	function drawControlFeatures() {
		const line = drawn.line.map((idx) => drawn.points[idx].coords);
		let poly = drawn.poly.map((idx) => drawn.points[idx].coords);

		const midpoints = drawn.midpoints.map((mp) => {
			return {
				cp1: mp.cp1,
				cp2: mp.cp2,
				coords: turf.midpoint(drawn.points[mp.cp1].coords, drawn.points[mp.cp2].coords).geometry
					.coordinates
			};
		});

		if (drawn.poly.length > 2) {
			poly.push(drawn.points[drawn.poly[0]].coords);
		} else {
			poly = [];
		}

		const lines = [line];
		drawn.edges.forEach((edge) => {
			if (edge.type == 'string') {
				lines.push(edge.line.map((id) => drawn.points[id].coords));
			} else if (edge.type == 'snapped') {
				if (edge.polyline) {
					lines.push(polyline.decode(edge.polyline, 6).map((coords) => [coords[1], coords[0]]));
				}
			}
		});

		map.drawControlFeatures(drawn.points, midpoints, lines, [poly]);
	}

	function finishEdition() {
		if (!selected.layer) {
			console.log('No selected layer. This is a bug');
			return;
		}

		if (selected.feature) {
			// Updating
			switch (selected.feature.type) {
				case 'point':
					selected.feature.loc = drawn.points[0].coords;
					break;
				case 'line':
					selected.feature.line = drawn.line.map((id) => drawn.points[id].coords);
					break;
				case 'route':
					selected.feature.edges = drawn.edges.map((edge) => {
						if (edge.type == 'string') {
							return {
								type: 'string',
								line: edge.line.map((id) => drawn.points[id].coords)
							};
						} else if (edge.type == 'snapped') {
							return {
								type: 'snapped',
								waypoints: edge.waypoints.map((id) => drawn.points[id].coords),
								polyline: edge.polyline
							};
						}
					});
					break;
				case 'poly':
					selected.feature.incl = drawn.poly.map((id) => drawn.points[id].coords);
					break;
				default:
					console.error('Bug: Unknown feature type');
			}
		} else {
			// Inserting
			switch (mode) {
				case modes.point:
					drawn.points.forEach((point) => {
						selected.layer.features.push({
							id: ++counters.feature,
							type: 'point',
							loc: point.coords
						});
					});
					break;
				case modes.line:
					if (drawn.line.length > 1) {
						selected.layer.features.push({
							id: ++counters.feature,
							type: 'line',
							line: drawn.line.map((id) => drawn.points[id].coords)
						});
					}
					break;
				case modes.route:
					drawn.edges.map((edge) => {
						if (edge.type == 'string') {
							if (edge.line.length > 1) {
								selected.layer.features.push({
									id: ++counters.feature,
									type: 'route',
									edges: [
										{
											type: 'string',
											line: edge.line.map((id) => drawn.points[id].coords)
										}
									]
								});
							} else {
								toast('Rota sem comprimento', 'warning');
							}
						} else if (edge.type == 'snapped') {
							if (edge.waypoints.length > 1) {
								selected.layer.features.push({
									id: ++counters.feature,
									type: 'route',
									edges: [
										{
											type: 'snapped',
											waypoints: edge.waypoints.map((id) => drawn.points[id].coords),
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
					if (drawn.poly.length > 2) {
						drawn.poly.push(drawn.poly[0]);
						selected.layer.features.push({
							id: ++counters.feature,
							type: 'poly',
							incl: drawn.poly.map((id) => drawn.points[id].coords),
							excl: []
						});
					}
					break;
			}
		}

		map.updateLayerFeatures(selected.layer.id, compileLayerFeatures(selected.layer.features));

		unselectFeature();
		mode = modes.select;
		mapContent.layers = mapContent.layers;
	}

	function handleMapClick(e) {
		const lngLat = e.detail.lngLat;

		if (mode == modes.point) {
			newControlPoint([lngLat.lng, lngLat.lat]);
		} else if (mode == modes.line) {
			const cp = newControlPoint([lngLat.lng, lngLat.lat]);
			if (drawn.line.length > 0) {
				const last = drawn.line[drawn.line.length - 1];
				drawn.midpoints.push({ cp1: last, cp2: cp });
			}
			drawn.line.push(cp);
		} else if (mode == modes.route) {
			const lastEdge = drawn.edges[drawn.edges.length - 1];
			const cp = newControlPoint([lngLat.lng, lngLat.lat]);
			if (lastEdge?.type == 'string') {
				if (lastEdge.line.length > 0) {
					const last = lastEdge.line[lastEdge.line.length - 1];
					drawn.midpoints.push({ cp1: last, cp2: cp });
				}
				lastEdge.line.push(cp);
			} else if (lastEdge?.type == 'snapped') {
				if (lastEdge.waypoints.length > 0) {
					const last = lastEdge.waypoints[lastEdge.waypoints.length - 1];
					drawn.midpoints.push({ cp1: last, cp2: cp });
				}
				lastEdge.waypoints.push(cp);
				updateEdgePolyline(lastEdge);
			} else {
				drawn.edges.push({
					type: 'snapped',
					waypoints: [cp]
				});
			}
		} else if (mode == modes.poly) {
			const cp = newControlPoint([lngLat.lng, lngLat.lat]);

			if (drawn.points.length > 1) {
				const last = drawn.poly[drawn.poly.length - 1];
				drawn.midpoints.push({ cp1: last, cp2: cp });
			}

			drawn.line.push(cp);
			drawn.poly.push(cp);
		}

		drawControlFeatures();
	}

	function updateEdgePolyline(edge: SnappedEdgeEdit) {
		if (edge.waypoints.length < 2) {
			console.error('Bug: Edge with less than 2 waypoints');
			return;
		}
		const throughPoints = structuredClone(edge.waypoints.map((idx) => drawn.points[idx].coords));

		getRouteThrough(throughPoints, {
			onSuccess: (data) => {
				const current = edge.waypoints.map((idx) => drawn.points[idx]?.coords);
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

	function handleControlSelect(e) {
		selected.controlPoint = {
			idx: e.detail.id,
			isMoving: false
		};
	}

	function handleMidpointSelect(e) {
		// Parents
		const cp1 = e.detail.cp1;
		const cp2 = e.detail.cp2;

		// Midpoint
		const mp = turf.midpoint(drawn.points[cp1].coords, drawn.points[cp2].coords).geometry
			.coordinates;
		const cp = newControlPoint(mp);
		selected.controlPoint = {
			idx: cp,
			isMoving: false
		};

		const lineIndex = drawn.line.findIndex((idx) => idx === cp1);
		if (lineIndex !== -1) {
			drawn.line.splice(lineIndex + 1, 0, cp);

			drawn.midpoints.push({ cp1: cp1, cp2: cp });
			drawn.midpoints.push({ cp1: cp, cp2: cp2 });
		}

		const polyIndex = drawn.poly.findIndex((idx) => idx === cp1);
		if (polyIndex !== -1) {
			drawn.poly.splice(polyIndex + 1, 0, cp);
			if (polyIndex != lineIndex) {
				console.error('Bug: Midpoint in a poly but not in a line');
				return;
			}
		}

		for (const edge of drawn.edges) {
			if (edge.type == 'string') {
				const edgeIndex = edge.line.findIndex((idx) => idx === cp1);
				if (edgeIndex !== -1) {
					edge.line.splice(edgeIndex + 1, 0, cp);
					drawn.midpoints.push({ cp1: cp1, cp2: cp });
					drawn.midpoints.push({ cp1: cp, cp2: cp2 });
				}
			} else if (edge.type == 'snapped') {
				const edgeIndex = edge.waypoints.findIndex((idx) => idx === cp1);
				if (edgeIndex !== -1) {
					edge.waypoints.splice(edgeIndex + 1, 0, cp);
					updateEdgePolyline(edge);
					drawn.midpoints.push({ cp1: cp1, cp2: cp });
					drawn.midpoints.push({ cp1: cp, cp2: cp2 });
				}
			}
		}

		// Delete the midpoint
		drawn.midpoints = drawn.midpoints.filter((mp) => !(mp.cp1 == cp1 && mp.cp2 == cp2));
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
		selected.layer = null;
		counters.layer = 0;
		counters.feature = 0;
		mapContent = content;
		await tick();

		content.layers.forEach((layer) => {
			layer.id = ++counters.layer + '';
			layer.visible = true;
			layer.features.forEach((feature) => {
				feature.id = ++counters.feature;
			});
			layer = layer;
			map.addLayer(layer.id, layer.spec);
		});
		selected.layer = mapContent.layers[0];
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
	on:midpointselect={handleMidpointSelect}
	on:controlselect={handleControlSelect}
	on:controlmove={({ detail }) => {
		selected.controlPoint.isMoving = true;
		updateSelectedControlPointPosition(detail.coords);
	}}
	on:controlendmove={() => {
		selected.controlPoint.isMoving = false;
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
								class:bg-primary={selected.layer?.id == layer.id}
								class:text-primary-content={selected.layer?.id == layer.id}
								class:bg-base-300={selected.layer?.id != layer.id}>{layer.id}</span
							>
							<input
								type="radio"
								name="layers"
								value={layer}
								class="radio radio-sm"
								bind:group={selected.layer}
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
		<span>{selected.feature ? 'A editar' : 'Inserir'}</span>
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
		<textarea class="w-96 h-96">{JSON.stringify(selected?.layer?.features, null, 2)}</textarea>
		<textarea class="w-96 h-96">{JSON.stringify(drawn, null, 2)}</textarea>
		<!-- <textarea class="w-96 h-96">{JSON.stringify(layers, null, 2)}</textarea> -->
	</div>
</Map>
