<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import { regionMapParams } from '$lib/utils';
	import { permissions } from '$lib/stores';
	import Icon from '$lib/components/Icon.svelte';
	import StopTodoViewer from './StopTodoViewer.svelte';
	import TodoMap from './TodoMap.svelte';
	import Menu from '../Menu.svelte';

	export let data;

	const region = data.region;
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

	function handleStopClick(e) {
		$selectedStop = regionStopTodos[e.detail.id];
	}
</script>

<Menu {region} page="todo" />

<TodoMap
	bind:this={map}
	mapParams={regionMapParams(region)}
	on:load={async () => {
		mapLoaded = true;
		await tick();
		refreshStops();
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
						<Icon name="close" class="h-6 w-6" />
					</button>
					<StopTodoViewer
						canEdit={$permissions?.stops?.modifyAttrs || $permissions?.stops?.contribModifyAttrs}
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
				<button class="btn btn-sm btn-circle btn-error absolute right-2 top-2">
					<Icon name="close" class="h-4 stroke-current" />
				</button>
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

<div class="card-body">
	<!-- <h2 class="card-title">Em falta</h2>
	... -->
</div>
