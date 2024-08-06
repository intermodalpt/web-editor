<script>
	import { createEventDispatcher } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import MdContent from './MdContent.svelte';
	import ImgContent from './ImgContent.svelte';
	import MapContent from './MapContent.svelte';
	import ContentRef from './ContentRef.svelte';
	import { isValidContentBlock } from './utils.js';

	const dispatch = createEventDispatcher();

	export let hasPrevious;
	export let hasNext;
	export let block;
	export let images;
	export let canEdit;

	$: isValid = checkIsValid(block);

	function checkIsValid(block) {
		const valid = isValidContentBlock(block);
		dispatch('validation-update', { isValid: valid });

		return valid;
	}
</script>

<div
	class="relative border-l-2 pl-2"
	class:border-secondary={isValid}
	class:border-error={!isValid}
>
	<div class="absolute right-2 top-2 flex gap-2">
		<button
			class="btn btn-xs btn-outline"
			class:hidden={!hasPrevious}
			on:click={() => dispatch('up')}>↑</button
		>
		<button class="btn btn-xs btn-outline" class:hidden={!hasNext} on:click={() => dispatch('down')}
			>↓</button
		>
		<button class="btn btn-xs btn-error" on:click={() => dispatch('drop')}>
			<Icon name="close" class="h-4 stroke-current" />
		</button>
	</div>

	{#if 'md' in block}
		<MdContent bind:data={block.md} {canEdit} />
	{:else if 'img' in block}
		<ImgContent
			bind:data={block.img}
			bind:images
			{canEdit}
			on:new-img={(e) => {
				const img = e.detail.img;

				if (!images[img.id]) {
					images[img.id] = {
						id: img.id,
						url: img.url_medium,
						transcript: img.transcript,
						linked: false,
						used: true
					};
				} else {
					images[img.id].used = true;
				}
				images = images;
			}}
			on:select-imgs={() => dispatch('refresh-imgs')}
		/>
	{:else if 'map' in block}
		<MapContent bind:data={block.map} {canEdit} />
	{:else if 'ref' in block}
		<ContentRef bind:data={block.ref} {canEdit} />
	{/if}
</div>
<hr />
