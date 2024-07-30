<script>
	import { onDestroy, onMount, tick } from 'svelte';
	import { writable, derived } from 'svelte/store';
	import { liveQuery } from 'dexie';
	import { Map as Maplibre, LngLatBounds } from 'maplibre-gl?client';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import polyline from '@mapbox/polyline';
	import { apiServer, tileStyle } from '$lib/settings';
	import { permissions } from '$lib/stores';
	import { isAdmin } from '$lib/permissions.ts';
	import {
		getRegions,
		getOperators,
		fetchCalendars,
		getCalendars,
		fetchStops,
		getStops,
		loadMissing
	} from '$lib/db';

	/** @type {import('./$types').PageData} */
	export let data;
	const operator = data.operator;

	const ROUTES_PER_PAGE = 15;
	const SUBROUTE_COLORS = [
		'#8839ef',
		'#179299',
		'#7287fd',
		'#ea76cb',
		'#40a02b',
		'#fe640b',
		'#dd7878',
		'#4c4f69'
	];

	const canEdit = isAdmin($permissions);

	let issues = [];

	async function loadData() {
		await Promise.all([
			fetch(`${apiServer}/v1/operators/${operator.id}/routes/full`)
				.then((r) => r.json())
				.then((r) => {
					$routes = r;
				}),
			fetchCalendars(),
			fetchStops(),
			fetch(`${apiServer}/v1/operators/${operator.id}/issues`)
				.then((r) => r.json())
				.then((r) => {
					issues = r;
				})
		]);
	}

	loadData().then(async () => {
		await loadMissing();
	});

	const regions = liveQuery(() => getRegions());
	const operators = liveQuery(() => getOperators());
	const calendars = liveQuery(() => getCalendars());
	const routes = writable(null);
	const stops = liveQuery(() => getStops());

	let mapElem;
	let map;
	let mapLoaded = false;

	const selectedRoute = writable(null);

	const selectedRouteStops = derived(selectedRoute, ($selectedRoute, set) => {
		if (!$selectedRoute) return;

		fetch(`${apiServer}/v1/routes/${$selectedRoute.id}/stops`)
			.then((r) => r.json())
			.then((r) => {
				set(r);
			});
	});

	selectedRouteStops.subscribe(() => {
		drawRouteStops();
	});

	stops.subscribe(() => {
		drawStops();
	});

	selectedRoute.subscribe(() => {
		drawRouteLine();
	});

	const filter = writable('');
	const routePage = writable(0);

	filter.subscribe(() => {
		$routePage = 0;
	});

	const sortedFilteredRoutes = derived([routes, filter], ([$routes, $filter]) => {
		if (!$routes) return [];

		const filterFunc = $filter
			? (r) =>
					r.name.toLowerCase().includes($filter.toLowerCase()) ||
					r.code?.toLowerCase().includes($filter.toLowerCase())
			: () => true;

		let res = Object.values($routes)
			.filter((r) => r.operator === operator.id)
			.filter(filterFunc)
			.sort((ra, rb) => {
				if (!ra.code) {
					return -1;
				} else if (!rb.code) {
					return 1;
				} else {
					return (parseInt(ra.code) || 10000) - (parseInt(rb.code) || 10000);
				}
			});

		return res;
	});

	const subrouteCount = derived([sortedFilteredRoutes], ([$sortedFilteredRoutes]) => {
		if (!$sortedFilteredRoutes) return 0;
		return $sortedFilteredRoutes.reduce((acc, route) => acc + route.subroutes.length, 0);
	});

	const routePageCount = derived([sortedFilteredRoutes], ([$sortedFilteredRoutes]) => {
		const count = Math.ceil($sortedFilteredRoutes.length / ROUTES_PER_PAGE);
		if ($routePage >= count) {
			if (count === 0) {
				$routePage = 0;
			} else {
				$routePage = count - 1;
			}
		}
		return count;
	});

	const routesInPage = derived(
		[sortedFilteredRoutes, routePage],
		([$sortedFilteredRoutes, $routePage]) => {
			return $sortedFilteredRoutes.slice(
				$routePage * ROUTES_PER_PAGE,
				($routePage + 1) * ROUTES_PER_PAGE
			);
		}
	);

	const range = (start, stop) => Array.from({ length: stop - start + 1 }, (_, i) => start + i);

	const PAGE_SHORTCUTS = 2;

	const prePageShortcuts = derived([routePage], ([$routePage]) => {
		if ($routePage < 1) return [];

		const start = Math.max(0, $routePage - PAGE_SHORTCUTS);

		return range(start, $routePage - 1);
	});

	const postPageShortcuts = derived(
		[routePage, routePageCount],
		([$routePage, $routePageCount]) => {
			if ($routePageCount - $routePage <= 1) return [];

			const end = Math.min($routePageCount - 1, $routePage + PAGE_SHORTCUTS);

			return range($routePage + 1, end);
		}
	);

	const operatorCalendars = derived([calendars], ([$calendars]) => {
		if (!$calendars) {
			return [];
		}
		return Object.values($calendars).filter((calendar) => calendar.operator_id === operator.id);
	});

	function drawStops() {
		if (!mapLoaded || !$stops) return;

		map.getSource('stops').setData({
			type: 'FeatureCollection',
			features: Object.values($stops).map((stop) => ({
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: [stop.lon, stop.lat]
				},
				properties: {
					id: stop.id
				}
			}))
		});
	}

	function drawRouteStops() {
		if (!mapLoaded || !$stops || !$selectedRouteStops) return;

		const stopIds = Array.from(new Set($selectedRouteStops.map((sr) => sr.stops).flat()));

		map.getSource('connected-stops').setData({
			type: 'FeatureCollection',
			features: stopIds
				.map((stopId) => $stops[stopId])
				.filter((s) => s)
				.map((stop) => {
					return {
						type: 'Feature',
						geometry: {
							type: 'Point',
							coordinates: [stop.lon, stop.lat]
						},
						properties: {
							id: stop.id
						}
					};
				})
		});
	}

	function drawRouteLine() {
		if (!mapLoaded || !$selectedRoute) return;

		let drawnSubroutes = 0;
		const features = [];
		const bounds = new LngLatBounds();

		for (const subroute of $selectedRoute.subroutes) {
			if (!subroute.polyline) {
				continue;
			}
			let color = SUBROUTE_COLORS[-1];
			if (drawnSubroutes < SUBROUTE_COLORS.length) {
				color = SUBROUTE_COLORS[drawnSubroutes];
			}
			drawnSubroutes++;
			const coords = polyline.decode(subroute.polyline, 6).map((p) => p.reverse());
			for (const coord of coords) {
				bounds.extend(coord);
			}
			features.push({
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: coords
				},
				properties: {
					color: color
				}
			});
		}

		map.getSource('routeline').setData({
			type: 'FeatureCollection',
			features: features
		});

		if (features.length > 0) {
			map.fitBounds(bounds, { padding: 50 });
		}
	}

	function addSourcesAndLayers() {
		map.addSource('routeline', {
			type: 'geojson',
			data: {
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: []
				}
			}
		});

		map.addLayer({
			id: 'routeline',
			type: 'line',
			source: 'routeline',
			paint: {
				'line-color': ['get', 'color'],
				'line-width': 5
			}
		});
		// ################################
		// Display every stop
		map.addSource('stops', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});
		map.addLayer({
			id: 'stops',
			type: 'circle',
			source: 'stops',
			paint: {
				'circle-color': 'rgb(40, 100, 150)',
				'circle-radius': {
					stops: [
						[12, 0],
						[14, 5]
					]
				}
			}
		});
		// ################################
		// Highlight stops over the regular stops
		map.addSource('connected-stops', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});
		map.addLayer({
			id: 'connected-stops',
			type: 'circle',
			source: 'connected-stops',
			paint: {
				'circle-color': 'rgb(50, 150, 220)',
				'circle-radius': {
					stops: [
						[12, 3],
						[14, 4],
						[16, 11],
						[17, 20],
						[20, 25]
					]
				},
				'circle-stroke-width': 1,
				'circle-stroke-color': '#fff'
			}
		});
	}

	onMount(() => {
		map = new Maplibre({
			container: mapElem,
			style: tileStyle,
			minZoom: 8,
			maxZoom: 20,
			maxBounds: [
				[-10.0, 38.3],
				[-8.0, 39.35]
			],
			center: [-9.1333, 38.7167]
		});

		map.on('load', () => {
			addSourcesAndLayers();
			// addEvents();

			mapLoaded = true;
			drawStops();
			drawRouteStops();
			drawRouteLine();
		});
	});

	onDestroy(() => {
		mapLoaded = false;
		map.remove();
	});
</script>

<svelte:head>
	<title>Editor Intermodal - {operator.name}</title>
	<meta name="description" content="Informações sobre o operador {operator.name}" />
</svelte:head>

<div class="flex flex-col gap-4 max-w-[100em] w-full sm:px-4 self-center my-4">
	<div class="breadcrumbs">
		<ul>
			<li><a class="link" href="/operators">Operadores</a></li>
			<li><a class="link" href="/operators/{operator.id}-{operator.tag}">{operator.name}</a></li>
		</ul>
	</div>

	<div class="card self-center bg-base-100 shadow-sm w-full">
		<div class="card-body">
			<h2 class="card-title text-3xl">
				{#if operator.logo_url}<img class="h-12" src={operator.logo_url} alt={operator.name} />{/if}
				{operator.name}
				<a class="btn btn-xs" href="/operators/{operator.id}-{operator.tag}/edit">Editar</a>
			</h2>
			{#if $regions}
				<div class="flex flex-wrap gap-2 mt-1 -mb-8">
					<div>Presença em</div>
					{#each operator.regions as regionId}
						<div class="border-b-2 border-sky-300">{$regions[regionId]?.name ?? '?'}</div>
					{/each}
				</div>
			{/if}
		</div>

		<div class="stats stats-vertical lg:stats-horizontal">
			<div class="stat">
				<div class="stat-title">Linhas</div>
				<div class="stat-value">{$sortedFilteredRoutes?.length ?? '?'}</div>
			</div>
			<div class="stat">
				<div class="stat-title">Variantes</div>
				<div class="stat-value">{$subrouteCount}</div>
			</div>
			<div class="stat">
				<div class="stat-title">Calendários</div>
				<div class="stat-value">{$operatorCalendars?.length}</div>
			</div>
		</div>
	</div>

	<div class="card grid grid-cols-1 xl:grid-cols-2 bg-base-100 shadow-sm w-full">
		<div id="route-pane">
			{#if $selectedRoute}
				<h2 class="card-title p-2 flex gap-1">
					{#if $selectedRoute.code}
						<span
							class="rounded-full px-1 font-bold"
							style="color: {$selectedRoute.badge_text}; background-color: {$selectedRoute.badge_bg}"
						>
							{$selectedRoute.code}
						</span>
					{/if}
					<span>{$selectedRoute.name}</span>
				</h2>
			{:else}
				<div class="flex justify-between items-center">
					<h2 class="card-title p-2">Escolha uma linha</h2>
					<a
						class="btn btn-xs btn-success"
						class:hidden={!canEdit}
						href="/operators/{operator.id}-{operator.tag}/routes/new">+</a
					>
				</div>
			{/if}
			<div bind:this={mapElem} class="h-[500px] relative">
				{#if $selectedRoute}
					<div class="absolute lg:right-4 lg:top-4 top-2 right-2 z-10">
						<a
							class="btn btn-primary shadow-md"
							href="/operators/{operator.id}-{operator.tag}/routes/{$selectedRoute.id}-{$selectedRoute.code ||
								''}">Editar</a
						>
					</div>
				{/if}
			</div>
		</div>
		<div class="flex flex-col gap-2 m-2">
			<div>
				<input
					type="text"
					class="input input-sm input-bordered w-full"
					placeholder="Procurar"
					bind:value={$filter}
				/>
			</div>
			<div class="flex flex-col gap-1">
				{#each $routesInPage as route}
					<div
						class="flex gap-1 hover:bg-base-200 border-[1px] px-2 py-1 rounded-lg cursor-pointer"
						on:click={async () => {
							$selectedRoute = route;
							await tick();
							document.getElementById('route-pane').scrollIntoView({ behavior: 'smooth' });
						}}
					>
						<span
							class="rounded-full px-1 font-bold"
							style="color: {route.badge_text}; background-color: {route.badge_bg}"
						>
							{#if route.code}
								{route.code}
							{:else}
								<span class="text-gray-500">N/A</span>
							{/if}
						</span>
						<span class="font">{route.name}</span>
					</div>
				{/each}
			</div>
			<div>
				<div class="flex justify-center gap-2">
					<button
						class="btn btn-ghost btn-sm"
						disabled={$routePage === 0}
						on:click={() => $routePage--}
					>
						«
					</button>

					{#if $routePage > PAGE_SHORTCUTS}
						<button class="btn btn-ghost btn-circle btn-sm" on:click={() => ($routePage = 0)}>
							1
						</button>
					{/if}
					{#if $routePage > PAGE_SHORTCUTS + 1}
						<span>...</span>
					{/if}

					{#each $prePageShortcuts as page}
						<button class="btn btn-ghost btn-circle btn-sm" on:click={() => ($routePage = page)}>
							{page + 1}
						</button>
					{/each}

					<span class="btn btn-active btn-circle btn-sm">
						{$routePage + 1}
					</span>

					{#each $postPageShortcuts as page}
						<button class="btn btn-ghost btn-circle btn-sm" on:click={() => ($routePage = page)}>
							{page + 1}
						</button>
					{/each}

					{#if $routePage < $routePageCount - PAGE_SHORTCUTS - 2}
						<span>...</span>
					{/if}
					{#if $routePage < $routePageCount - PAGE_SHORTCUTS - 1}
						<button
							class="btn btn-ghost btn-circle btn-sm"
							on:click={() => ($routePage = $routePageCount - 1)}
						>
							{$routePageCount}
						</button>
					{/if}

					<button
						class="btn btn-ghost btn-sm"
						disabled={$routePage === $routePageCount - 1}
						on:click={() => $routePage++}
					>
						»
					</button>
				</div>
			</div>
		</div>
	</div>

	<div class="card card-compact self-center bg-base-100 shadow-sm w-full">
		<div class="card-body">
			<h2 class="card-title">Calendários</h2>
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
				{#each $operatorCalendars as calendar}
					<div class="flex gap-2 p-2 rounded-lg border-[1px] shadow-sm">
						<span class="text-3xl font-light w-10">{calendar.id}</span>
						<div class="flex flex-col gap-1">
							<span class="text-lg font-bold">{calendar.name}</span>
							<div class="flex gap-1">
								{#each calendar.calendar.weekdays as weekday}
									{#if weekday === 0}
										<div class="badge badge-secondary">Seg.</div>
									{:else if weekday === 1}
										<div class="badge badge-secondary">Ter.</div>
									{:else if weekday === 2}
										<div class="badge badge-secondary">Qua.</div>
									{:else if weekday === 3}
										<div class="badge badge-secondary">Qui.</div>
									{:else if weekday === 4}
										<div class="badge badge-secondary">Sex.</div>
									{:else if weekday === 5}
										<div class="badge badge-secondary">Sáb.</div>
									{:else if weekday === 6}
										<div class="badge badge-secondary">Dom.</div>
									{:else if weekday === 7}
										<div class="badge badge-secondary">?</div>
									{/if}
								{/each}
							</div>
							{#if calendar.calendar.only_if.length > 0}
								<div class="flex gap-1">
									<span>Só se:</span>
									{#each calendar.calendar.only_if as condition}
										<div class="badge badge-info">{condition.condition}</div>
									{/each}
								</div>
							{/if}
							{#if calendar.calendar.except_if.length > 0}
								<div class="flex gap-1">
									<span>Excepto se:</span>
									{#each calendar.calendar.except_if as condition}
										<div class="badge badge-error">{condition.condition}</div>
									{/each}
								</div>
							{/if}
							{#if calendar.calendar.also_if.length > 0}
								<div class="flex gap-1">
									<span>Também se:</span>
									{#each calendar.calendar.also_if as condition}
										<div class="badge badge-success">{condition.condition}</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<div class="card card-compact self-center bg-base-100 shadow-sm w-full">
		<div class="card-body">
			<h2 class="card-title">
				<a href="/operators/{operator.id}-{operator.tag}/issues">Problemas</a>
			</h2>
			<div class="grid p-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
				{#if issues.length == 0}
					<span>Sem problemas anexos a este operador.</span>
				{/if}
				{#each issues as issue}
					<div class="card card-compact self-center bg-base-100 shadow-md">
						<div class="card-body">
							<div class="flex gap-1">
								<span>Afecto a</span>
								<div class="flex">
									{#each issue.operator_ids as id}
										<span class="badge badge-secondary">{$operators[id].name}</span>
									{/each}
								</div>
							</div>
							<h2 class="card-title">
								<a href="/operators/{operator.id}-{operator.tag}/issues/{issue.id}">{issue.title}</a
								>
							</h2>
							<div class="flex gap-2">
								<span>Linhas</span>
								{#if $routes}
									{#each issue.route_ids as id}
										<div class="flex">
											<span
												class="rounded-l-full px-1 font-bold"
												style="color: {$routes[id].badge_text}; background-color: {$routes[id]
													.badge_bg}"
											>
												{$routes[id].code}
											</span>
											<span class="badge rounded-r-full badge-outline">{$routes[id].name}</span>
										</div>
									{/each}
								{:else}
									<span>Linhas a carregar...</span>
								{/if}
							</div>
							<div class="flex gap-2">
								<span>Stops</span>
								{#if $stops}
									{#each issue.stop_ids as id}
										<span class="badge badge-outline">{id} - {$stops[id]?.name}</span>
									{/each}
								{:else}
									<span>Stops a carregar...</span>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<div class="card card-compact self-center bg-base-100 shadow-sm w-full">
		<div class="card-body">
			<h2 class="card-title">Ferramentas</h2>
			<div class="flex gap-4">
				<a class="btn btn-primary" href="/operators/{operator.id}-{operator.tag}/matcher">
					Emparelhamento paragens
				</a>
				<a class="btn btn-primary" href="/operators/{operator.id}-{operator.tag}/matcher/routes">
					Validação de rotas
				</a>
			</div>
		</div>
	</div>
</div>
