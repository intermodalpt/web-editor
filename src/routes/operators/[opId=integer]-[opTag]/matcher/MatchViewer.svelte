<script>
	import { createEventDispatcher } from 'svelte';
	import { derived } from 'svelte/store';
	import { apiServer } from '$lib/settings.js';
	import { distance } from '$lib/utils.js';
	import Icon from '$lib/components/Icon.svelte';
	import CoordViewer from '$lib/components/CoordViewer.svelte';
	import BooleanToggle from '$lib/components/BooleanToggle.svelte';

	const dispatch = createEventDispatcher();

	export let canEdit = false;

	export let operator;
	export let gtfsStops;
	export let selectedGtfsStop;
	export let selectedOperatorStop;
	export let selectedUnusedStop;
	export let selectedOsmStop;
	export let credibleSources;
	export let previewedTrip;

	let newStopDialog;
	let newStopSource = null;
	let newStopIsGhost = true;
	let newStopShouldPair = true;
	let newStopName;
	let newStopRef;
	let newStopOfficialName;
	let createAsUnverified = true;
	$: newStopLon =
		newStopSource == 'osm'
			? $selectedOsmStop?.lon
			: newStopSource == 'gtfs'
				? $selectedGtfsStop?.lon
				: null;
	$: newStopLat =
		newStopSource == 'osm'
			? $selectedOsmStop?.lat
			: newStopSource == 'gtfs'
				? $selectedGtfsStop?.lat
				: null;

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
				newPairingOfficialName = $selectedOperatorStop.official_name;
				newPairingRef = $selectedOperatorStop.stop_ref;
				newPairingSource = $selectedOperatorStop.source;

				return {
					id: $selectedOperatorStop.id,
					name: $selectedOperatorStop.name,
					lat: $selectedOperatorStop.lat,
					lon: $selectedOperatorStop.lon,
					_ori: $selectedOperatorStop._ori,
					layer: 'operator'
				};
			}
			if ($selectedUnusedStop) {
				newPairingOfficialName = null;
				newPairingRef = null;
				newPairingSource = null;

				return {
					id: $selectedUnusedStop.id,
					name: $selectedUnusedStop.name,
					lat: $selectedUnusedStop.lat,
					lon: $selectedUnusedStop.lon,
					_ori: $selectedUnusedStop._ori,
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

	selectedGtfsStop.subscribe((value) => {
		newStopName = value?.stop_name;
		newStopOfficialName = value?.stop_name;
		newStopRef = value?.stop_id;
		newStopSource = 'gtfs';
	});

	selectedOsmStop.subscribe((osmStop) => {
		newStopName = osmStop?.name;
		newStopOfficialName = osmStop?.name;
		newStopRef = null;
		newStopSource = 'osm';
	});

	function setNewStopSource(source) {
		switch (source) {
			case 'gtfs':
				newStopName = $selectedGtfsStop?.stop_name;
				newStopOfficialName = $selectedGtfsStop?.stop_name;
				newStopRef = $selectedGtfsStop?.stop_id;
				newStopSource = 'gtfs';
				break;
			case 'osm':
				newStopName = $selectedOsmStop?.name;
				newStopOfficialName = $selectedOsmStop?.name;
				newStopRef = null;
				newStopSource = 'osm';
		}
	}

	const hasMutualLink = derived(
		[selectedOperatorStop, selectedGtfsStop],
		([$selectedOperatorStop, $selectedGtfsStop]) => {
			if (!$selectedOperatorStop || !$selectedGtfsStop) {
				return false;
			}
			return $selectedOperatorStop.stop_ref === $selectedGtfsStop.stop_id;
		}
	);

	function handleKeydown(e) {
		switch (e.key) {
			case 'p':
				if (
					!$selectedImlStop ||
					!$selectedGtfsStop ||
					($hasMutualLink && credibleSources.includes($selectedOperatorStop?.source))
				) {
					return;
				}

				dispatch('pair', {
					stop: $selectedImlStop,
					pairing: {
						official_name: $selectedGtfsStop.stop_name,
						stop_ref: $selectedGtfsStop.stop_id
					}
				});
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

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
			<Icon name="close" class="h-6 w-6" />
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
				<button class="btn btn-secondary btn-xs" on:click={() => pairingDialog.show()}
					>Editar</button
				>
				<button
					class="btn btn-error btn-xs"
					on:click={() =>
						dispatch('unpair', {
							operatorStop: $selectedOperatorStop
						})}>Apagar</button
				>
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
				{$selectedOperatorStop?.official_name || $selectedOperatorStop?.name}
				{#if $selectedOperatorStop.gtfsStop && $selectedOperatorStop.official_name != $selectedOperatorStop.gtfsStop?.stop_name}⚠️{/if}
			</div>
		{:else if $selectedUnusedStop}
			<div class="flex gap-2 items-center">
				<h2 class="text-xs font-bold">Emparelhamento</h2>
				<button class="btn btn-secondary btn-xs" on:click={() => pairingDialog.show()}>Criar</button
				>
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
		{#if $selectedGtfsStop && $selectedImlStop}
			{#if !$hasMutualLink || ($hasMutualLink && !credibleSources.includes($selectedOperatorStop?.source))}
				<button
					class="btn btn-primary btn-sm"
					on:click={() => {
						dispatch('pair', {
							stop: $selectedImlStop,
							pairing: {
								official_name: $selectedGtfsStop.stop_name,
								stop_ref: $selectedGtfsStop.stop_id
							}
						});
					}}>↑ Emparelhar ↓</button
				>
			{:else if $hasMutualLink}
				<button
					class="btn btn-error btn-sm"
					on:click={() => {
						dispatch('unpair', {
							operatorStop: $selectedOperatorStop
						});
					}}>↑ Desemparelhar ↓</button
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
			<Icon name="close" class="h-6 w-6" />
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
		<div class="flex justify-between">
			<CoordViewer lat={$selectedGtfsStop.lat} lon={$selectedGtfsStop.lon} />
			<div>
				<button
					class="btn btn-xs btn-secondary btn-outline"
					class:hidden={$selectedGtfsStop.seen}
					on:click={() => {
						newStopDialog.show();
					}}>Instanciar</button
				>
			</div>
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

<div class="flex flex-col gap-2 p-2 rounded-lg border-2 border-green-600 relative">
	{#if $selectedOsmStop}
		<button
			class="btn btn-circle btn-xs btn-error self-start absolute -top-2 -right-2"
			on:click={() => ($selectedOsmStop = null)}
		>
			<Icon name="close" class="h-6 w-6" />
		</button>
		<div class="flex gap-2 items-center">
			<button
				class="btn btn-xs text-green-200 bg-green-600 border-green-600"
				on:click={() => {
					dispatch('fly-to', [$selectedOsmStop.lon, $selectedOsmStop.lat]);
				}}
			>
				{$selectedOsmStop?.id}
			</button>
			<span class="font-bold">{$selectedOsmStop?.name}</span>
		</div>
		<div class="flex justify-between">
			<CoordViewer lat={$selectedOsmStop.lat} lon={$selectedOsmStop.lon} />
			<div>
				<button
					class="btn btn-xs btn-secondary btn-outline"
					class:hidden={$selectedOsmStop.tml_id}
					on:click={() => {
						newStopDialog.show();
					}}>Instanciar</button
				>
			</div>
		</div>
	{:else}
		<div class="text-slate-500 font-semibold text-lg">
			Pontos <span class="border-b-2 border-green-600">verdes</span> denotam paragens no OpenStreetMap.
		</div>
	{/if}
</div>

<dialog bind:this={pairingDialog} class="modal modal-bottom sm:modal-middle">
	<div class="modal-box relative">
		<form method="dialog">
			<button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
				<Icon name="close" class="h-4 stroke-current" />
			</button>
		</form>
		<h3 class="font-bold text-lg">Emparelhamento</h3>
		<form method="dialog" class="flex flex-col gap-1 mt-2 overflow-y-scroll">
			<div class="form-control w-full">
				<label class="input-group">
					<span class="w-36">Nome oficial</span>
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
					<span class="w-36">Referência</span>
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
							stop: $selectedImlStop,
							pairing: {
								official_name: newPairingOfficialName,
								stop_ref: newPairingRef
							}
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

<dialog bind:this={newStopDialog} class="modal modal-bottom sm:modal-middle">
	<div class="modal-box relative">
		<form method="dialog">
			<button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
				<Icon name="close" class="h-4 stroke-current" />
			</button>
		</form>
		<h3 class="font-bold text-lg">Emparelhamento</h3>
		<form method="dialog" class="flex flex-col gap-1 mt-2 overflow-y-scroll">
			<div class="form-control w-full">
				{#if $selectedGtfsStop && $selectedOsmStop}
					<div class="join my-2">
						<button
							class="btn join-item btn-xs"
							class:btn-primary={newStopSource == 'osm'}
							on:click|preventDefault={() => setNewStopSource('osm')}>OSM</button
						>
						<button
							class="btn join-item btn-xs"
							class:btn-primary={newStopSource == 'gtfs'}
							on:click|preventDefault={() => setNewStopSource('gtfs')}>GTFS</button
						>
					</div>
				{/if}
				<label class="input-group">
					<span class="w-36">Nome</span>
					<input
						type="text"
						bind:value={newStopName}
						class="input input-bordered w-full input-sm"
						disabled={!canEdit}
					/>
				</label>
			</div>
			<div class="form-control">
				<div class="input-group">
					<span class="w-24">Emparelhar</span>
					<BooleanToggle
						bind:state={newStopShouldPair}
						disabled={!canEdit}
						compact={true}
						nullable={false}
					/>
				</div>
			</div>
			<div class="form-control w-full">
				<label class="input-group" class:opacity-50={!newStopShouldPair}>
					<span class="w-36">Nome oficial</span>
					<input
						type="text"
						bind:value={newStopOfficialName}
						class="input input-bordered w-full input-sm"
						disabled={!canEdit || !newStopShouldPair}
					/>
				</label>
			</div>
			<div class="form-control w-full">
				<label class="input-group" class:opacity-50={!newStopShouldPair}>
					<span class="w-36">Referência</span>
					<input
						type="text"
						bind:value={newStopRef}
						class="input input-bordered w-full input-sm"
						disabled={!canEdit || !newStopShouldPair}
					/>
				</label>
			</div>
			<div class="form-control">
				<div class="input-group">
					<span class="w-24">Fantasma</span>
					<BooleanToggle
						bind:state={newStopIsGhost}
						disabled={!canEdit}
						compact={true}
						nullable={false}
					/>
				</div>
			</div>
			<div class="form-control">
				<div class="input-group">
					<span>Anotar por verificar</span>
					<BooleanToggle
						bind:state={createAsUnverified}
						disabled={!canEdit}
						compact={true}
						nullable={false}
					/>
				</div>
			</div>
			<div class="flex justify-end">
				<button
					class="btn btn-primary"
					on:click={() => {
						dispatch('create-stop', {
							stop: {
								lat: newStopLat,
								lon: newStopLon,
								isGhost: newStopIsGhost,
								name: newStopName,
								officialName: newStopShouldPair ? newStopOfficialName : undefined,
								ref: newStopShouldPair ? newStopRef : undefined,
								osmId: newStopSource == 'osm' ? $selectedOsmStop?.id : null,
								license: newStopSource == 'osm' ? 'ODbL' : 'GTFS'
							},
							pair: newStopShouldPair,
							tagUnverified: createAsUnverified
						});

						newStopDialog.close();
					}}>Guardar</button
				>
			</div>
		</form>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
