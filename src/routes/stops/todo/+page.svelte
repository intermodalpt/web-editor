<script>
	import { onDestroy, tick } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { selectedRegion } from '$lib/db';
	import { regionMapParams } from '$lib/utils.js';
	import { decodedToken, token, toast } from '$lib/stores.js';
	import { apiServer, credibleSources } from '$lib/settings.js';
	import StopTodoViewer from './StopTodoViewer.svelte';
	import TodoMap from './TodoMap.svelte';

	/** @type {import('./$types').PageData} */
	export let data;

	const regionStopTodos = data.regionStopTodos;

	let map;

	let stopsLoaded = true;
	let mapLoaded = false;
	$: loading = !stopsLoaded || !mapLoaded;

	const selectedStop = writable(null);

	const stopSearchInput = writable(null);

	const stopSearchResults = derived([stopSearchInput], ([$stopSearchInput]) => {
		if (!$stopSearchInput || $stopSearchInput.length < 3) {
			return;
		}

		const lowerInput = $stopSearchInput.toLowerCase();

		return Object.values(regionStopTodos)
			.filter((stop) => {
				return (
					('' + stop.id).includes($stopSearchInput) ||
					stop.stop_ref?.toLowerCase().includes(lowerInput) ||
					stop.name?.toLowerCase().includes(lowerInput) ||
					stop.official_name?.toLowerCase().includes(lowerInput)
				);
			})
			.map((stop) => {
				return {
					id: stop.id,
					stopRef: stop.stop_ref,
					name: stop.name,
					lat: stop.lat,
					lon: stop.lon
				};
			});
	});

	function refreshStops() {
		if (!map) return;

		console.log('Refreshing stops');

		const unpositionedStops = [];
		const underpositionedStops = [];
		const needsPicStops = [];
		const reportIssueStops = [];
		const otherTodosStops = [];

		for (const stop of Object.values(regionStopTodos)) {
			for (const todo of stop.todo) {
				if (todo == 'verifyLocation') {
					unpositionedStops.push(stop);
				} else if (todo == 'improveLocation') {
					underpositionedStops.push(stop);
				} else if (todo.gatherPics) {
					needsPicStops.push(stop);
				} else if (todo.reportIssue) {
					reportIssueStops.push(stop);
				} else {
					otherTodosStops.push(stop);
				}
			}
		}

		const stopFeatures = Object.values(regionStopTodos).map((stop) => {
			return {
				type: 'Feature',
				geometry: { type: 'Point', coordinates: [stop.lon, stop.lat] },
				properties: { id: stop.id, id_name: `${stop.id} - ${stop.name}` }
			};
		});

		const unpositionedStopsFeatures = unpositionedStops.map((stop) => {
			return {
				type: 'Feature',
				geometry: { type: 'Point', coordinates: [stop.lon, stop.lat] },
				properties: { id: stop.id }
			};
		});

		const underpositionedStopFeatures = underpositionedStops.map((stop) => {
			return {
				type: 'Feature',
				geometry: { type: 'Point', coordinates: [stop.lon, stop.lat] },
				properties: { id: stop.id }
			};
		});

		const needsPicStopFeatures = needsPicStops.map((stop) => {
			return {
				type: 'Feature',
				geometry: { type: 'Point', coordinates: [stop.lon, stop.lat] },
				properties: { id: stop.id }
			};
		});

		const reportIssueStopFeatures = reportIssueStops.map((stop) => {
			return {
				type: 'Feature',
				geometry: { type: 'Point', coordinates: [stop.lon, stop.lat] },
				properties: { id: stop.id }
			};
		});

		const otherTodosStopFeatures = otherTodosStops.map((stop) => {
			return {
				type: 'Feature',
				geometry: { type: 'Point', coordinates: [stop.lon, stop.lat] },
				properties: { id: stop.id }
			};
		});

		map.redrawStops(
			stopFeatures,
			unpositionedStopsFeatures,
			underpositionedStopFeatures,
			needsPicStopFeatures,
			reportIssueStopFeatures,
			otherTodosStopFeatures
		);
	}

	selectedRegion.subscribe((region) => {
		if (!map || !region) return;

		const mapParams = regionMapParams(region);
		map.setCenterAndZoom(mapParams.center, mapParams.zoom);
	});

	function handleStopClick(e) {
		$selectedStop = regionStopTodos[e.detail.id];
	}

	onDestroy(() => {
		mapLoaded = false;
	});
</script>

<TodoMap
	bind:this={map}
	mapParams={regionMapParams($selectedRegion)}
	on:load={async () => {
		mapLoaded = true;
		await tick();

		if (!loading) {
			refreshStops();
		}
	}}
	on:stop-click={handleStopClick}
>
	{#if loading}
		<div style="background-color: #33336699" class="z-[2000] absolute inset-0" />
		<div class="absolute inset-x-0 m-auto w-full md:w-96 w z-[2001]">
			<div
				class="m-2 p-4 bg-base-100 flex flex-col gap-4 rounded-2xl shadow-3xl border-2 border-warning max-h-full"
			>
				<span class="text-xl">A carregar</span>
				<span
					>Mapa: <progress
						class="progress progress-primary w-full"
						value={mapLoaded ? 100 : 0}
						max="100"
					/></span
				>
				<span
					>Paragens: <progress
						class="progress progress-primary w-full"
						value={stopsLoaded ? 100 : 0}
						max="100"
					/></span
				>
			</div>
		</div>
	{/if}
	<div class="absolute left-0 z-20 flex flex-col justify-center h-full">
		<div
			class="h-full lg:h-[95%] overflow-y-scroll bg-base-100 flex flex-col shrink gap-2 lg:rounded-r-xl shadow-md transition-all duration-300"
			class:w-[350px]={$selectedStop}
			class:p-4={$selectedStop}
			class:w-0={!$selectedStop}
		>
			{#if $selectedStop}
				<div class="relative">
					<button
						class="btn btn-circle btn-xs btn-error self-start absolute -top-2 -right-2"
						on:click={() => ($selectedStop = null)}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-6 w-6"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/></svg
						>
					</button>
					<StopTodoViewer
						canEdit={$decodedToken?.permissions?.is_admin}
						{selectedStop}
						on:todo-update={refreshStops}
						on:fly-to={(e) => map.flyTo(...e.detail)}
					/>
				</div>
			{/if}
		</div>
	</div>

	<div
		class="modal-box relative z-30 sm:max-w-5xl grid grid-cols-1"
		style="grid-template-rows: auto 1fr;"
		slot="search-dialog"
	>
		<div>
			<form method="dialog">
				<button class="btn btn-sm btn-circle btn-error absolute right-2 top-2">x</button>
			</form>
			<h3 class="text-lg font-bold">Pesquisar por paragem</h3>
			<input
				type="text"
				class="input input-primary input-bordered w-full"
				placeholder="Nome ou identificador"
				bind:value={$stopSearchInput}
			/>
		</div>
		{#if $stopSearchResults}
			<form method="dialog" class="flex flex-col gap-1 mt-2 overflow-y-scroll">
				{#each $stopSearchResults as result}
					<button
						class="card card-compact w-full bg-base-100 border-2 shadow-sm cursor-pointer"
						on:click={() => map.flyTo(result.lon, result.lat)}
					>
						<div class="card-body">
							<div class="flex gap-1">
								<span class="px-2 mr-1 bg-blue-500 rounded-full" />
								<h2 class="text-md font-semibold">
									<span class="text-md border-b-2 border-blue-500">{result.id}</span>
									{result.name}
								</h2>
							</div>
						</div>
					</button>
				{/each}
			</form>
		{/if}
	</div>
</TodoMap>
