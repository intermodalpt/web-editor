<script>
	import { onDestroy, onMount } from 'svelte';
	import { operators } from '$lib/stores.js';
	import { fetchStops, fetchRoutes, getStops, getRoutes, loadMissing } from '$lib/db';
	import { Map as Maplibre } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import * as turf from '@turf/turf';
	import { liveQuery } from 'dexie';

	/** @type {import('./$types').PageData} */
	export let data;

	const operator = data.operator;
	const issue = data.issue;

	const stops = liveQuery(() => getStops());
	const routes = liveQuery(() => getRoutes());

	issue.creation = new Date(issue.creation);

	async function loadData() {
		await Promise.all([fetchStops(), fetchRoutes()]);
	}

	loadData().then(async () => {
		console.log('data loaded');
		await loadMissing();
	});

	const geojson = (issue.geojson = JSON.parse(issue.geojson) || null);
	const bbox = geojson ? turf.bbox(geojson) : null;

	let map;

	onMount(() => {
		if (!((issue.lan && issue.lon) || issue.geojson)) {
			console.log('No geofeatures');
			return;
		}

		map = new Maplibre({
			container: 'map',
			style: 'https://tiles2.intermodal.pt/styles/iml/style.json',
			center: [-9.0, 38.605],
			zoom: 11,
			minZoom: 8,
			maxZoom: 20,
			maxBounds: [
				[-10.0, 38.3],
				[-8.0, 39.35]
			]
		});

		map.on('load', function () {
			if (geojson && bbox) {
				map.addSource('geojson', {
					type: 'geojson',
					data: geojson
				});
				map.addLayer({
					id: 'geojson-points',
					type: 'circle',
					source: 'geojson',
					filter: ['==', '$type', 'Point'], // Filter only Point features
					paint: {
						'circle-color': ['get', 'color'],
						'circle-radius': 6
					}
				});
				map.addLayer({
					id: 'geojson-lines',
					type: 'line',
					source: 'geojson',
					filter: ['==', '$type', 'LineString'], // Filter only Point features
					paint: {
						'line-color': ['get', 'color'],
						'line-width': 2
					}
				});
				map.fitBounds(bbox, { padding: 20 });
			}
		});
	});

	onDestroy(() => {
		if (map) {
			map.remove();
		}
	});
</script>

<svelte:head>
	<title>Problemas em {operator.name} - {issue.title}</title>
	<meta name="description" content="Problemas em {operator.name} - {issue.title}" />
</svelte:head>

<div class="w-full max-w-[900px] self-center">
	<div class="breadcrumbs">
		<ul>
			<li><a class="link" href="/operators">Operadores</a></li>
			<li><a class="link" href="/operators/{operator.tag}">{operator.name}</a></li>
			<li><a class="link" href="/operators/{operator.tag}/issues">Problemas</a></li>
			<li><a class="link" href="/operators/{operator.tag}/issues/{issue.id}">#{issue.id}</a></li>
		</ul>
	</div>

	<div class="card self-center bg-base-100 shadow-md w-full my-4">
		<div class="card-body">
			<h2 class="card-title">
				<a href="/operators/{operator.tag}/issues/{issue.id}">{issue.title}</a>
			</h2>
			<p>
				{issue.message}
			</p>
			<div id="map" class="h-96" />
			<span class="label-text">Prioridade:</span>
			{#if issue.impact === 1}
				<span class="text-success ml-1">Baixa</span>
			{:else if issue.impact === 3}
				<span class="text-warning ml-1">Média</span>
			{:else if issue.impact === 5}
				<span class="text-error ml-1">Alta</span>
			{:else}
				<span>Desconhecida</span>
			{/if}
			<span class="label-text">Linhas</span>
			<div class="flex gap-2 ml-1">
				{#if $routes}
					{#each issue.route_ids as id}
						<div class="flex">
							<span
								class="rounded-l-full px-1 font-bold text-md h-6"
								style="color: {$routes[id].badge_text}; background-color: {$routes[id].badge_bg}"
							>
								{$routes[id].code}
							</span>
							<span class="badge rounded-r-full badge-outline text-md h-6">{$routes[id].name}</span>
						</div>
					{/each}
				{:else}
					<span>Linhas a carregar...</span>
				{/if}
			</div>
			<span class="label-text">Paragens</span>
			<div class="flex gap-2 ml-1">
				{#if $stops}
					{#each issue.stop_ids as id}
						<span class="badge badge-outline text-md h-6">{id} - {$stops[id].name}</span>
					{/each}
				{:else}
					<span>Paragens a carregar...</span>
				{/if}
			</div>

			<span class="label-text">Estado</span>
			<span class="ml-1">
				{#if issue.state === 'unanswered'}
					Sem resposta
				{:else if issue.state === 'wontfix'}
					Rejeitado
				{:else if issue.state === 'fixinprogress'}
					Resolução em progresso
				{:else if issue.state === 'fixdone'}
					Resolvido
				{:else}
					Desconhecido
				{/if}
			</span>
			{#if issue.state_justification}
				<span class="label-text">Justificação</span>
				<span class="ml-1">{issue.state_justification}</span>
			{/if}
			<hr />
			<span class="label-text">
				Criado a {issue.creation.toLocaleString('pt-pt',{day: 'numeric', month:'long', year:'numeric'})}
			</span>
			<div class="flex gap-1">
				<span>Afecto a</span>
				<div class="flex">
					{#each issue.operator_ids as id}
						<a class="badge badge-secondary" href="/operators/{operator.tag}"
							>{operators[id].name}</a
						>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
