<script>
	import { createEventDispatcher } from 'svelte';
	import SubrouteRow from './SubrouteRow.svelte';

	const dispatch = createEventDispatcher();

	export let subroutes;
	export let stops;
	export let groupIndex;
	export let canEdit;
	export let routeStops;

	let hoveredIndex;


	function drop(event) {
		event.preventDefault();
		const json = event.dataTransfer.getData('text/plain');
		const data = JSON.parse(json);

		dispatch('move-subroute', {
			srcGroup: data.groupIndex,
			dstGroup: groupIndex,
			itemIndex: data.itemIndex,
			subrouteId: data.subrouteId
		});
		hoveredIndex = null;
	}
</script>

<div
	class="border border-slate-200 shadow-sm rounded-md p-1 flex flex-col gap-1 bg-base-200"
	class:border-dotted={hoveredIndex === groupIndex}
	on:dragenter={() => (hoveredIndex = groupIndex)}
	on:dragleave={() => (hoveredIndex = null)}
	on:drop|stopPropagation={(event) => drop(event)}
	ondragover="return false"
>
	{#each subroutes as subroute, i (subroute.id)}
		{#if subroute._deleted}
			<span>({subroute.id}) {subroute.origin} - {subroute.destination} apagada.</span>
		{:else}
			<SubrouteRow
				{subroute}
				{groupIndex}
				{canEdit}
				indexInGroup={i}
				{stops}
				subrouteStops={routeStops[subroute.id] || []}
				on:subroute-change
				on:delete-subroute
			/>
		{/if}
	{/each}
</div>
