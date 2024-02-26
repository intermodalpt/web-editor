<script>
	import { subrouteTitle } from '../../aux.js';
	import GtfsCmpMap from './GtfsCmpMap.svelte';

	export let unpaired;
	export let stops;
	export let idType = 1;
	export let showName = false;

	let showMap = false;
</script>

<div class="flex flex-col rounded-md border-[1px] p-1 bg-blue-50">
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
	<div>
		<button
			on:click={() => (showMap = !showMap)}
			class="btn btn-xs btn-neutral"
			class:btn-outline={!showMap}>🗺️</button
		>
	</div>
</div>
