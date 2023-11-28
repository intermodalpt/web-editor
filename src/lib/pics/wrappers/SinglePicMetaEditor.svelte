<script>
	import { createEventDispatcher } from 'svelte';
	import PicMetaEditor from '$lib/pics/PicMetaEditor.svelte';

	const dispatch = createEventDispatcher();

	export let stops;
	export let selectedPicId;

	function closeEditor() {
		dispatch('close');
	}
</script>

<div
	class="fixed top-0 bottom-0 left-0 right-0 p-2 bg-white z-20 grid grid-cols-1 overflow-y-scroll gap-2 bg-base-300"
	style="grid-template-rows: auto 1fr;"
>
	<div class="flex gap-3 justify-between">
		<span class="text-xs">{selectedPicId}</span>
		<input type="button" class="btn btn-error btn-sm" value="Fechar" on:click={closeEditor} />
	</div>
	<div class="bg-base-100 border-base-300 border-2 rounded-md shadow-sm flex justify-center">
		<div class="max-w-[100em] p-2">
			{#if selectedPicId}
				<PicMetaEditor imageId={selectedPicId} {stops} on:save on:delete />
			{/if}
		</div>
	</div>
</div>
