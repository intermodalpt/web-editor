<script>
	import { createEventDispatcher } from 'svelte';
	import { subrouteTitle } from '../../aux.js';
	import GtfsCmpMap from './GtfsCmpMap.svelte';

	const dispatch = createEventDispatcher();

	export let unpaired;
	export let unpairedGtfs;
	export let stops;
	export let idType = 1;
	export let showName = false;
	export let canEdit = false;

	let showMap = false;
	let pairRef = null;
</script>

<div class="flex flex-col gap-1 rounded-md border-[1px] p-1 bg-blue-50">
	<div class="flex flex-row w-full gap-2 items-center">
		<div
			class="h-6 w-12 rounded-xl flex items-center justify-center font-bold bg-blue-500 text-white"
		>
			{unpaired.subroute.id}
		</div>
		<span>
			{subrouteTitle(unpaired.subroute)}
		</span>
	</div>
	<table>
		<tbody>
			<tr>
				{#each unpaired.imlStops as stopId, i}
					<td class="badge badge-sm border-y-2 bg-blue-200 font-bold">
						{#if idType == 2}{unpaired.gtfsStops[i]}{:else}{stopId}{/if}
						{#if $stops && showName}: {$stops[stopId]?.name ?? ''}{/if}
					</td>
				{/each}
			</tr>
		</tbody>
	</table>
	{#if showMap}
		<GtfsCmpMap {stops} imlStops={unpaired.imlStops} />
	{/if}
	<div class="flex gap-2">
		<button
			on:click={() => (showMap = !showMap)}
			class="btn btn-sm btn-neutral"
			class:btn-outline={!showMap}>🗺️</button
		>
		<div class="form-control" class:hidden={!canEdit}>
			<label class="input-group">
				<span>Correspondente</span>
				<select class="input input-sm input-bordered" disabled={!canEdit} bind:value={pairRef}>
					{#each unpairedGtfs || [] as unpairedCluster, i}
						<option value={unpairedCluster.patterns[0]}
							>{unpairedCluster.patterns.join(';')} -
							{unpairedCluster.headsigns.join(';')}</option
						>
					{/each}
				</select>
				{#if pairRef}
					<button
						class="btn btn-sm btn-primary"
						on:click={() => dispatch('pair', { subroute: unpaired.subroute, pairRef: pairRef })}
						>Emparelhar</button
					>
				{/if}
			</label>
		</div>
	</div>
</div>
