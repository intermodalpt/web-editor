<script>
	import GtfsCmpMap from './GtfsCmpMap.svelte';

	export let unpaired;
	export let stops;
	export let stopsByRef;
	export let idType = 1;
	export let showName = false;

	let showMap = false;
</script>

<div class="flex flex-col rounded-md border-[1px] p-1 bg-orange-50">
	<div class="flex flex-row w-full gap-2 items-center">
		<div class="flex flex-wrap gap-1">
			{#each unpaired.patterns as pattern}
				<div class="badge bg-orange-300">pat:{pattern}</div>
			{/each}
			{#each unpaired.headsigns as headsign}
				<div class="badge bg-orange-400">hs:{headsign}</div>
			{/each}
		</div>
	</div>
	<table>
		<tbody>
			<tr>
				{#each unpaired.stops as stopId}
					<td class="badge badge-sm border-y-2 bg-orange-200 font-bold">
						{#if idType == 2}{stopId}{:else}{$stopsByRef[stopId]?.id ?? `${stopId}`}{/if}
						{#if showName}: {$stopsByRef[stopId]?.name ?? ''}{/if}
					</td>
				{/each}
			</tr>
		</tbody>
	</table>
	{#if showMap}
		<GtfsCmpMap {stops} gtfsStops={unpaired.stops.map((gtfsId) => $stopsByRef[gtfsId]?.id)} />
	{/if}
	<div>
		<button
			on:click={() => (showMap = !showMap)}
			class="btn btn-xs btn-neutral"
			class:btn-outline={!showMap}>🗺️</button
		>
	</div>
</div>
