<script>
	import { uploadNewsImg } from '$lib/api';
	import { apiServer } from '$lib/settings';
	import { toast } from '$lib/stores';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let data;
	export let images;
	export let canEdit;

	const tabs = {
		preview: 1,
		meta: 2,
		images: 3
	};
	let tab = data.id ? tabs.preview : tabs.images;

	let files = [];

	let isUploading = false;

	async function upload() {
		if (files.length === 0) return;

		const file = files[0];

		isUploading = true;

		const formData = new FormData();
		formData.append('images[]', file);

		await uploadNewsImg(formData, {
			onSuccess: async (res) => {
				const data = await res.json();
				toast('Imagem enviada', 'success');
				dispatch('new-img', { img: data });
				selectImg(data);
			},
			onError: (res) => {
				if (res.status === 409) {
					toast('Imagem já existente', 'info');
					// Should we select the image here?
				} else {
					toast(`Erro ao enviar imagem`, 'error');
				}
			}
		});

		isUploading = false;
	}

	function selectImg(img) {
		if (img.id !== data.id) {
			data.id = img.id;
			data.url = img.url_medium ?? img.url;
			data.transcription = img.transcription ?? '';
			data.attribution = null;
			data = data;
		}
		dispatch('select-img', { img });
		tab = tabs.preview;
	}
</script>

<div role="tablist" class="tabs tabs-boxed mb-1">
	<button
		role="tab"
		class="tab"
		class:tab-active={tab == tabs.preview}
		class:hidden={!data.id}
		on:click={() => (tab = tabs.preview)}>Previsão</button
	>
	<button
		role="tab"
		class="tab"
		class:tab-active={tab == tabs.meta}
		class:hidden={!data.id}
		on:click={() => (tab = tabs.meta)}>Metadados</button
	>
	<button
		role="tab"
		class="tab"
		class:tab-active={tab == tabs.images}
		on:click={() => (tab = tabs.images)}>Imagens</button
	>
</div>
{#if tab == tabs.preview}
	{#if data?.id}
		<img src={data.url} alt={data.transcription} class="rounded-lg" />
	{/if}
	<div class="p-2 border-l-2 border-neutral">
		{data.description ?? ''}
		{data.attribution ? ' - ' : ''}
		{data.attribution ?? ''}
	</div>
{:else if tab == tabs.meta}
	<h4 class="label-text">Descrição:</h4>
	<textarea class="w-full input input-bordered" bind:value={data.description}></textarea>
	<h4 class="label-text">Transcrição:</h4>
	<textarea class="w-full input input-bordered" bind:value={data.transcript}></textarea>
	<h4 class="label-text">Atribuição:</h4>
	<textarea class="w-full input input-bordered" bind:value={data.attribution}></textarea>
{:else if tab == tabs.images}
	<div class="flex gap-2 flex-wrap ml-2">
		{#each Object.values(images ?? {}) as img}
			<button class="relative" on:click={() => selectImg(img)}>
				<div class="absolute top-0 right-0 flex gap-1 p-1">
					{#if img.used}
						<div class="bg-success rounded-full p-1 border-2 border-white"></div>
					{/if}
					{#if img.id === data.id}
						<div class="bg-primary rounded-full p-1 border-2 border-white"></div>
					{/if}
				</div>
				<img
					src={img.url}
					alt={img.transcript}
					class="max-h-32 rounded-lg hover:scale-110 transition-all"
				/>
			</button>
		{/each}
		{#if (images ?? []).length === 0}
			<span>Sem imagens referênciadas</span>
		{/if}
	</div>
	<div class="flex flex-wrap gap-3 justify-left ml-2" class:hidden={!canEdit}>
		<input
			class="file-input file-input-bordered w-full max-w-xs"
			type="file"
			accept="image/*"
			bind:files
		/>
		<button class="btn btn-secondary" on:click={upload} disabled={isUploading || files.length == 0}
			>Enviar</button
		>
	</div>
{/if}
