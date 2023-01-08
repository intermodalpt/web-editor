<script>
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import L from 'leaflet?client';
	import 'leaflet.markercluster?client';
	import { api_server } from '$lib/settings.js';
	import { token, decodedToken } from '$lib/stores.js';
	import { calc_route_multipoly } from '$lib/utils.js';
	import { icons } from '$lib/assets.js';
	import { writable, derived } from 'svelte/store';

	/** @type {import('./$types').PageData} */
	export let data;

	let map;
	let mapLayers;
	let changes = false;
	let importFromSubrouteId = null;

	const stops = data.stops;
	const route = data.route;
	const routeStops = data.routeStops;

	$: subroutes = Object.fromEntries(route.subroutes.map((subroute) => [subroute.id, subroute]));

	const selectedStop = writable(null);
	const selectedSubrouteId = writable(route.subroutes[0]?.id);

	const selectedSubrouteStops = derived(selectedSubrouteId, ($selectedSubrouteId) => {
		if ($selectedSubrouteId) {
			return routeStops[$selectedSubrouteId];
		} else {
			return [];
		}
	});
	const importableSubroutesIds = derived(routeStops, ($routeStops) => {
		return Object.entries($routeStops)
			.filter(([_, val]) => {
				return val?.stops?.length > 0;
			})
			.map(([key, _]) => {
				return parseInt(key);
			});
	});

	const stopList = writable([...$selectedSubrouteStops]);

	selectedSubrouteStops.subscribe((subrouteStops) => {
		stopList.set([...subrouteStops]);
		if (map) {
			redrawCurrentSubroute();
		}
	});

	stopList.subscribe(() => {
		if (map) {
			updateDrawing();
		}
	});

	function updateDrawing() {
		if ($stopList) {
			drawStopSegment($stopList);
		}
	}

	function redrawCurrentSubroute() {
		if ($stopList) {
			let polyLine = drawStopSegment($stopList);
			let bounds = polyLine.getBounds();
			if (polyLine && bounds.isValid()) {
				map.fitBounds(bounds);
			}
		}
	}

	function drawStopSegment(stop_ids) {
		let segments = calc_route_multipoly(stops, stop_ids);

		mapLayers.subrouteDrawing.removeFrom(map);
		mapLayers.subrouteDrawing = L.layerGroup();
		if (segments) {
			let polyLine = L.polyline(segments, { color: 'red' }).addTo(mapLayers.subrouteDrawing);

			mapLayers.subrouteDrawing.addTo(map);
			return polyLine;
		}
	}

	function createStopMarker(info) {
		let marker;
		let markerOptions = { rinseOnHover: true, draggable: true };
		if (icons[info.source] === undefined) {
			marker = L.marker([info.lat, info.lon], markerOptions);
		} else {
			marker = L.marker(
				[info.lat, info.lon],
				Object.assign({}, markerOptions, { icon: icons[info.source] })
			);
		}

		marker.stopId = info.id;

		marker.on('click', (e) => {
			$selectedStop = stops[e.target.stopId];
		});

		let name = info.official_name || info.name || info.short_name || info.osm_name;

		marker.bindTooltip(`${info.id} - ${name}`);

		return marker;
	}

	function goTo(stopId) {
		const stop = stops[stopId];
		if (stop.lat && stop.lon) {
			map.setView([stop.lat, stop.lon], 18);
		}
	}

	function importStopsPrompt() {
		let input = prompt('Insert the stop array below');

		if (!input) {
			return;
		}

		try {
			let newStopList = JSON.parse(input);
			// Check if the input is an integer array
			if (!Array.isArray(newStopList) || newStopList.some((stop) => !Number.isInteger(stop))) {
				alert('Invalid input');
				return;
			}
			$stopList = newStopList;
			changes = true;
			console.log(newStopList);
		} catch (e) {
			alert('Invalid input');
			return;
		}
	}

	function exportStopsPrompt() {
		prompt('Lista de paragens', JSON.stringify($stopList));
	}

	function saveSubrouteStops() {
		fetch(`${api_server}/v1/routes/${route.id}/stops/subroutes/${$selectedSubrouteId}`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				authorization: `Bearer ${$token}`
			},
			body: JSON.stringify({
				from: {
					stops: $selectedSubrouteStops
				},
				to: {
					stops: $stopList
				}
			})
		})
			.then((resp) => {
				if (resp.ok) {
					routeStops[$selectedSubrouteId] = $stopList;
					changes = false;
					invalidate('app:subroute-stops');
				} else {
					alert("The server didn't like this data");
				}
			})
			.catch((e) => {
				console.log(e);
				alert('Error saving');
			});
	}

	function moveUp(i) {
		const aux = $stopList[i - 1];
		diffList;
		$stopList[i - 1] = $stopList[i];
		$stopList[i] = aux;
		$stopList = $stopList;
		diffList = diffList;
		changes = true;
		closeModal(i);
	}

	function moveDown(i) {
		const aux = $stopList[i + 1];
		$stopList[i + 1] = $stopList[i];
		$stopList[i] = aux;
		$stopList = $stopList;
		changes = true;
		closeModal(i);
	}

	function addStop() {
		if ($selectedStop === undefined) {
			alert('Select a stop first...');
			return;
		}

		$stopList = [$selectedStop.id];
		diffList = [0];
	}

	function addBefore(index) {
		if ($selectedStop === undefined) {
			alert('Select a stop first...');
			return;
		}

		$stopList.splice(index, 0, $selectedStop.id);
		$stopList = $stopList;
		changes = true;
		closeModal(index);
	}

	function importStops() {
		let origin = selectedRouteStops[importFromSubrouteId];
		$stopList = [...origin.stops];
		changes = true;
	}

	function addAfter(index) {
		if ($selectedStop === undefined) {
			alert('Select a stop first...');
			return;
		}

		$stopList.splice(index + 1, 0, $selectedStop.id);
		$stopList = $stopList;
		changes = true;
		closeModal(index);
	}

	function replaceStop(i) {
		if ($selectedStop === undefined) {
			alert('Select another stop first...');
			return;
		}

		if ($stopList.includes($selectedStop.id)) {
			if (!confirm('Route already has this stop. Are you totally sure?')) {
				return;
			}
		}

		if (
			confirm(`Do you want to replace ${stopName(stops[$stopList[i]])}
        with ${stopName($selectedStop)}?`)
		) {
			$stopList[i] = $selectedStop.id;
			$stopList = $stopList;
			changes = true;
			closeModal(i);
		}
		closeModal(i);
	}

	function removeStop(i) {
		if (confirm(`Do you want to remove ${stopName(stops[$stopList[i]])} from this route?`)) {
			$stopList.splice(i, 1);
			$stopList = $stopList;
			changes = true;
			closeModal(i);
		}
	}

	function stopName(stop) {
		return stop.official_name || stop.name || stop.osm_name;
	}

	function closeModal(index) {
		let modalCheckbox = document.getElementById(`index-${index}-modal`);
		if (modalCheckbox) {
			modalCheckbox.checked = false;
		}
	}

	onMount(() => {
		mapLayers = {
			stops: L.layerGroup(),
			subrouteDrawing: L.layerGroup()
		};

		map = L.map('map', {
			contextmenu: true,
			minZoom: 10,
			maxZoom: 20,
			zoomControl: false,
			closePopupOnClick: false,
			maxBounds: new L.LatLngBounds(new L.LatLng(38.3, -10.0), new L.LatLng(39.35, -8.0)),
			maxBoundsViscosity: 1.0
		}).setView([38.71856, -9.1372], 10);

		let osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution: '© OpenStreetMap e contribuidores'
		}).addTo(map);

		mapLayers.stops = L.markerClusterGroup({
			// spiderfyOnMaxZoom: false,
			showCoverageOnHover: false,
			disableClusteringAtZoom: 16
		});
		Object.values(stops).forEach((node) => {
			if (node.lat != null && node.lon != null) {
				let marker = createStopMarker(node);
				mapLayers.stops.addLayer(marker);
			}
		});

		map.addLayer(mapLayers.stops);
		redrawCurrentSubroute();
	});
</script>

<svelte:head>
	<title>Intermodal - Paragens</title>
	<meta name="description" content="Paragens" />
</svelte:head>

{#if route.subroutes?.length === 0}
	<div class="alert alert-error shadow-lg">
		<div>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="stroke-current flex-shrink-0 h-6 w-6"
				fill="none"
				viewBox="0 0 24 24"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<span>Adicione primeiro subrotas a esta rota</span>
		</div>
	</div>
{/if}

<div class="flex flex-col flex-1 p-2 gap-2">
	<div class="z-[1001] grid grid-cols-1 justify-items-stretch w-full">
		<div>
			<span class="font-bold">{route.code}</span>
			<select class="select select-bordered select-sm" bind:value={$selectedSubrouteId}>
				{#each route.subroutes as subroute}
					<option value={subroute.id}>{subroute.flag.substring(0, 60)}</option>
				{/each}
			</select>
			<span class="badge">{$selectedSubrouteId}</span>
			<span class="badge">{subroutes[$selectedSubrouteId].flag}</span>
			<span class="badge badge-primary">
				Selected stop:
				{#if $selectedStop}
					{stopName($selectedStop)} ({$selectedStop.id})
				{:else}
					None
				{/if}
			</span>
		</div>
	</div>
	<div id="grid-container" class="w-full">
		<div id="map" />
		<div id="list" class="max-h-fit overflow-y-scroll">
			{#if $stopList.length === 0}
				<div class="flex flex-col items-center">
					<h2>This subroute has no stops.</h2>
					<input
						type="button"
						value="Add stop"
						class="btn btn-primary"
						disabled={!$selectedStop}
						on:mouseup={addStop}
					/>
					<br />
					<div>
						{#if importableSubroutesIds?.length > 0}
							Import from:<br />
							<select class="select select-bordered select-sm" bind:value={importFromSubrouteId}>
								{#each importableSubroutesIds as subrouteId}
									<option value={subrouteId}>
										{selectedRoute.subroutes?.find((subroute) => {
											return subroute.id === subrouteId;
										}).flag}
									</option>
								{/each}
							</select>
							<input
								class="btn btn-primary"
								type="button"
								value="Import"
								on:mouseup={importStops}
								disabled={!importFromSubrouteId}
							/>
						{/if}
					</div>
				</div>
			{/if}

			{#each $stopList as stop, index}
				<div class="flex justify-between">
					<a class="btn btn-xs btn-ghost" on:click={() => goTo(stop)}>
						({stop})
						{stopName(stops[stop])}
					</a>
					{#if $decodedToken?.permissions?.is_admin}
						<div class="flex flex-row gap-1">
							<label for={`index-${index}-modal`} class="btn btn-xs modal-button">...</label>
							<input type="checkbox" id={`index-${index}-modal`} class="modal-toggle" />
							<label for={`index-${index}-modal`} class="modal cursor-pointer">
								<label class="modal-box relative max-w-2xl" for="">
									<span class="text-lg">
										O que fazer a {stopName(stops[stop])}?
									</span>
									<ul class="menu bg-base-100 w-full rounded-box">
										{#if $selectedStop}
											<li>
												<a on:mouseup={() => addBefore(index)}>
													🡹⁺ Inserir <b>{stopName($selectedStop)}</b>
													antes
												</a>
											</li>
											<li>
												<a on:mouseup={() => addAfter(index)}>
													🡻⁺ Inserir <b>{stopName($selectedStop)}</b>
													depois
												</a>
											</li>
											<li>
												<a on:mouseup={() => replaceStop(index)}>
													⮰ Substituir por
													<b>{stopName($selectedStop)}</b>
												</a>
											</li>
										{/if}
										{#if index > 0}
											<li>
												<a on:mouseup={() => moveUp(index)}> 🡹 Mover para cima </a>
											</li>
										{/if}
										{#if index !== $stopList.length - 1}
											<li>
												<a on:mouseup={() => moveDown(index)}> 🡻 Mover para baixo </a>
											</li>
										{/if}
										<li><a on:mouseup={() => removeStop(index)}>❌ Remover</a></li>
									</ul>
								</label>
							</label>
						</div>
					{/if}
				</div>
				<hr />
			{/each}
		</div>
		<div id="actions" class="flex justify-end gap-2">
			{#if $decodedToken?.permissions?.is_admin}
				<input
					class="btn btn-sm btn-secondary"
					type="button"
					value="Exportar"
					on:click={exportStopsPrompt}
				/>
				<input
					class="btn btn-sm btn-secondary"
					type="button"
					value="Importar"
					on:click={importStopsPrompt}
				/>
				<input
					class="btn btn-sm btn-primary"
					type="button"
					value="Guardar"
					disabled={!changes}
					on:click={saveSubrouteStops}
				/>
			{/if}
		</div>
	</div>
</div>

<style>
	@import 'leaflet/dist/leaflet.css';
	@import 'leaflet.markercluster/dist/MarkerCluster.css';

	#map {
		border-top-left-radius: 12px;
		border-bottom-left-radius: 12px;
		cursor: crosshair !important;
		grid-area: map;
	}

	#list {
		grid-area: list;
	}

	#actions {
		grid-area: actions;
	}

	#grid-container {
		display: grid;
		grid-template-areas:
			'map list'
			'actions actions';
		grid-template-columns: 1fr auto;
		grid-template-rows: minmax(500px, 85vh) auto;
	}
</style>
