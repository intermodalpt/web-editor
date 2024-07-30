<script>
	import { onDestroy, onMount } from 'svelte';
	import { Map, Marker } from 'maplibre-gl?client';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { liveQuery } from 'dexie';
	import {
		fetchOperators,
		getOperators,
		fetchStops,
		getStops,
		fetchRoutes,
		getRoutes,
		loadMissing
	} from '$lib/db';
	import { apiServer, tileStyle } from '$lib/settings';
	import Icon from '$lib/components/Icon.svelte';

	const operators = liveQuery(() => getOperators());
	const stops = liveQuery(() => getStops());
	const routes = liveQuery(() => getRoutes());

	async function loadData() {
		await Promise.all([fetchOperators(), fetchStops(), fetchRoutes()]);
	}

	loadData().then(async () => {
		console.log('data loaded');
		await loadMissing();
	});

	let title;
	let message;
	let category;
	let lat;
	let lon;
	let geojson;
	let issueRoutes = [];
	let issueStops = [];
	let issueOperators = [];

	let pendingStop = null;
	let pendingRoute = null;
	let pendingOperator = null;

	let pointPickerMap;
	let pointPickerMarker;
	let geojsonMap;

	function removeStop(stopId) {
		issueStops = issueStops.filter((e) => e !== stopId);
		issueStops = issueStops;
	}

	function removeRoute(routeId) {
		issueRoutes = issueRoutes.filter((e) => e !== routeId);
		issueRoutes = issueRoutes;
	}

	function removeOperator(operatorId) {
		issueOperators = issueOperators.filter((e) => e !== operatorId);
		issueOperators = issueOperators;
	}

	async function submit() {
		let issue = {
			title: title,
			message: message,
			category: category,
			lat: lat,
			lon: lon,
			geojson: geojson,
			route_ids: issueRoutes,
			stop_ids: issueStops,
			operator_ids: issueOperators
		};

		let res = await fetch(`${apiServer}/v1/issues`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify(issue)
		});

		if (res.ok) {
			let data = await res.json();
			navigate(`/issues/${data.id}`);
		} else {
			alert('Erro ao criar problema');
			console.error(res);
		}
	}

	onMount(() => {
		pointPickerMap = new Map({
			container: 'map',
			style: tileStyle,
			center: [-9.0, 38.605],
			zoom: 11,
			minZoom: 8,
			maxZoom: 20,
			maxBounds: [
				[-10.0, 38.3],
				[-8.0, 39.35]
			]
		});

		geojsonMap = new Map({
			container: 'map2',
			style: tileStyle,
			center: [-9.0, 38.605],
			zoom: 11,
			minZoom: 8,
			maxZoom: 20,
			maxBounds: [
				[-10.0, 38.3],
				[-8.0, 39.35]
			]
		});

		pointPickerMarker = new Marker();

		pointPickerMap.on('click', function (e) {
			let lngLat = e.lngLat;
			lat = lngLat.lat;
			lon = lngLat.lng;
			pointPickerMarker.setLngLat(lngLat).addTo(pointPickerMap);
		});

		geojsonMap.on('load', function () {
			geojsonMap.addSource('geojson', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: []
				}
			});
			geojsonMap.addLayer({
				id: 'geojson-points',
				type: 'circle',
				source: 'geojson',
				filter: ['==', '$type', 'Point'], // Filter only Point features
				paint: {
					'circle-color': ['get', 'color'],
					'circle-radius': 6
				}
			});
			geojsonMap.addLayer({
				id: 'geojson-lines',
				type: 'line',
				source: 'geojson',
				filter: ['==', '$type', 'LineString'], // Filter only Point features
				paint: {
					'line-color': ['get', 'color'],
					'line-width': 2
				}
			});

			// mapLoaded = true;
			// if (!loading) {
			// 	refreshStops();
			// }
		});
	});

	onDestroy(() => {
		pointPickerMap.remove();
	});
</script>

<svelte:head>
	<title>Novo problema</title>
	<meta name="description" content="Novo problema" />
</svelte:head>

<div class="flex flex-col gap-4 py-4">
	<div class="card card-compact self-center bg-base-100 shadow-sm w-full max-w-[900px]">
		<div class="card-body">
			<h2 class="card-title">Novo problema</h2>

			<div class="form-control">
				<label class="input-group">
					<span class="w-28">Titulo</span>
					<input type="text" bind:value={title} class="input input-bordered w-full input-md" />
				</label>
			</div>

			<div class="form-control">
				<label class="input-group">
					<span class="w-28">Categoria</span>
					<select class="input input-bordered w-full" bind:value={category}>
						<option value="stopimprovement">Paragens: Melhoria</option>
						<option value="stopissues">Paragens: Problema</option>
						<option value="routeimprovement">Linhas: Melhorias</option>
						<option value="scheduleissue">Horários: Problema</option>
						<option value="scheduleimprovement">Horários: Melhoria</option>
						<option value="serviceimprovement">Serviço: Melhoria</option>
						<option value="gtfs">GTFS</option>
					</select>
				</label>
			</div>

			<span>Mensagem</span>
			<textarea class="input input-bordered h-96" bind:value={message} />

			<span>Localização (Opcional)</span>
			<div id="map" class="h-96" />
			{#if lat && lon}
				<div class="flex flex-row gap-2">
					<span>Latitude: {lat}</span>
					<span>Longitude: {lon}</span>
					<a
						class="link"
						on:click={() => {
							lat = null;
							lon = null;
							pointPickerMarker.remove();
						}}>Clear</a
					>
				</div>
			{/if}

			<span>GeoJSON (Opcional)</span>
			<div class="grid grid-cols-2 grid-rows-1">
				<div id="map2" class="h-96" />
				<textarea
					class="input input-bordered h-96"
					bind:value={geojson}
					on:change={() => {
						try {
							let parsed = JSON.parse(geojson);
							if (geojsonMap) {
								geojsonMap.getSource('geojson').setData(parsed);
							}
						} catch (e) {
							console.log(e);
							console.log('Invalid geojson');
						}
					}}
				/>
			</div>

			<h2 class="text-lg">Referenciar</h2>
			<div class="form-control">
				<label class="input-group">
					<span class="w-28">Linha</span>
					<input
						type="number"
						bind:value={pendingRoute}
						class="input input-bordered w-full input-md"
					/>
					<button
						disabled={!$routes || !$routes[parseInt(pendingRoute)]}
						on:click={() => {
							issueRoutes.push(parseInt(pendingRoute));
							issueRoutes = issueRoutes;
							pendingRoute = null;
						}}
						class="btn btn-md btn-success">Adicionar</button
					>
				</label>
			</div>
			{#if issueRoutes.length > 0}
				<div class="form-control">
					<span class="label">
						<span class="label-text">Referenciadas</span>
					</span>
					<div>
						{#each issueRoutes as routeId}
							<div class="badge badge-outline badge-lg">
								{routeId} - {$routes[routeId].name}
								<button
									class="btn btn-error btn-circle btn-xs"
									on:click={() => removeRoute(routeId)}
								>
									<Icon name="close" class="h-4 stroke-current" />
								</button>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<div class="form-control">
				<label class="input-group">
					<span class="w-28">Paragem</span>
					<input
						type="number"
						bind:value={pendingStop}
						class="input input-bordered w-full input-md"
					/>
					<button
						disabled={!$stops || !$stops[parseInt(pendingStop)]}
						on:click={() => {
							issueStops.push(parseInt(pendingStop));
							issueStops = issueStops;
							pendingStop = null;
						}}
						class="btn btn-md btn-success">Adicionar</button
					>
				</label>
			</div>
			{#if issueStops.length > 0}
				<div class="form-control">
					<span class="label">
						<span class="label-text">Referenciadas</span>
					</span>
					<div>
						{#each issueStops as stopId}
							<div class="badge badge-outline badge-lg">
								{stopId} - {$stops[stopId].name}
								<button class="btn btn-error btn-circle btn-xs" on:click={() => removeStop(stopId)}>
									<Icon name="close" class="h-4 stroke-current" />
								</button>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<div class="form-control">
				<label class="input-group">
					<span class="w-28">Operador</span>
					<input
						type="number"
						bind:value={pendingOperator}
						class="input input-bordered w-full input-md"
					/>
					<button
						class="btn btn-md btn-success"
						disabled={!parseInt(pendingOperator)}
						on:click={() => {
							issueOperators.push(parseInt(pendingOperator));
							issueOperators = issueOperators;
							pendingOperator = null;
						}}>Adicionar</button
					>
				</label>
			</div>
			{#if issueOperators.length > 0}
				<div class="form-control">
					<span class="label">
						<span class="label-text">Referenciadas</span>
					</span>
					<div>
						{#each issueOperators as operatorId}
							<div class="badge badge-outline badge-lg">
								{operatorId} - {$operators[operatorId]?.name ?? '?'}
								<button
									class="btn btn-error btn-circle btn-xs"
									on:click={() => removeOperator(operatorId)}
								>
									<Icon name="close" class="h-4 stroke-current" />
								</button>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<div class="flex justify-end">
				<button class="btn btn-primary" disabled={!title || !message} on:click={submit}
					>Submeter</button
				>
			</div>
		</div>
	</div>
</div>
