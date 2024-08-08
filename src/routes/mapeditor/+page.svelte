<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import LayerSettings from './LayerSettings.svelte';
	import Map from './Map.svelte';
	import { demoLayer } from './dummydata';

	let map;

	let layerIdCounter = 1;
	let featureIdCounter = 1;

	let layers = [demoLayer];
	$: layerIndex = Object.fromEntries(layers.map((l) => [l.id, l]));
	let editedLayerId: number | undefined = 1;
	$: editedLayer = editedLayerId ? layerIndex[editedLayerId] : undefined;
	// let addToLayer: number | undefined;
	// $: addToLayer = addToLayerId ? layerIndex[addToLayerId] : addToLayerId;
	let addToLayer;

	$: features = Object.fromEntries(layers.flatMap((l) => l.features));
	let editedFeatureId;
	$: editedFeature = editedFeatureId ? features[editedFeatureId] : undefined;

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

	let editionData = {
		points: {},
		lines: [],
		poly: []
	};
	let selectedControlPointId;
	let isMovingControlPoint = false;

	let editedPoint: [number, number] | undefined = undefined;
	let editedLineVertices: [number, number][] = [];
	// lon, lat, snap to route (from previous point)
	let editedRouteVertices: [number, number, boolean][] = [];
	let editedPolyVertices: [number, number][] = [];

	function addEmptyLayer() {
		const newLayer = {
			id: ++layerIdCounter,
			features: [],
			points: {},
			line: {},
			polys: {},
			visible: true
		};
		layers.push(newLayer);
		map.addLayer(newLayer);
		layers = layers;
	}

	function deleteLayer(layer) {
		layers = layers.filter((l) => l.id !== layer.id);
		redraw();
	}

	function redraw() {
		map.redraw();
	}

	function resetEditData() {
		editionData = {
			points: {},
			line: [],
			poly: []
		};
		map.clearEditData();
	}

	function updateEditionData() {
		console.log('generateControlPoints');
		let id = 1;
		resetEditData();

		switch (mode) {
			case modes.point:
				if (editedPoint) {
					editionData.points[id] = { id, coords: editedPoint };
					id++;
				}
				break;
			case modes.line:
				editedLineVertices.forEach(([lon, lat]) => {
					editionData.points[id] = { id, coords: [lon, lat] };
					editionData.line.push(id);
					id++;
				});
				break;
			case modes.route:
				editedRouteVertices.forEach(([lon, lat, snap]) => {
					editionData.points[id] = { id, coords: [lon, lat] };
					editionData.line.push(id);
					id++;
				});
				break;
			case modes.poly:
				editedPolyVertices.forEach(([lon, lat]) => {
					editionData.points[id] = { id, coords: [lon, lat] };
					editionData.line.push(id);
					editionData.poly.push(id);
					id++;
				});
				break;
			default:
				return;
		}
		updateDrawnControlPoints();
	}

	function updateSelectedControlPointPosition(newCoords) {
		if (!selectedControlPointId) {
			console.error('Attempted to move without a selected control point');
			return;
		}
		editionData.points[selectedControlPointId].coords = newCoords;
		updateDrawnControlPoints();
	}

	function updateDrawnControlPoints() {
		console.log('updateDrawnControlPoints at', new Date().getMilliseconds());
		const points = Object.values(editionData.points);
		const line = editionData.line.map((id) => editionData.points[id].coords);
		let poly = editionData.poly.map((id) => editionData.points[id].coords);

		if (editionData.poly.length > 2) {
			poly.push(editionData.points[editionData.poly[0]].coords);
		} else {
			poly = [];
		}

		console.log(poly);

		map.setControlFeatures(points, line, [poly]);
	}

	function finishEdition() {
		if (!addToLayer) {
			console.log('No selected layer. This is a bug');
			return;
		}

		if (editedFeatureId) {
			console.log('Updating');
		} else {
			console.log('Inserting');
		}

		if (editedFeatureId) {
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
			//             editedLayer.features.push({
			//                 type: 'LineString',
			//                 coordinates: editedLineVertices
			//             });
			//         }
			//         break;
			//     case modes.route:
			//         if (editedRouteVertices.length > 1) {
			//             editedLayer.features.push({
			//                 type: 'LineString',
			//                 coordinates: editedRouteVertices
			//             });
			//         }
			//         break;
			//     case modes.poly:
			//         if (editedPolyVertices.length > 2) {
			//             editedLayer.features.push({
			//                 type: 'Polygon',
			//                 coordinates: [editedPolyVertices]
			//             });
			//         }
			//         break;
			// }
		} else {
			switch (mode) {
				case modes.point:
					addToLayer.features.push({
						id: featureIdCounter++,
						type: 'Feature',
						geometry: {
							type: 'Point',
							coordinates: editedPoint
						}
					});
					break;
				case modes.line:
					if (editedLineVertices.length > 1) {
						addToLayer.features.push({
							id: featureIdCounter++,
							type: 'Feature',
							geometry: {
								id: featureIdCounter++,
								type: 'LineString',
								coordinates: editedLineVertices
							}
						});
					}
					break;
				case modes.route:
					if (editedRouteVertices.length > 1) {
						addToLayer.features.push({
							id: featureIdCounter++,
							type: 'Feature',
							geometry: {
								id: featureIdCounter++,
								type: 'LineString',
								coordinates: editedRouteVertices
							}
						});
					}
					break;
				case modes.poly:
					if (editedPolyVertices.length > 2) {
						editedPolyVertices.push(editedPolyVertices[0]);
						addToLayer.features.push({
							id: featureIdCounter++,
							type: 'Feature',
							geometry: {
								id: featureIdCounter++,
								type: 'Polygon',
								coordinates: [editedPolyVertices]
							}
						});
					}
					break;
			}
		}

		isMovingControlPoint = false;
		resetEditData();
		redraw();
		mode = modes.select;
		layers = layers;
		console.log('finishEdition', addToLayer);
	}

	function handleMapClick(e) {
		console.log('handleMapClick', e);
		const lngLat = e.detail.lngLat;
		switch (mode) {
			case modes.point:
				editedPoint = [lngLat.lng, lngLat.lat];
				break;
			case modes.line:
				editedLineVertices.push([lngLat.lng, lngLat.lat]);
				break;
			case modes.route:
				editedRouteVertices.push([lngLat.lng, lngLat.lat, false]);
				break;
			case modes.poly:
				editedPolyVertices.push([lngLat.lng, lngLat.lat]);
				break;
		}
		updateEditionData();
	}

	function handleFeatureClick(e) {
		console.log(e);
	}

	function onMapLoad() {
		map.addLayer(demoLayer);
	}

	function handleKeyboard(e) {
		// If enter is pressed
		if (e.key === 'Enter') {
			console.log('Enter pressed');
			finishEdition();
		}
	}
</script>

<svelte:window on:keydown={handleKeyboard} />

<Map
	bind:this={map}
	on:mapload={onMapLoad}
	on:mapclick={handleMapClick}
	on:featureclick={handleFeatureClick}
	on:controlselect={({ detail }) => {
		console.log('controlselect', detail);
		selectedControlPointId = detail.id;
	}}
	on:controlmove={({ detail }) => {
		console.log('controlmove at', new Date().getMilliseconds());
		isMovingControlPoint = true;
		updateSelectedControlPointPosition(detail.coords);
	}}
	on:controlendmove={({ detail }) => {
		//
	}}
>
	<div class="absolute right-0 z-10 flex flex-col justify-center h-full py-3 transition w-96">
		<div class="bg-base-100 h-full rounded-xl shadow-lg flex flex-col">
			{#each layers as layer}
				<div class="flex flex-col gap-2 p-2 bg-base-200 rounded-md">
					<div class="flex gap-2 items-center">
						<label class="flex items-center grow gap-2">
                            <span
                                class="px-2 rounded-md"
                                class:bg-primary={editedLayerId == layer.id}
                                class:text-primary-content={editedLayerId == layer.id}
                                class:bg-base-300={editedLayerId != layer.id}>{layer.id}</span
                            >
							<input
								type="radio"
								name="layers"
								value={layer}
								bind:group={addToLayer}
								class="radio radio-sm"
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
								on:change={redraw}
							/>
							<span>Visível</span>
						</label>
						<span class="grow text-right">{layer.features?.length} objetos</span>
						<button
							class="btn btn-neutral btn-outline btn-xs"
							on:click={() => {
								editedLayerId = layer.id;
							}}>Edit</button
						>
						<button class="btn btn-neutral btn-outline btn-xs">⬆</button>
						<button class="btn btn-neutral btn-outline btn-xs">⬇</button>
					</div>
				</div>

				{#if editedLayerId && editedLayerId == layer.id}
					<LayerSettings bind:layer on:featuredelete={redraw} />
                    <div class="flex justify-end">
					<button
                    class="btn btn-primary btn-xs btn-outline"
                    on:click={() => {
                        editedLayerId = undefined;
                    }}>Guardar</button
                >
                    </div>
				{/if}
			{/each}

			<!-- {#each layers as layer}
				<LayerSettings {layer} />
			{/each} -->
			<span class="grow"></span>
			<button class="btn btn-primary btn-md" on:click={addEmptyLayer}>Nova camada</button>
		</div>
	</div>

	<div class="absolute left-0 z-10 p-3 flex gap-2 bg-white rounded-br-md">
		<span>{editedFeatureId ? 'A editar' : 'Inserir'}</span>
		<button
			class="btn btn-xs"
			class:btn-primary={mode === modes.point}
			on:click={() => {
				editedPoint = undefined;
				mode = modes.point;
				updateEditionData();
			}}>Ponto</button
		>
		<button
			class="btn btn-xs"
			class:btn-primary={mode === modes.line}
			on:click={() => {
				editedLineVertices = [];
				mode = modes.line;
				updateEditionData();
			}}>Linha</button
		>
		<button
			class="btn btn-xs"
			class:btn-primary={mode === modes.route}
			on:click={() => {
				editedRouteVertices = [];
				mode = modes.route;
				updateEditionData();
			}}>Caminho</button
		>
		<button
			class="btn btn-xs"
			class:btn-primary={mode === modes.poly}
			on:click={() => {
				editedPolyVertices = [];
				mode = modes.poly;
				updateEditionData();
			}}>Poligono</button
		>
		<button class="btn btn-xs">BBOX</button>
	</div>

	<div class="absolute left-0 bottom-0 z-10 p-3 flex gap-2 bg-white rounded-br-md">
		<textarea class="w-96 h-96">{JSON.stringify(addToLayer, null, 2)}</textarea>
	</div>
</Map>
