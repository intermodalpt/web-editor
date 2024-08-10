<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let feature: Feature;

	const dispatch = createEventDispatcher();

	function deleteFeature() {
		dispatch('delete', { feature });
	}
	feature.type;
</script>

{#if feature.type === 'point'}
	<div class="flex justify-between items-center p-1 gap-1">
		<span class="bg-base-200 rounded-lg px-1">{feature.id}</span>
		<span class="grow">Ponto</span>
		<button class="btn btn-error btn-xs" on:click={deleteFeature}>-</button>
	</div>
{:else if feature.type === 'line'}
	<div class="flex justify-between items-center p-1 gap-1">
		<span class="bg-base-200 rounded-lg px-1">{feature.id}</span>
		<span class="grow">Linha</span>
		<span>{feature.line.length} pontos</span>
		<button class="btn btn-error btn-xs" on:click={deleteFeature}>-</button>
	</div>
{:else if feature.type === 'poly'}
	<div class="flex justify-between items-center p-1 gap-1">
		<span class="bg-base-200 rounded-lg px-1">{feature.id}</span>
		<span class="grow">Poligono</span>
		<span>
			{feature.incl.length} vertices
		</span>
		<button class="btn btn-error btn-xs" on:click={deleteFeature}>-</button>
	</div>
{:else}
	<div>
		<span class="bg-base-200 rounded-lg px-1 gap-1">{feature.id}</span>
		<span class="grow">{feature.type}(?)</span>
		<button class="btn btn-error btn-xs" on:click={deleteFeature}>-</button>
	</div>
{/if}
