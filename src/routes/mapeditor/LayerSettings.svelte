<script>
	import { createEventDispatcher } from 'svelte';
	import Feature from './Feature.svelte';
	import Outline from './Outline.svelte';
	import PrimitiveSettings from './PrimitiveSettings.svelte';

	const dispatch = createEventDispatcher();

	export let layer;

	let hasBlinkEffect = layer.effects?.blink;

	let tabs = {
		objects: 1,
		definitions: 2
	};
	let tab = tabs.objects;

	function handleDeleteFeature(e) {
		const feature = e.detail.feature;
		layer.features = layer.features.filter((f) => f.id !== feature.id);
		layer = layer;
		dispatch('featuredelete', { feature });
	}
</script>

<div class="flex gap-2 items-center py-1">
	<span class="px-1">{layer.id}</span>
	<input type="text" class="input input-bordered input-xs grow" bind:value={layer.name} />
</div>
<div role="tablist" class="tabs tabs-bordered tabs-xs">
	<button
		role="tab"
		class="tab bg-white"
		class:tab-active={tab == tabs.objects}
		on:click={() => {
			tab = tabs.objects;
		}}>Objetos</button
	>
	<button
		role="tab"
		class="tab bg-white"
		class:tab-active={tab == tabs.settings}
		on:click={() => {
			tab = tabs.settings;
		}}>Cosmética</button
	>
</div>

<div class:hidden={tab != tabs.objects}>
	{#each layer.features as feature}
		<Feature {feature} on:delete={handleDeleteFeature} />
	{/each}
</div>
<div class:hidden={tab != tabs.settings}>
	<PrimitiveSettings name="Points" bind:primitive={layer.points} />
	<PrimitiveSettings name="Lines" bind:primitive={layer.lines} />
	<PrimitiveSettings name="Polys" bind:primitive={layer.polys} />
	<span class="text-sm text-center w-full block border-2 bg-slate-100">Effects</span>
	<div class="flex items-center gap-2 pl-2 py-2 border-l-2 border-r-2 border-b-2 !border-slate-300">
		<label class="flex justify-between gap-2 pb-1">
			<input type="checkbox" class="checkbox checkbox-xs" bind:checked={hasBlinkEffect} />
			<span class="text-xs grow">Blink</span>
		</label>
	</div>
</div>
