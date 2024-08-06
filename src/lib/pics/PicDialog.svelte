<script>
	import { createEventDispatcher } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import PicDialogContent from './PicDialogContent.svelte';
	import SinglePicMetaEditor from '$lib/pics/wrappers/SinglePicMetaEditor.svelte';

	export let picture;

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
			on:keypress={() => dispatch('close')}
		>
			<Icon name="close" class="h-4 stroke-current" />
		</label>
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
			<button class="btn shadow-md" on:click={() => (expanded = false)}>
				<Icon name="arrows-inwards" class="fill-black h-4" />
			</button>
		</div>
	</div>
{/if}

{#if editorOpened}
	<div class="absolute z-[1000]">
		<SinglePicMetaEditor
			selectedPicId={picture.id}
			on:save
			on:delete
			on:close={() => (editorOpened = false)}
		/>
	</div>
{/if}
