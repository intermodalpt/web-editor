<script>
	import { subrouteTitle } from '../../aux.js';
	import GtfsCmpMap from './GtfsCmpMap.svelte';

	export let pairing;
	export let stops;
	export let idType = 1;
	export let showName = false;

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
	<table>
		<tbody>
			{#if pairing.matches}
				<tr>
					{#each pairing.imlStops as stopId, i}
						<td class="badge badge-sm badge-success text-white font-bold">
							{#if idType == 2}{pairing.gtfsStops[i]}{:else}{stopId}{/if}
							{#if showName && $stops}
								:{$stops[stopId]?.name ?? ''}
							{/if}</td
						>
					{/each}
				</tr>
			{:else}
				<tr>
					{#each pairing.alignedIml as stopId, i}
						<td
							class="badge badge-sm border-2 border-blue-500 text-white font-bold"
							class:badge-success={pairing.alignedGtfs[i] == stopId}
							class:badge-warning={pairing.alignedGtfs[i] == null}
							class:badge-error={pairing.alignedGtfs[i] != stopId && pairing.alignedGtfs[i] != null}
							>{stopId}{#if showName && $stops}: {$stops[stopId]?.name ?? ''}{/if}
						</td>
					{/each}
				</tr>
				<tr>
					{#each pairing.alignedGtfs as stopId, i}
						<td
							class="badge badge-sm border-2 border-orange-500 text-white font-bold"
							class:badge-success={pairing.alignedIml[i] == stopId}
							class:badge-warning={pairing.alignedIml[i] == null}
							class:badge-error={pairing.alignedIml[i] != stopId && pairing.alignedIml[i] != null}
							>{stopId}{#if showName && $stops}: {$stops[stopId]?.name ?? ''}{/if}
						</td>
					{/each}
				</tr>
			{/if}
		</tbody>
	</table>
	{#if showMap}
		<GtfsCmpMap {stops} imlStops={pairing.imlStops} gtfsStops={pairing.gtfsStops} />
	{/if}
	<div>
		<button
			on:click={() => (showMap = !showMap)}
			class="btn btn-xs btn-neutral"
			class:btn-outline={!showMap}>🗺️</button
		>
	</div>
</div>
