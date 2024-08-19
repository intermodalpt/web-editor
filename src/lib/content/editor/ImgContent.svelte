<script>
	import { createEventDispatcher } from 'svelte';
	import { patchRichImg, uploadRichImg } from '$lib/api';
	import { apiServer } from '$lib/settings';
	import { toast } from '$lib/stores';
	import LocationPicker from '$lib/components/LocationPicker.svelte';

	const dispatch = createEventDispatcher();

	export let data;
	export let images;
	export let canEdit;

	const tabs = {
		preview: 1,
		data: 2,
		pick: 3
	};
	let tab = data.id ? tabs.preview : tabs.pick;

	let files = [];

	let isUploading = false;

	let selectedImage = null;
	$: imageFieldsChanged =
		selectedImage &&
		(selectedImage.transcript !== data.transcript ||
			selectedImage.attribution !== data.attribution ||
			selectedImage.license !== data.license ||
			selectedImage.lon !== data.lon ||
			selectedImage.lat !== data.lat);

	async function upload() {
		if (files.length === 0) return;

		const file = files[0];

		isUploading = true;

		const formData = new FormData();
		formData.append('images[]', file);

		await uploadRichImg(formData, {
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
			console.log('selecting', img);
			selectedImage = img;
			data.id = img.id;
			data.url = img.url_medium ?? img.url;
			data.transcript = img.transcript ?? null;
			data.attribution = img.attribution ?? null;
			data.license = img.license ?? null;
			data.lon = img.lon ?? null;
			data.lat = img.lat ?? null;
			data = data;
		}
		dispatch('select-img', { img });
		tab = tabs.preview;
	}

	async function saveImgData() {
		if (!selectedImage) return;
		await patchRichImg(
			selectedImage.id,
			{
				transcript: data.transcript,
				attribution: data.attribution,
				license: data.license,
				lon: data.lon,
				lat: data.lat
			},
			{
				onSuccess: () => {
					toast('Dados guardados', 'success');
					selectedImage.transcript = data.transcript;
					selectedImage.attribution = data.attribution;
					selectedImage.license = data.license;
					selectedImage.lon = data.lon;
					selectedImage.lat = data.lat;
					images = images;
				},
				onError: () => {
					toast('Erro ao guardar dados', 'error');
				}
			}
		);
	}
</script>

<div role="tablist" class="tabs tabs-boxed mb-1 pr-32">
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
		class:tab-active={tab == tabs.data}
		class:hidden={!data.id}
		on:click={() => (tab = tabs.data)}>Dados</button
	>
	<button
		role="tab"
		class="tab"
		class:tab-active={tab == tabs.pick}
		on:click={() => (tab = tabs.pick)}>Escolher</button
	>
</div>
{#if tab == tabs.preview}
	{#if data?.id}
		<img src={data.url} alt={data.transcript} class="rounded-lg" />
	{/if}
	<div class="p-2 border-l-2 border-neutral">
		{data.description ?? ''}
		{data.attribution ? ' - ' : ''}
		{data.attribution ?? ''}
	</div>
{:else if tab == tabs.data}
	<h4 class="label-text">Descrição:</h4>
	<textarea class="w-full input input-bordered" bind:value={data.description}></textarea>
	<h4 class="label-text flex align-center">
		<span class="text-purple-500 font-bold text-lg">*</span> Transcrição:
	</h4>
	<textarea class="w-full input input-bordered" bind:value={data.transcript}></textarea>
	<h4 class="label-text flex align-center">
		<span class="text-purple-500 font-bold text-lg">*</span> Atribuição:
	</h4>
	<input type="text" class="w-full input input-bordered" bind:value={data.attribution} />
	<h4 class="label-text flex align-center">
		<span class="text-purple-500 font-bold text-lg">*</span> Licença:
	</h4>
	<input type="text" class="w-full input input-bordered" bind:value={data.license} />
	<h4 class="label-text flex align-center">
		<span class="text-purple-500 font-bold text-lg">*</span> Localização:
	</h4>
	<LocationPicker bind:lon={data.lon} bind:lat={data.lat} {canEdit} />
	<span
		><span class="text-purple-500 font-bold text-lg">*</span> Dados associados à imagem de forma independente
		do conteúdo</span
	>
	{#if canEdit}
		<div class="flex justify-end">
			<button class="btn btn-secondary" on:click={() => saveImgData()} disabled={!imageFieldsChanged}
				>Guardar</button
			>
		</div>
	{/if}
{:else if tab == tabs.pick}
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
