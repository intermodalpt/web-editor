<script>
	import { createEventDispatcher } from 'svelte';

	let dispatch = createEventDispatcher();

	export let vias = [];
	export let canEdit;
</script>

{#if canEdit}
	<div class="border rounded-md p-1 flex gap-1 flex-nowrap">
		{#each vias as via, i}
			<button
				class="border border-blue-400 text-blue-700 bg-blue-200 rounded-full px-2"
				on:click={() => {
					dispatch('open', { index: i });
				}}>{via.name}</button
			>
		{/each}
		<button
			class="border border-info text-info hover:bg-info hover:text-info-content rounded-full px-1 whitespace-nowrap"
			on:click={() => {
				dispatch('new');
			}}>+</button
		>
	</div>
{:else}
	<div class="bg-base-200 min-h-8 rounded-md p-1 flex gap-1 flex-nowrap">
		{#each vias as via}
			<span class="bg-base-300 rounded-md px-2 whitespace-nowrap">{via.name}</span>
		{/each}
	</div>
{/if}
