<script>
	import { createEventDispatcher } from 'svelte';
	import { derived } from 'svelte/store';
	import { apiServer } from '$lib/settings.js';
	import CoordViewer from '$lib/components/CoordViewer.svelte';

	const dispatch = createEventDispatcher();

	export let canEdit = false;

	export let operator;
	export let selectedGtfsStop;
	export let selectedOperatorStop;
	export let selectedUnusedStop;
	export let credibleSources;
	export let previewedTrip;

	const selectedGtfsStopRoutes = derived(selectedGtfsStop, ($selectedGTFSStop) => {
		if ($selectedGTFSStop == null) return [];
		return Array.from($selectedGTFSStop.routes)
			.sort((a, b) => a.id.localeCompare(b.id))
			.map((r) => {
				const filteredRoute = Object.assign({}, r);
				filteredRoute.trips = filteredRoute.trips.filter((t) =>
					t.stops.includes($selectedGTFSStop.id)
				);
				return filteredRoute;
			});
	});

	const selectedImlStop = derived(
		[selectedOperatorStop, selectedUnusedStop],
		([$selectedOperatorStop, $selectedUnusedStop]) => {
			if ($selectedOperatorStop) {
				return {
					id: $selectedOperatorStop.id,
					name: $selectedOperatorStop.official_name,
					lat: $selectedOperatorStop.lat,
					lon: $selectedOperatorStop.lon,
					layer: 'operator'
				};
			}
			if ($selectedUnusedStop) {
				return {
					id: $selectedUnusedStop.id,
					name: $selectedUnusedStop.name,
					lat: $selectedUnusedStop.lat,
					lon: $selectedUnusedStop.lon,
					layer: 'region'
				};
			}
			return null;
		}
	);

	const selectedStopRoutes = derived(selectedImlStop, ($selectedImlStop, set) => {
		const selectedStopId = $selectedImlStop?.id;

		if (!selectedStopId) return null;

		fetch(`${apiServer}/v1/stops/${selectedStopId}/spider`)
			.then((r) => r.json())
			.then((r) => {
				set(
					Object.values(r.routes).sort(
						(a, b) => parseInt(a.code) - parseInt(b.code) || a.code.localeCompare(b.code)
					)
				);
			});
	});

	const hasMutualLink = derived(
		[selectedOperatorStop, selectedGtfsStop],
		([$selectedOperatorStop, $selectedGtfsStop]) => {
			if (!$selectedOperatorStop || !$selectedGtfsStop) {
				return false;
			}
			return $selectedOperatorStop.stop_ref === $selectedGtfsStop.stop_id;
		}
	);
</script>

<div class="justify-center w-full">
	<a class="btn btn-xs shadow-sm p-2 font-bold" href="/operators/{operator.tag}">
		{operator.name}
	</a>
</div>
<div class="flex flex-col gap-2 p-2 rounded-lg border-2 border-orange-600 relative">
	{#if $selectedGtfsStop}
		<button
			class="btn btn-circle btn-xs btn-error self-start absolute -top-2 -right-2"
			on:click={() => ($selectedGtfsStop = null)}
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
		<div class="flex gap-2">
			<button
				class="btn btn-xs text-orange-200 bg-orange-600 border-orange-600"
				on:click={() => {
					if ($selectedGtfsStop) {
						dispatch('fly-to', [$selectedGtfsStop.lon, $selectedGtfsStop.lat]);
						// flyToGtfsStop($selectedGtfsStop);
					}
				}}
			>
				{$selectedGtfsStop?.stop_id}
			</button>
			<span class="font-bold">{$selectedGtfsStop?.stop_name}</span>
		</div>
		<div class="border border-base-300 rounded-md p-2">
			<h1 class="text-sm font-semibold text-center">Rotas</h1>
			<div class="max-h-64 xl:max-h-96 overflow-scroll">
				<ul class="flex flex-col gap-3">
					{#each $selectedGtfsStopRoutes as route}
						<li class="flex flex-col">
							<span class="badge badge-neutral">{route.id}</span>
							<ul class="ml-4 flex flex-col gap-2">
								{#each route.trips as trip}
									<li class="flex flex-col">
										<div class="flex">
											<button
												class="btn btn-neutral btn-outline btn-xs !rounded-r-0 grow"
												on:click={() => {
													// flyToTrip(trip);
													dispatch('fly-to-trip', { trip: trip });
													$previewedTrip = trip;
												}}>{trip.id}</button
											>
											<button
												class="btn btn-xs !rounded-l-0"
												class:btn-primary={trip === $previewedTrip}
												on:click={() => {
													$previewedTrip = trip === $previewedTrip ? null : trip;
												}}>Ver</button
											>
										</div>
										<span>Destino: <span class="font-bold">{trip.headsign}</span></span>
									</li>
								{/each}
							</ul>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	{:else}
		<div class="text-slate-500 font-semibold text-lg">
			Pontos <span class="border-b-2 border-orange-600">laranja</span> denotam paragens no
			<a href="https://en.wikipedia.org/wiki/GTFS" target="_blank" class="link-primary font-bold"
				>GTFS</a
			> do operador.
		</div>
	{/if}
</div>

{#if canEdit}
	<div class="flex justify-center">
		{#if $selectedGtfsStop && $selectedOperatorStop}
			{#if !$hasMutualLink || ($hasMutualLink && !credibleSources.includes($selectedOperatorStop?.source))}
				<button
					class="btn btn-primary btn-sm"
					on:click={() => {
						// connectStops($selectedOperatorStop, $selectedGtfsStop);
						dispatch('connect', {
							operatorStop: $selectedOperatorStop,
							gtfsStop: $selectedGtfsStop
						});
					}}>↑ Ligar paragens ↓</button
				>
			{:else if $hasMutualLink}
				<button
					class="btn btn-error btn-sm"
					on:click={() => {
						// disconnectStops($selectedOperatorStop, $selectedGtfsStop);
						dispatch('disconnect', {
							operatorStop: $selectedOperatorStop,
							gtfsStop: $selectedGtfsStop
						});
					}}>↑ Apagar ligação ↓</button
				>
			{/if}
		{/if}
	</div>
{/if}
<div class="flex flex-col gap-2 p-2 rounded-lg border-2 border-blue-500 relative">
	{#if $selectedImlStop}
		<button
			class="btn btn-circle btn-xs btn-error self-start absolute -top-2 -right-2"
			on:click={() => {
				$selectedOperatorStop = null;
				$selectedUnusedStop = null;
			}}
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
		<div class="flex gap-1">
			<div
				class="btn btn-xs text-blue-200 bg-blue-500 border-blue-600"
				on:click={() => dispatch('fly-to', [$selectedImlStop.lon, $selectedImlStop.lat])}
				on:keypress={() => dispatch('fly-to', [$selectedImlStop.lon, $selectedImlStop.lat])}
			>
				{$selectedImlStop?.id}
			</div>
			<span class="font-bold">{$selectedImlStop?.name}</span>
		</div>
		<CoordViewer lat={$selectedImlStop.lat} lon={$selectedImlStop.lon} />
		{#if $selectedOperatorStop && !$hasMutualLink}
			<div class="flex gap-1">
				<h1 class="text-xs font-bold">Ligada a</h1>
				{#if $selectedOperatorStop.gtfsStop}
					<button
						class="btn btn-xs text-orange-200 bg-orange-600 border-orange-600"
						on:click={() => {
							$selectedGtfsStop = $selectedOperatorStop.gtfsStop;

							dispatch('fly-to', [
								$selectedOperatorStop.gtfsStop.lon,
								$selectedOperatorStop.gtfsStop.lat
							]);
							// flyToGtfsStop($selectedOperatorStop.gtfsStop);
						}}>{$selectedOperatorStop?.stop_ref}</button
					>
				{:else}
					<button class="btn btn-xs text-orange-200 bg-orange-600 border-orange-600"
						>⚠️{$selectedOperatorStop?.stop_ref}</button
					>
				{/if}
			</div>
			<textarea class="w-full">{JSON.stringify($selectedOperatorStop)}</textarea>
		{/if}
		<h2 class="text-sm self-center font-semibold">Rotas</h2>
		<div class="w-full flex flex-wrap gap-1">
			{#each $selectedStopRoutes || [] as route}
				<div
					class="badge badge-secondary badge-outline"
					on:click={() => {
						alert(route.code + ' - ' + route.name);
					}}
					on:keypress={() => {
						alert(route.code + ' - ' + route.name);
					}}
				>
					{route.code}
				</div>
			{/each}
		</div>
	{:else}
		<div class="text-slate-500 font-semibold text-lg">
			Pontos <span class="border-b-2 border-blue-500">azuis</span> denotam paragens no intermodal.
		</div>
	{/if}
</div>
