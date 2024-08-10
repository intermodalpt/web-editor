<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Outline from './Outline.svelte';

	const dispatch = createEventDispatcher();

	export let primitive;

	if (!primitive) {
		primitive = {
			size: 1,
			color: '#FFFFFF',
			opacity: 1
		};
	}

	let primitiveHasOutline = primitive.outline != null;

	function toggleOutline(value) {
		if (value) {
			primitive.outline = primitive.outline ?? {
				color: '#FFFFFF',
				opacity: 1
			};
		} else {
			primitive.outline = null;
		}
		dispatch('change');
	}

	$: {
		toggleOutline(primitiveHasOutline);
	}
</script>

<span class="text-sm text-center w-full block border-2 bg-slate-100">Polys</span>
<div class="flex items-center gap-2 pl-2 py-2 border-l-2 border-r-2 border-b-2 !border-slate-300">
	<input type="color" class="input input-xs" bind:value={primitive.color} on:change />
	<span>{primitive.color}</span>
	<label>
		O:
		<input
			type="number"
			class="input input-bordered input-xs"
			min="0"
			max="1"
			step="0.1"
			bind:value={primitive.opacity}
			on:change
		/>
	</label>
</div>
<div class="border-l-2 border-r-2 !border-slate-300 pl-2 py-2">
	<label class="flex justify-between gap-2 pb-1">
		<input type="checkbox" class="checkbox checkbox-xs" bind:checked={primitiveHasOutline} />
		<span class="text-xs grow">Outline</span>
	</label>
	{#if primitive.outline}
		<Outline outline={primitive.outline} on:change />
	{/if}
</div>
