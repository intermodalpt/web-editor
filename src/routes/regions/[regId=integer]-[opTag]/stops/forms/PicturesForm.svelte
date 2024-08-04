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
				<button on:click={() => dispatch('pictureClick', { picture: picture })}>
					<img
						src={picture.url_medium}
						rel="noreferrer"
						alt="Fotografia da paragem"
						class="rounded-box transition-all hover:scale-150 h-40"
					/>
				</button>
			{/each}
		{:else}
			<div class="flex flex-col items-center justify-center w-full h-40">
				<span class="text-gray-500 text-xl">Sem fotos</span>
			</div>
		{/if}
	</div>
	<div class="flex justify-end">
		<button
			class="btn btn-sm btn-primary"
			on:click={() => dispatch('pictureEditorRequest')}
			disabled={readOnly}>Editar fotos</button
		>
	</div>
</div>
