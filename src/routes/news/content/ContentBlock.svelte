<script>
	import { createEventDispatcher } from 'svelte';
	import MdContent from './MdContent.svelte';
	import PicContent from './PicContent.svelte';
	import MapContent from './MapContent.svelte';
	import ContentRef from './ContentRef.svelte';
	import { isValidContentBlock } from './utils.js';

	const dispatch = createEventDispatcher();

	export let hasPrevious;
	export let hasNext;
	export let block;
	export let pictures;
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
		<button class="btn btn-xs btn-error" on:click={() => dispatch('drop')}>x</button>
	</div>

	{#if 'md' in block}
		<MdContent bind:data={block.md} {canEdit} />
	{:else if 'pic' in block}
		<PicContent
			bind:data={block.pic}
			bind:pictures
			{canEdit}
			on:new-pic={(e) => {
				const pic = e.detail.pic;

				if (!pictures[pic.id]) {
					pictures[pic.id] = {
						id: pic.id,
						url: pic.url_medium,
						transcript: pic.transcript,
						linked: false,
						used: true
					};
				} else {
					pictures[pic.id].used = true;
				}
				pictures = pictures;
			}}
			on:select-pic={() => dispatch('refresh-pics')}
		/>
	{:else if 'map' in block}
		<MapContent bind:data={block.map} {canEdit} />
	{:else if 'ref' in block}
		<ContentRef bind:data={block.ref} {canEdit} />
	{/if}
</div>
<hr />
