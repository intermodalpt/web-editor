<script>
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let stopPictures;
	export let readOnly = true;
</script>

<div class="flex flex-col gap-2 h-full">
	<div class="flex flex-wrap gap-1 grow overflow-y-auto">
		{#if $stopPictures !== undefined && $stopPictures.length > 0}
			{#each $stopPictures as picture}
				<img
					src={picture.url_medium}
					rel="noreferrer"
					alt="Fotografia da paragem"
					class="rounded-box transition-all hover:scale-150 h-40"
					on:click={() => dispatch('pictureClick', { picture: picture })}
					on:keypress={() => dispatch('pictureClick', { picture: picture })}
				/>
			{/each}
		{:else}
			<div class="flex flex-col items-center justify-center w-full h-40">
				<span class="text-gray-500 text-xl">Sem fotos</span>
			</div>
		{/if}
	</div>
	<div class="flex justify-end">
		<input
			class="btn btn-sm btn-primary"
			type="button"
			value="Editar fotos"
			on:click={() => dispatch('pictureEditorRequest')}
			on:keypress={() => dispatch('pictureEditorRequest')}
			disabled={readOnly}
		/>
	</div>
</div>
