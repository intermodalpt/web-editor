<script>
	import { onMount, createEventDispatcher } from 'svelte';
	import { derived } from 'svelte/store';
	import Select from 'svelte-select';
	import { marked } from 'marked';
	import { permissions, toast } from '$lib/stores';
	import { deleteExternalNewsItem, getExternalNewsItem, updateExternalNewsItem } from '$lib/api';
	import BooleanToggle from '$lib/components/BooleanToggle.svelte';
	import Icon from '$lib/components/Icon.svelte';

	const dispatch = createEventDispatcher();

	export let item;
	export let operators;
	export let regions;
	export let canEdit = $permissions.externalNews.modify;
	export let overrideIsValidated = true;

	const original = item;

	const operatorOptions = Object.values(operators).map((operator) => ({
		value: operator.id,
		label: operator.name
	}));
	const regionOptions = Object.values(regions).map((region) => ({
		value: region.id,
		label: region.name
	}));

	let selectedRegions = original.region_ids.map((id) => ({ value: id }));
	let selectedOperators = original.operator_ids.map((id) => ({ value: id }));
	let summary = original.summary;
	let content_md = original.content_md || original.prepro_content_md;
	let is_complete = original.is_complete;
	let is_relevant = original.is_relevant;
	let is_sensitive = original.is_sensitive;
	let is_validated = original.is_validated;

	const publishDatetime = new Date(item.publish_datetime).toLocaleString('pt');
	const editDatetime = item.edit_datetime
		? new Date(item.edit_datetime).toLocaleString('pt')
		: null;

	$: formValid = is_relevant != null && is_sensitive != null;

	$: content_html = marked(content_md);

	async function handleSave() {
		const data = {
			title: original.title,
			author: original.author,
			summary,
			content_md,
			is_complete,
			is_relevant,
			is_sensitive,
			is_validated,
			region_ids: selectedRegions.map((r) => r.value),
			operator_ids: selectedOperators.map((o) => o.value),
			publish_datetime: original.publish_datetime,
			edit_datetime: original.edit_datetime,
			url: original.url
		};

		await updateExternalNewsItem(item.id, data, {
			onSuccess: () => {
				toast(`Item ${item.id} guardado`, 'success');
				dispatch('save', { id: item.id });
			},
			onError: () => {
				toast(`Erro ao guardar`, 'error');
			}
		});
	}

	async function handleDelete() {
		if (!confirm('Apagar item?')) return;

		await deleteExternalNewsItem(item.id, {
			onSuccess: () => {
				toast(`Item ${item.id} apagado`, 'info');
				dispatch('delete', { id: item.id });
			},
			onError: () => {
				toast(`Erro ao apagar item ${item.id}`, 'error');
			}
		});
	}
</script>

<div class="font-semibold flex w-full justify-between">
	<h2 class="text-lg text-left font-semibold">{original.title}</h2>
	<span class="text-xs text-slate-500 self-start">#{item.id}</span>
</div>
<div class="flex gap-2 flex-wrap items-center">
	<span class="text-sm"> {original.author}</span>
	<span class="badge badge-info badge-sm">{original?.source}</span>
	{#if original.url}
		<a
			class="link link-primary text-xs"
			href={original.url}
			target="_blank"
			rel="noopener noreferrer">Link</a
		>
	{/if}
</div>

<span class="label-text font-semibold text-slate-500">Sumário</span>
<textarea class="w-full h-20 input input-bordered" disabled={!canEdit} bind:value={summary} />

<span class="label-text font-semibold text-slate-500">Conteúdo (Markdown)</span>
<textarea class="w-full input input-bordered h-40" disabled={!canEdit} bind:value={content_md} />

<span class="label-text font-semibold text-slate-500">Previsão</span>
<div class="border-l-2 ml-2 p-2 border-info bg-base-200">{@html content_html}</div>

<span class="label-text font-semibold text-slate-500">Operadores</span>
<div class="ml-2">
	<Select
		items={operatorOptions}
		multiple={true}
		disabled={!canEdit}
		bind:value={selectedOperators}
	/>
</div>
<span class="label-text font-semibold text-slate-500">Regiões</span>
<div class="ml-2">
	<Select items={regionOptions} multiple={true} disabled={!canEdit} bind:value={selectedRegions} />
</div>

<span class="label-text font-semibold text-slate-500">Imagens</span>
{#if original.images?.length > 0}
	<div class="flex gap-2 flex-wrap ml-2 min-h-32">
		{#each original.images ?? [] as image}
			<button>
				<img
					src={image.url}
					alt={image.transcript}
					class="max-h-32 rounded-lg hover:scale-110 transition-all"
				/>
			</button>
		{/each}
	</div>
{:else}
	<span class="ml-2">Sem imagens referênciadas</span>
{/if}
<div class="flex py-2 gap-2 flex-wrap justify-between">
	<div>
		<span>Validado</span>
		<BooleanToggle bind:state={is_validated} disabled={!canEdit} nullable={false} />
	</div>
	<div>
		<span>Sensível</span>
		<BooleanToggle bind:state={is_sensitive} disabled={!canEdit} nullable={false} />
	</div>
	<div>
		<span>Completo</span>
		<BooleanToggle bind:state={is_complete} disabled={!canEdit} nullable={false} />
	</div>
	<div>
		<span class:border-b-2={is_relevant === null} class:border-b-red-500={is_relevant === null}
			>Relevante</span
		>
		<BooleanToggle bind:state={is_relevant} disabled={!canEdit} />
	</div>
</div>

<div class="flex gap-2 flex-wrap items-center">
	{#if editDatetime}
		<span class="flex items-center gap-2">
			<Icon name="pencil" class="w-4" />
			<span>{editDatetime}</span>
		</span>
	{/if}
	<span class="flex items-center gap-2">
		<Icon name="clock" class="w-4" />
		<span>{publishDatetime}</span>
	</span>
</div>

<div class="flex gap-2 justify-between">
	<button class="btn btn-error" class:hidden={!canEdit} on:click={handleDelete}>Apagar</button>
	<div class="flex gap-2">
		{#if original}
			<a
				class="btn btn-secondary"
				class:hidden={!canEdit || !original?.is_validated}
				href="/news/import/{item.id}">Importar</a
			>
		{/if}
		<button
			class="btn btn-primary"
			class:hidden={!canEdit}
			on:click={handleSave}
			disabled={!formValid}>Guardar</button
		>
	</div>
</div>
