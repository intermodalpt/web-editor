<script>
	import { createEventDispatcher } from 'svelte';
	import PicDialogContent from './PicDialogContent.svelte';
	import SinglePicMetaEditor from '$lib/pics/wrappers/SinglePicMetaEditor.svelte';

	export let picture;
	export let stops;

	const dispatch = createEventDispatcher();

	let expanded = false;
	let editorOpened = false;
</script>

<input type="checkbox" id="pic-preview" class="modal-toggle" checked />
<div class="modal">
	<div class="modal-box w-fit max-w-[100em]">
		<label
			for="pic-preview"
			class="btn btn-sm btn-circle btn-error absolute right-2 top-2 z-20"
			on:click={() => dispatch('close')}
			on:keypress={() => dispatch('close')}>✕</label
		>
		<PicDialogContent
			{picture}
			on:expand={() => (expanded = true)}
			on:edit={() => (editorOpened = true)}
		/>
	</div>
</div>

{#if expanded}
	<div class="absolute top-0 bottom-0 left-0 right-0 bg-black z-[1000]">
		<img src={picture.url_full} alt="Fotografia da paragem" class="rounded-box" />

		<div class="absolute bottom-2 right-2 flex gap-3">
			<button
				class="btn shadow-md"
				on:click={() => (expanded = false)}
				on:keypress={() => (expanded = false)}
			>
				<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 512 512">
					<!-- Font Awesome Free 6.4.0 https://fontawesome.com/license/free (Free License). -->
					<path
						d="M456 224H312c-13.3 0-24-10.7-24-24V56c0-9.7 5.8-18.5 14.8-22.2s19.3-1.7 26.2 5.2l40
                        40L442.3 5.7C446 2 450.9 0 456 0s10 2 13.7 5.7l36.7 36.7C510 46 512 50.9 512 56s-2 10-5.7
                        13.7L433 143l40 40c6.9 6.9 8.9 17.2 5.2 26.2s-12.5 14.8-22.2 14.8zm0 64c9.7 0 18.5 5.8 22.2
                        14.8s1.7 19.3-5.2 26.2l-40 40 73.4 73.4c3.6 3.6 5.7 8.5 5.7 13.7s-2 10-5.7 13.7l-36.7 36.7C466
                        510 461.1 512 456 512s-10-2-13.7-5.7L369 433l-40 40c-6.9 6.9-17.2 8.9-26.2
                        5.2s-14.8-12.5-14.8-22.2V312c0-13.3 10.7-24 24-24H456zm-256 0c13.3 0 24 10.7 24 24V456c0
                        9.7-5.8 18.5-14.8 22.2s-19.3 1.7-26.2-5.2l-40-40L69.7 506.3C66 510 61.1 512 56
                        512s-10-2-13.7-5.7L5.7 469.7C2 466 0 461.1 0 456s2-10 5.7-13.7L79 369 39
                        329c-6.9-6.9-8.9-17.2-5.2-26.2s12.5-14.8 22.2-14.8H200zM56 224c-9.7
                        0-18.5-5.8-22.2-14.8s-1.7-19.3 5.2-26.2l40-40L5.7 69.7C2 66 0 61.1 0 56s2-10 5.7-13.7L42.3
                        5.7C46 2 50.9 0 56 0s10 2 13.7 5.7L143 79l40-40c6.9-6.9 17.2-8.9 26.2-5.2s14.8 12.5 14.8 
                        22.2V200c0 13.3-10.7 24-24 24H56z"
					/></svg
				>
			</button>
		</div>
	</div>
{/if}

{#if editorOpened}
	<div class="absolute z-[1000]">
		<SinglePicMetaEditor
			selectedPicId={picture.id}
			{stops}
			on:save
			on:delete
			on:close={() => (editorOpened = false)}
		/>
	</div>
{/if}
