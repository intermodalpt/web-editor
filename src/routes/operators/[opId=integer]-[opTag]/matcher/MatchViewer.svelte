<script>
	import { createEventDispatcher } from 'svelte';
	import { derived } from 'svelte/store';
	import { apiServer } from '$lib/settings.js';
	import { distance } from '$lib/utils.js';
	import CoordViewer from '$lib/components/CoordViewer.svelte';

	const dispatch = createEventDispatcher();

	export let canEdit = false;

	export let operator;
	export let gtfsStops;
	export let selectedGtfsStop;
	export let selectedOperatorStop;
	export let selectedUnusedStop;
	export let credibleSources;
	export let previewedTrip;

	let pairingDialog;
	let newPairingOfficialName;
	let newPairingRef;
	let newPairingSource;

	$: newPairingGtfsStop = gtfsStops[newPairingRef];

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
				newPairingOfficialName = $selectedOperatorStop.name;
				newPairingRef = $selectedOperatorStop.stop_ref;
				newPairingSource = $selectedOperatorStop.source;

				return {
					id: $selectedOperatorStop.id,
					name: $selectedOperatorStop.name,
					lat: $selectedOperatorStop.lat,
					lon: $selectedOperatorStop.lon,
					layer: 'operator'
				};
			}
			if ($selectedUnusedStop) {
				newPairingOfficialName = $selectedUnusedStop.name;
				newPairingRef = null;
				newPairingSource = null;

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

	$: newPairingImlToGtfsDist =
		$selectedImlStop && newPairingGtfsStop
			? Math.round(
					distance(
						$selectedImlStop.lat,
						$selectedImlStop.lon,
						newPairingGtfsStop.lat,
						newPairingGtfsStop.lon
					)
				)
			: null;

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
	<a class="btn btn-xs shadow-sm p-2 font-bold" href="/operators/{operator.id}-{operator.tag}">
		{operator.name}
	</a>
</div>
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
		<div class="flex gap-1 items-center">
			<button
				class="btn btn-xs text-blue-200 bg-blue-500 border-blue-600"
				on:click={() => dispatch('fly-to', [$selectedImlStop.lon, $selectedImlStop.lat])}
			>
				{$selectedImlStop?.id}
			</button>
			<span class="font-bold">{$selectedImlStop?.name}</span>
		</div>
		<CoordViewer lat={$selectedImlStop.lat} lon={$selectedImlStop.lon} />
		{#if $selectedOperatorStop}
			<div class="flex gap-2 items-center">
				<h2 class="text-xs font-bold">Emparelhamento</h2>
				<span class="text-xs">({$selectedOperatorStop?.source})</span>
				<button class="btn btn-primary btn-xs" on:click={() => pairingDialog.show()}>Editar</button>
			</div>
			<div class="flex gap-1 items-center">
				{#if $selectedOperatorStop.gtfsStop}
					<button
						class="btn btn-xs text-orange-200 bg-orange-600 border-orange-600"
						on:click={() => {
							$selectedGtfsStop = $selectedOperatorStop.gtfsStop;

							dispatch('fly-to', [
								$selectedOperatorStop.gtfsStop.lon,
								$selectedOperatorStop.gtfsStop.lat
							]);
						}}>{$selectedOperatorStop?.stop_ref}</button
					>
				{:else}
					<span class="btn btn-xs text-orange-600 bg-white border-orange-600"
						>⚠️{$selectedOperatorStop?.stop_ref}</span
					>
				{/if}
				{$selectedOperatorStop?.name}
				{#if $selectedOperatorStop.gtfsStop && $selectedOperatorStop.name != $selectedOperatorStop.gtfsStop?.stop_name}⚠️{/if}
			</div>
		{/if}
		<h2 class="text-sm self-center font-semibold">Rotas</h2>
		<div class="w-full flex flex-wrap gap-1">
			{#each $selectedStopRoutes || [] as route}
				<button
					class="badge badge-secondary badge-outline"
					on:click={() => {
						alert(route.code + ' - ' + route.name);
					}}
				>
					{route.code}
				</button>
			{/each}
		</div>
	{:else}
		<div class="text-slate-500 font-semibold text-lg">
			Pontos <span class="border-b-2 border-blue-500">azuis</span> denotam paragens no intermodal.
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
		<div class="flex gap-2 items-center">
			<button
				class="btn btn-xs text-orange-200 bg-orange-600 border-orange-600"
				on:click={() => {
					dispatch('fly-to', [$selectedGtfsStop.lon, $selectedGtfsStop.lat]);
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

<dialog bind:this={pairingDialog} class="modal modal-bottom sm:modal-middle">
	<div class="modal-box relative">
		<form method="dialog">
			<button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">x</button>
		</form>
		<h3 class="font-bold text-lg">Emparelhamento</h3>
		<form method="dialog" class="flex flex-col gap-1 mt-2 overflow-y-scroll">
			<div class="form-control w-full">
				<label class="input-group">
					<span class="w-32">Nome oficial</span>
					<input
						type="text"
						bind:value={newPairingOfficialName}
						class="input input-bordered w-full input-sm"
						disabled={!canEdit}
					/>
				</label>
			</div>
			<div class="form-control w-full">
				<label class="input-group">
					<span class="w-32">Referência</span>
					<input
						type="text"
						bind:value={newPairingRef}
						class="input input-bordered w-full input-sm"
						disabled={!canEdit}
					/>
				</label>
			</div>
			<div class="pl-3 border-l-2 border-orange-600 flex flex-col gap-1">
				{#if newPairingGtfsStop}
					<div class="flex gap-1">
						<span class="font-bold">{newPairingGtfsStop.stop_name}</span>
						{#if newPairingOfficialName != newPairingGtfsStop.stop_name}
							<button
								class="btn btn-xs btn-secondary"
								on:click={() => {
									newPairingOfficialName = newPairingGtfsStop.stop_name;
								}}>Replicar</button
							>
						{/if}
					</div>
				{/if}
				{#if newPairingImlToGtfsDist}
					<span
						class="w-fit"
						class:border-b-2={newPairingImlToGtfsDist > 30}
						class:border-warning={newPairingImlToGtfsDist > 30 && newPairingImlToGtfsDist <= 100}
						class:border-error={newPairingImlToGtfsDist > 100}
					>
						Dista {newPairingImlToGtfsDist} metros
					</span>
				{/if}
			</div>
			<div class="flex justify-end">
				<button
					class="btn btn-primary"
					on:click={() => {
						dispatch('pair', {
							id: $selectedImlStop.id,
							officialName: newPairingOfficialName,
							ref: newPairingRef
						});
						pairingDialog.close();
					}}>Guardar</button
				>
			</div>
		</form>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
