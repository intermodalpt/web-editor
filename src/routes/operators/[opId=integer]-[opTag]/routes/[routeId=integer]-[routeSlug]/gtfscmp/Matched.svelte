<script>
	import { createEventDispatcher } from 'svelte';
	import { subrouteTitle } from '../../aux.js';
	import GtfsCmpMap from './GtfsCmpMap.svelte';

	const dispatch = createEventDispatcher();

	export let pairing;
	export let stops;
	// Whether to show IML or GTFS stop IDs
	export let idType = 1;
	export let showName = false;
	export let canEdit = false;

	let showMap = false;
</script>

<div class="flex flex-col rounded-md border-[1px] p-1 bg-green-50">
	<div class="flex flex-row w-full gap-2 items-center">
		<div
			class="h-6 w-12 rounded-xl flex items-center justify-center font-bold bg-blue-500 text-white"
		>
			{pairing.subroute.id}
		</div>
		<span>
			{subrouteTitle(pairing.subroute)}
		</span>
		<div class="h-6 w-6 rounded-xl flex items-center justify-center font-bold bg-base-300">»</div>
		<div class="flex flex-wrap gap-1">
			{#each pairing.gtfsPatterns as pattern}
				<div class="badge bg-orange-300">pat:{pattern}</div>
			{/each}
			{#each pairing.gtfsHeadsigns as headsign}
				<div class="badge bg-orange-400">hs:{headsign}</div>
			{/each}
		</div>
	</div>
	<div class="flex flex-col gap-1 my-1">
		{#if pairing.matches}
			<div class="flex flex-wrap gap-[1px]">
				{#each pairing.imlStops as stopId, i}
					<span class="badge badge-sm badge-success text-white font-bold">
						{idType == 2 ? pairing.gtfsStops[i] : stopId}
						{#if showName && $stops}
							:{$stops[stopId]?.name ?? ''}
						{/if}</span
					>
				{/each}
			</div>
		{:else}
			<div class="flex flex-wrap gap-[1px]">
				{#each pairing.alignedIml as stopId, i}
					<span
						class="badge badge-sm border-2 border-blue-500 text-black font-bold"
						class:bg-lime-100={pairing.alignedGtfs[i] == stopId}
						class:badge-warning={pairing.alignedGtfs[i] == null}
						class:badge-error={pairing.alignedGtfs[i] != stopId && pairing.alignedGtfs[i] != null}
						>{(idType == 2 ? pairing.alignedGtfs[i] : stopId) ?? ''}{#if showName && $stops}: {$stops[
								stopId
							]?.name ?? ''}{/if}
					</span>
				{/each}
			</div>
			<div class="flex flex-wrap gap-[1px]">
				{#each pairing.alignedGtfs as stopId, i}
					<span
						class="badge badge-sm border-2 border-orange-500 text-black font-bold"
						class:bg-lime-100={pairing.alignedIml[i] == stopId}
						class:badge-warning={stopId == null || pairing.alignedIml[i] == null}
						class:badge-error={pairing.alignedIml[i] != stopId &&
							stopId != null &&
							pairing.alignedIml[i] != null}
						>{(idType == 2 ? pairing.alignedGtfs[i] : stopId) ?? ''}
						{#if showName && $stops}: {$stops[stopId]?.name ?? ''}{/if}
					</span>
				{/each}
			</div>
		{/if}
	</div>
	{#if showMap}
		<GtfsCmpMap {stops} imlStops={pairing.imlStops} gtfsStops={pairing.gtfsStops} />
	{/if}
	<div class="flex gap-2 justify-end">
		<span
			class="badge"
			class:badge-success={pairing.isCurrentValidated}
			class:badge-error={!pairing.isCurrentValidated}>IML</span
		>
		<span
			class="badge"
			class:badge-success={pairing.isCorrespondenceValidated}
			class:badge-error={!pairing.isCorrespondenceValidated}>GTFS</span
		>
		<span
			class="badge"
			class:hidden={!pairing.hasCacheDisagreement}
			class:badge-warning={pairing.hasCacheDisagreement}>Cache</span
		>
		<button
			on:click={() => (showMap = !showMap)}
			class="btn btn-xs btn-neutral bg-white"
			class:btn-outline={!showMap}>🗺️</button
		>
		<button
			class="btn btn-xs btn-info btn-outline bg-white"
			class:hidden={!canEdit || pairing.matches}
			on:click={() => {
				dispatch('gtfs-replace', { pairing: pairing });
			}}>GTFS👉IML</button
		>
		<button
			class="btn btn-xs btn-info btn-outline bg-white"
			class:hidden={!canEdit || pairing.isCorrespondenceValidated}
			on:click={() => {
				dispatch('gtfs-ack', { pairing: pairing });
			}}>ACK GTFS</button
		>
		<button
			class="btn btn-xs btn-info btn-outline bg-white"
			class:hidden={!canEdit || pairing.isCurrentValidated}
			on:click={() => {
				dispatch('iml-ack', { pairing: pairing });
			}}>ACK IML</button
		>
	</div>
</div>
