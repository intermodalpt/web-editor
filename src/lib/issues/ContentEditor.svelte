<script lang="ts">
	import { defaultContentBlock } from '$lib/content/utils.js';
	import ContentBlock from '$lib/content/editor/ContentBlock.svelte';

	export let content: any[] = [];
	export let canEdit = false;
	let contentBlockValidity: boolean[] = [];
	$: isContentValid = contentBlockValidity.every((v) => v);

	let images = {};

	function addContentBlock(type) {
		contentBlockValidity = [...contentBlockValidity, false];
		content.push(defaultContentBlock(type));
		content = content;
	}

	function dropContentBlock(i) {
		content = [...content.slice(0, i), ...content.slice(i + 1)];
		contentBlockValidity = [
			...contentBlockValidity.slice(0, i),
			...contentBlockValidity.slice(i + 1)
		];
		content = content;
	}

	function moveContentBlockUp(i) {
		if (i === 0) {
			return;
		}

		const tmp = content[i - 1];
		content[i - 1] = content[i];
		content[i] = tmp;
		content = content;
	}

	function moveContentBlockDown(i) {
		if (i === content.length - 1) {
			return;
		}

		const tmp = content[i + 1];
		content[i + 1] = content[i];
		content[i] = tmp;
		content = content;
	}
</script>

{#each content as block, i}
	<ContentBlock
		bind:block
		bind:images
		{canEdit}
		hasPrevious={i > 0}
		hasNext={i < content.length - 1}
		on:up={() => moveContentBlockUp(i)}
		on:down={() => moveContentBlockDown(i)}
		on:drop={() => dropContentBlock(i)}
		on:validation-update={(e) => (contentBlockValidity[i] = e.detail.isValid)}
	></ContentBlock>
{/each}
<div class="flex flex-wrap gap-3 justify-end" class:hidden={!canEdit}>
	<button
		class="btn btn-primary btn-sm"
		on:click={() => {
			addContentBlock('md');
		}}>+Texto</button
	>
	<button
		class="btn btn-primary btn-sm"
		on:click={() => {
			addContentBlock('img');
		}}>+Imagem</button
	>
	<button
		class="btn btn-primary btn-sm"
		on:click={() => {
			addContentBlock('map');
		}}>+Mapa</button
	>
	<!-- <button
		class="btn btn-primary btn-sm"
		on:click={() => {
			addContentBlock('ref');
		}}>+Continuação</button
	> -->
</div>
