<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import polyline from '@mapbox/polyline';
	import * as turf from '@turf/turf';
	import MapContent from '$lib/content/MapContent.svelte';
	import { getRouteThrough } from '$lib/api';
	import { toast } from '$lib/stores';
	import { isDeepEqual } from '$lib/utils';
	import Icon from '$lib/components/Icon.svelte';
	import {
		compileLayerFeatures,
		defaultLayerSpec,
		defaultMapContent,
		isMapContentValid,
		parseMapContent
	} from './utils';
	import Map from './EditorMap.svelte';
	import LayerSettings from './EditorLayerSettings.svelte';

	const dispatch = createEventDispatcher();

	let map: Map;
	let mapLoaded = false;

	let content: MapContent = defaultMapContent();
	export let canEdit = false;

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
		boundary: [],
		line: [],
		poly: [],
		edges: []
	};
	const counters: EditorCounter = {
		layer: 0,
		feature: 0,
		controlPoint: 0,
		boundary: 0
	};

	let importDialog;
	let importData = '';
	$: contentPendingImport = parseMapContent(importData);

	export function getContent() {
		return structuredClone(content);
	}

	function addEmptyLayer() {
		const id = ++counters.layer + '';
		const newLayer = {
			id,
			features: [],
			spec: defaultLayerSpec(),
			visible: true
		};

		content.layers.push(newLayer);
		map.addLayer(id, newLayer.spec);
		content = content;

		if (!selected.layer) {
			selected.layer = content.layers[0];
		}
	}

	function deleteLayer(layer: Layer) {
		content.layers = content.layers.filter((l) => l.id !== layer.id);
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
			selected.layer = content.layers[0];
		}
		// Delete layer features
		map.deleteLayer(layer.id);
	}

	function newControlPoint(coords: [number, number]): number {
		const idx = counters.controlPoint++;
		drawn.points.push({ idx, coords });
		return idx;
	}

	function newBoundaryControlPoint(coords: [number, number]): number {
		const idx = counters.boundary++;
		drawn.boundary.push({ idx, coords });
		return idx;
	}

	function selectFeature(featureId: FeatureId) {
		const feature = content.layers.flatMap((l) => l.features).find((f) => f.id === featureId);
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
						if (!firstWaypoint) {
							const next = newControlPoint(coords);
							drawn.midpoints.push({ cp1: lastControlPoint, cp2: next });
							lastControlPoint = next;
						} else {
							controlPoints.push(newControlPoint(coords));
							firstWaypoint = false;
							isFirstPoint = false;
						}
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
		drawn.points = [];
		drawn.midpoints = [];
		drawn.line = [];
		drawn.poly = [];
		drawn.edges = [];
		counters.controlPoint = 0;
		map.clearEditData();
	}

	function updateControlPointPosition(e) {
		let idx;
		if (e.detail.idx != undefined) {
			idx = e.detail.idx;
		} else {
			idx = selected.controlPoint.idx;
		}

		const newCoords = e.detail.coords;

		if (!idx === null) {
			console.error('Attempted to move without a selected control point');
			return;
		}

		drawn.points[idx].coords = newCoords;

		// Any edge that has this point as a waypoint should be updated
		drawn.edges.forEach((edge) => {
			if (edge.type == 'snapped') {
				if (edge.waypoints.includes(idx)) {
					updateEdgePolyline(edge);
				}
			}
		});
		drawControlFeatures();
	}

	function updateBoundaryPointPosition(e) {
		let idx = e.detail.idx;
		const newCoords = e.detail.coords;

		drawn.boundary[idx].coords = newCoords;
		triggerBoundaryChange();
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
		if (!selected.layer && mode != modes.bbox) {
			toast('Nenhuma camada selecionada', 'error');
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
		content.layers = content.layers;
		dispatch('change');
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
		} else if (mode == modes.bbox) {
			newBoundaryControlPoint([lngLat.lng, lngLat.lat]);
			triggerBoundaryChange();
		}

		drawControlFeatures();
	}

	function triggerBoundaryChange() {
		optimizeBoundary();
		map.drawBoundaryFeatures(drawn.boundary);
		dispatch('change');
	}

	function optimizeBoundary() {
		if (drawn.boundary.length > 3) {
			const coords = drawn.boundary.map((point) => point.coords);
			const convexHull = turf.convex(turf.multiPoint(coords));

			drawn.boundary = [];
			counters.boundary = 0;
			convexHull.geometry.coordinates[0].forEach((coords) => {
				newBoundaryControlPoint(coords);
			});
		}
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
		if (canEdit) {
			selectFeature(e.detail.feature.id);
		}
	}

	function handleControlSelect(e) {
		selected.controlPoint = {
			idx: e.detail.idx,
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
		selected.controlPoint = { idx: cp, isMoving: true };

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

		loadData(content);

		dispatch('load');
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

	export function loadData(content: MapContent) {
		unselectFeature();
		selected.layer = null;
		counters.layer = 0;
		counters.feature = 0;
		map.deleteAllLayers();

		content = content;

		content.layers.forEach((layer) => {
			layer.id = ++counters.layer + '';
			layer.visible = true;
			layer.features.forEach((feature) => {
				feature.id = ++counters.feature;
			});
			layer = layer;
			map.addLayer(layer.id, layer.spec);
			map.updateLayerFeatures(layer.id, compileLayerFeatures(layer.features));
		});
		selected.layer = content.layers[0];
	}

	function handleSpecChange(e) {
		const layer = e.detail.layer;
		map.updateLayerSpec(layer.id, layer.spec);
	}

	function handleVisibilityToggle(layer) {
		map.setLayerVisibility(layer.id, layer.visible);
	}

	function layerUp(i) {
		if (i > 0) {
			const layer = content.layers[i];
			content.layers[i] = content.layers[i - 1];
			content.layers[i - 1] = layer;
			content = content;
		}
	}

	function layerDown(i) {
		if (i < content.layers.length - 1) {
			const layer = content.layers[i];
			content.layers[i] = content.layers[i + 1];
			content.layers[i + 1] = layer;
			content = content;
		}
	}

	function handleDeleteFeature(e) {
		const layer = e.detail.layer;
		map.updateLayerFeatures(layer.id, compileLayerFeatures(layer.features));
	}

	function preview() {
		map.fitToPoints(drawn.boundary.map((point) => point.coords));
	}

	function handleImport() {
		importDialog.showModal();
	}

	function handleImport2() {
		const data = JSON.parse(importData);
		loadData(data);
		importDialog.close();
	}

	function handleExport() {
		const data = JSON.stringify(content);
		navigator.clipboard.writeText(data);
		toast('Conteúdo copiado', 'info');
	}
</script>

<svelte:window on:keydown={handleKeyboard} />

<Map
	bind:this={map}
	on:mapload={onMapLoad}
	on:mapclick={handleMapClick}
	on:featureclick={handleFeatureClick}
	on:controlselect={handleControlSelect}
	on:midpointselect={handleMidpointSelect}
	on:controlmove={updateControlPointPosition}
	on:controlselectend={() => {
		selected.controlPoint.idx = null;
	}}
	on:controlendmove={() => {
		selected.controlPoint.isMoving = false;
	}}
	on:boundarymove={updateBoundaryPointPosition}
	on:boundaryselectend={triggerBoundaryChange}
>
	<div class="absolute right-0 z-10 flex flex-col justify-start py-3 transition w-96">
		<div
			class="max-h-full rounded-l-xl shadow-lg flex flex-col border-2 bg-base-200"
			class:hidden={!canEdit}
		>
			{#each content.layers as layer, i}
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
						<button
							class="btn btn-neutral btn-outline btn-xs"
							class:hidden={i == 0}
							on:click={() => layerUp(i)}>⬆</button
						>
						<button
							class="btn btn-neutral btn-outline btn-xs"
							class:hidden={i == content.layers.length - 1}
							on:click={() => layerDown(i)}>⬇</button
						>
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

	<div class="absolute left-0 z-10 p-3 bg-white rounded-br-md">
		<span class="text-lg font-bold"
			>{canEdit ? (selected.feature ? 'Alteração' : 'Criação') : 'Visualização'}</span
		>
	</div>
	<div
		class="absolute left-0 bottom-0 z-10 p-1 flex flex-col gap-2 bg-white rounded-tr-lg shadow-lg"
		class:hidden={!canEdit}
	>
		<button
			class="btn btn-outline"
			class:btn-outline={mode !== modes.point}
			class:btn-primary={mode === modes.point}
			on:click={() => {
				unselectFeature();
				mode = modes.point;
			}}>Ponto</button
		>
		<button
			class="btn btn-outline"
			class:btn-outline={mode !== modes.line}
			class:btn-primary={mode === modes.line}
			on:click={() => {
				unselectFeature();
				mode = modes.line;
			}}>Linha</button
		>
		<button
			class="btn btn-outline"
			class:btn-outline={mode !== modes.route}
			class:btn-primary={mode === modes.route}
			on:click={() => {
				unselectFeature();
				mode = modes.route;
			}}>Caminho</button
		>
		<button
			class="btn"
			class:btn-outline={mode !== modes.poly}
			class:btn-primary={mode === modes.poly}
			on:click={() => {
				unselectFeature();
				mode = modes.poly;
			}}>Poligono</button
		>
		<button
			class="btn btn-outline"
			class:btn-outline={mode !== modes.bbox}
			class:btn-primary={mode === modes.bbox}
			on:click={() => {
				unselectFeature();
				mode = modes.bbox;
			}}>Janela</button
		>
	</div>
	<div class="absolute right-2 bottom-2 z-10 flex gap-2 items-end">
		<button
			class="btn btn-xs !btn-primary"
			class:btn-primary={mode === modes.point}
			class:hidden={!canEdit}
			on:click={handleImport}>Importar</button
		>
		<button
			class="btn btn-xs !btn-primary"
			class:btn-primary={mode === modes.point}
			class:hidden={!canEdit}
			on:click={handleExport}>Exportar</button
		>
		<button
			class="btn btn-sm !btn-primary"
			class:btn-primary={mode === modes.point}
			on:click={preview}>Ajustar</button
		>
	</div>
	<slot />
</Map>

<dialog bind:this={importDialog} class="modal modal-bottom sm:modal-middle">
	<div class="modal-box relative">
		<form method="dialog">
			<button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
				<Icon name="close" class="h-4 stroke-current" />
			</button>
		</form>
		<h3 class="font-bold text-lg">Valor</h3>
		<textarea
			class="w-full h-32 textarea textarea-bordered"
			class:textarea-error={!contentPendingImport}
			bind:value={importData}
		></textarea>
		<div class="flex justify-end">
			<button class="btn btn-primary" disabled={!contentPendingImport} on:click={handleImport2}
				>Importar</button
			>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
