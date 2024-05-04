<script>
	import { apiServer } from '$lib/settings';
	import { token, toast } from '$lib/stores';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let data;
	export let pictures;
	export let canEdit;

	const tabs = {
		preview: 1,
		meta: 2,
		pictures: 3
	};
	let tab = data.id ? tabs.preview : tabs.pictures;

	let files = [];

	let isUploading = false;

	async function upload() {
		if (files.length === 0) {
			return;
		}
		const file = files[0];

		isUploading = true;
		dispatch('upload-begin');

		const formData = new FormData();
		formData.append('images[]', file);

		try {
			let res = await fetch(`${apiServer}/v1/news/images`, {
				method: 'POST',
				body: formData,
				headers: {
					authorization: `Bearer ${$token}`
				}
			});

			// HTTP 200 means successful upload
			// HTTP 409 means successful upload and conflict
			// Every other http 4xx or 5xx means error
			const isUploaded = res.status === 200;
			const isConflict = res.status === 409;
			const isError = res.status >= 400 && res.status < 600 && res.status !== 409;

			const json = await res.json();
			if (isUploaded) {
				toast('Imagem enviada', 'success');
				console.log('new pic', json);
				dispatch('new-pic', { pic: json });
				selectPic(json);
			} else if (isConflict) {
				toast('Imagem já enviada', 'warning');
			} else if (isError) {
				toast(`Erro ao enviar imagem: ${JSON.stringify(json)}`, 'FileListerror');
			} else {
				toast(`Problema desconhecido ao enviar imagem: ${JSON.stringify(json)}`, 'error');
				console.error('Unknown response', res);
				console.error(json);
			}
		} catch (e) {
			toast('Erro ao enviar imagem', 'error');
			console.error('Error parsing response', e);
		}

		isUploading = false;
	}

	function selectPic(pic) {
		if (pic.id !== data.id) {
			data.id = pic.id;
			data.url = pic.url_medium ?? pic.url;
			data.transcription = pic.transcription ?? '';
			data.attribution = null;
			data = data;
		}
		dispatch('select-pic', { pic: pic });
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
		class:tab-active={tab == tabs.pictures}
		on:click={() => (tab = tabs.pictures)}>Imagens</button
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
{:else if tab == tabs.pictures}
	<div class="flex gap-2 flex-wrap ml-2">
		{#each Object.values(pictures ?? {}) as pic}
			<button class="relative" on:click={() => selectPic(pic)}>
				<div class="absolute top-0 right-0 flex gap-1 p-1">
					{#if pic.used}
						<div class="bg-success rounded-full p-1 border-2 border-white"></div>
					{/if}
					{#if pic.id === data.id}
						<div class="bg-primary rounded-full p-1 border-2 border-white"></div>
					{/if}
				</div>
				<img
					src={pic.url}
					alt={pic.transcript}
					class="max-h-32 rounded-lg hover:scale-110 transition-all"
				/>
			</button>
		{/each}
		{#if (pictures ?? []).length === 0}
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
