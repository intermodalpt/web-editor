<script>
	import { createEventDispatcher } from 'svelte';
	import { marked } from 'marked';
	import { apiServer } from '$lib/settings';
	import { toast } from '$lib/stores';
	import BooleanToggle from '$lib/components/BooleanToggle.svelte';
	import { importExternalNewsImage } from '$lib/api';

	const dispatch = createEventDispatcher();

	export let externalItem;
	export let operators;
	export let regions;

	let importedImages = new Set();
	let uploadingImages = new Set();

	$: extContentHtml =
		externalItem?.content_md || externalItem?.prepro_content_md
			? marked(externalItem.content_md ?? externalItem?.prepro_content_md)
			: null;

	function handleSyncTitle() {
		dispatch('sync-title', { title: externalItem.title });
	}

	function handleSyncSummary() {
		dispatch('sync-summary', { summary: externalItem.summary });
	}

	function handleSyncContent() {
		dispatch('sync-content', {
			content: externalItem.content_md || externalItem.prepro_content_md,
			url: externalItem.url,
			source: externalItem.source
		});
	}

	function handleSyncRegions() {
		dispatch('sync-regions', { regionIds: externalItem.region_ids });
	}

	function handleSyncOperators() {
		dispatch('sync-operators', { operatorIds: externalItem.operator_ids });
	}

	function handleSyncPubDate() {
		dispatch('sync-pub-date', { pubDatetime: externalItem.publish_datetime });
	}

	function handleSyncEditDate() {
		dispatch('sync-edit-date', { editDatetime: externalItem.edit_datetime });
	}

	function handleSyncAuthor() {
		dispatch('sync-author', { author: externalItem.author });
	}

	function handleSyncAll() {
		dispatch('sync-all', {
			title: externalItem.title,
			summary: externalItem.summary,
			content: externalItem.content_md || externalItem.prepro_content_md,
			regionIds: externalItem.region_ids,
			operatorIds: externalItem.operator_ids,
			pubDatetime: externalItem.publish_datetime,
			editDatetime: externalItem.edit_datetime,
			author: externalItem.author,
			url: externalItem.url,
			source: externalItem.source
		});
	}

	async function handleExtImgClick(extImageId) {
		uploadingImages.add(extImageId);
		uploadingImages = uploadingImages;

		const res = await fetch(`${apiServer}/v1/news/images/import_external/${extImageId}`, {
			method: 'POST',
			credentials: 'include'
		});

		uploadingImages.delete(extImageId);
		uploadingImages = uploadingImages;

		if (!res.ok) {
			toast(`Erro ao importar imagem ${extImageId}`, 'error');
			return;
		}

		importedImages.add(extImageId);
		importedImages = importedImages;
		const importedImg = await res.json();

		dispatch('import-img', { img: importedImg });
	}
</script>

<button class="btn btn-warning btn-sm mb-3" on:click={handleSyncAll}>Sincronizar</button>

<div class="flex gap-1">
	<button class="btn btn-xs h-auto" on:click={handleSyncTitle}>«</button>
	<h2 class="text-lg font-bold">
		<span>{externalItem.title}</span>
	</h2>
</div>

<h4 class="label-text">Sumário</h4>
<div class="flex gap-1 ml-2">
	<button class="btn btn-xs h-auto" on:click={handleSyncSummary}>«</button>
	<div class="grow">
		<p>{externalItem.summary}</p>
	</div>
</div>

<h4 class="label-text">Conteúdo</h4>
<div class="flex gap-1 ml-2">
	<button class="btn btn-xs h-auto" on:click={handleSyncContent}>«</button>
	<div class="grow">
		<p class="border-l-2 p-2 border-info bg-base-200 text-left">{@html extContentHtml}</p>
	</div>
</div>

<h4 class="label-text">Imagens</h4>
<div class="flex gap-2 flex-wrap ml-2">
	{#each externalItem.images ?? [] as image}
		{#if uploadingImages.has(image.id)}
			<div class="relative">
				<img src={image.url} alt={image.transcript} class="max-h-32 rounded-lg" />
				<div class="absolute top-1 right-1 bg-warning rounded-full border-2 p-1 border-white"></div>
			</div>
		{:else if importedImages.has(image.id)}
			<div class="relative">
				<img src={image.url} alt={image.transcript} class="max-h-32 rounded-lg" />
				<div class="absolute top-1 right-1 bg-success rounded-full border-2 p-1 border-white"></div>
			</div>
		{:else}
			<button on:click={() => handleExtImgClick(image.id)}>
				<img
					src={image.url}
					alt={image.transcript}
					class="max-h-32 rounded-lg hover:scale-110 transition-all"
				/>
			</button>
		{/if}
	{/each}
	{#if (externalItem.images ?? []).length === 0}
		<span>Sem imagens referênciadas</span>
	{/if}
</div>

<h4 class="label-text">Regiões</h4>
<div class="flex gap-1 ml-2">
	<button class="btn btn-xs h-auto" on:click={handleSyncRegions}>«</button>
	<div class="flex gap-2 flex-wrap">
		{#if $regions}
			{#each externalItem.region_ids ?? [] as region_id}
				<span class="badge badge-outline border-green-500">{$regions[region_id]?.name}</span>
			{/each}
		{/if}
		{#if (externalItem.operator_ids ?? []).length === 0}
			<span>Sem regiões referênciadas</span>
		{/if}
	</div>
</div>
<h4 class="label-text">Operadores</h4>
<div class="flex gap-1 ml-2">
	<button class="btn btn-xs h-auto" on:click={handleSyncOperators}>«</button>
	<div class="flex gap-2 flex-wrap">
		{#if $operators}
			{#each externalItem.operator_ids ?? [] as operator_id}
				<span class="badge badge-outline border-orange-500">{$operators[operator_id]?.name}</span>
			{/each}
		{/if}
		{#if (externalItem.operator_ids ?? []).length === 0}
			<span>Sem operadores referênciados</span>
		{/if}
	</div>
</div>

<h4 class="label-text">Publicação</h4>
<div class="flex gap-1 ml-2">
	<button class="btn btn-xs h-auto" on:click={handleSyncPubDate}>«</button>
	<p>{new Date(externalItem.publish_datetime).toLocaleString('pt')}</p>
</div>
<h4 class="label-text">Edição</h4>
<div class="flex gap-1 ml-2">
	<button class="btn btn-xs h-auto" on:click={handleSyncEditDate}>«</button>
	{#if externalItem.edit_datetime}
		<span>{new Date(externalItem.edit_datetime).toLocaleString('pt')}</span>
	{:else}
		<span class="label-text">Sem data de edição</span>
	{/if}
</div>
<h4 class="label-text">Autor</h4>
<div class="flex gap-1 ml-2">
	<button class="btn btn-xs h-auto" on:click={handleSyncAuthor}>«</button>
	{#if externalItem.author}
		<span>{externalItem.author}</span>
	{:else}
		<span class="label-text">Autor desconhecido</span>
	{/if}
</div>

<h4 class="label-text">Atributos:</h4>
<div class="flex gap-6 flex-wrap items-center ml-2">
	<div class="flex gap-2 flex-wrap">
		<span class="badge badge-info badge-sm">{externalItem.source}</span>
		<a
			class="link link-primary text-xs"
			href={externalItem.url}
			target="_blank"
			rel="noopener noreferrer">Fonte</a
		>
	</div>
	<div class="flex gap-2 flex-wrap">
		<span>Validado:</span>
		<BooleanToggle
			state={externalItem.is_validated}
			disabled={true}
			compact={true}
			nullable={false}
		/>
		<span>Sensivel:</span>
		<BooleanToggle
			state={externalItem.is_sensitive}
			disabled={true}
			compact={true}
			nullable={false}
		/>
		<span>Completo:</span>
		<BooleanToggle state={!externalItem.is_partial} disabled={true} compact={true} />
		<span>Relevante:</span>
		<BooleanToggle
			state={externalItem.is_relevant}
			disabled={true}
			compact={true}
			nullable={false}
		/>
	</div>
</div>
