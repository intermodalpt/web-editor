<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let feature;

	const dispatch = createEventDispatcher();

	function deleteFeature() {
		dispatch('delete', { feature });
	}
</script>

{#if feature.geometry.type === 'Point'}
	<div class="flex justify-between items-center p-1 gap-1">
		<span class="bg-base-200 rounded-lg px-1">{feature.id}</span>
		<span class="grow">Ponto</span>
		<button class="btn btn-error btn-xs" on:click={deleteFeature}>-</button>
	</div>
{:else if feature.geometry.type === 'LineString'}
	<div class="flex justify-between items-center p-1 gap-1">
		<span class="bg-base-200 rounded-lg px-1">{feature.id}</span>
		<span class="grow">Linha</span>
		<span>{feature.geometry.coordinates.length} pontos</span>
		<button class="btn btn-error btn-xs" on:click={deleteFeature}>-</button>
	</div>
{:else if feature.geometry.type === 'Polygon'}
	<div class="flex justify-between items-center p-1 gap-1">
		<span class="bg-base-200 rounded-lg px-1">{feature.id}</span>
		<span class="grow">Poligono</span>
		<span>
			{feature.geometry.coordinates.map((c) => c.length).reduce((a, b) => a + b, 0)} vertices
		</span>
		<button class="btn btn-error btn-xs" on:click={deleteFeature}>-</button>
	</div>
{:else}
	<div>
		<span class="bg-base-200 rounded-lg px-1 gap-1">{feature.id}</span>
		<span class="grow">{feature.geometry.type}</span>
		<button class="btn btn-error btn-xs" on:click={deleteFeature}>-</button>
	</div>
{/if}
