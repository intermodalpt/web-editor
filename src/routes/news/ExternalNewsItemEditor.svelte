<script>
	import { onMount, createEventDispatcher } from 'svelte';
	import { derived } from 'svelte/store';
	import Select from 'svelte-select';
	import { marked } from 'marked';
	import { toast } from '$lib/stores';
	import BooleanToggle from '$lib/components/BooleanToggle.svelte';
	import { deleteExternalNewsItem, getExternalNewsItem, updateExternalNewsItem } from '$lib/api';

	const dispatch = createEventDispatcher();

	export let id;
	export let operators;
	export let regions;
	export let canEdit;
	export let overrideIsValidated = true;

	const operatorOptions = derived(
		operators,
		($operators) =>
			Object.values($operators ?? {}).map((operator) => ({
				value: operator.id,
				label: operator.name
			})) ?? []
	);

	const regionOptions = derived(
		regions,
		($regions) =>
			Object.values($regions ?? {}).map((region) => ({
				value: region.id,
				label: region.name
			})) ?? []
	);

	let original = null;
	let selectedRegions = [];
	let selectedOperators = [];
	let summary = '';
	let content_md = '';
	let is_complete = null;
	let is_relevant = null;
	let is_sensitive = null;
	let is_validated = null;

	$: formValid = is_relevant != null && is_sensitive != null;

	$: content_html = marked(content_md);

	$: loaded = id == original?.id;

	async function handleSave() {
		const data = {
			id: original.id,
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

		await updateExternalNewsItem(id, data, {
			onSuccess: () => {
				toast(`Item ${id} guardado`, 'success');
				dispatch('save', { id });
			},
			onError: () => {
				toast(`Erro ao guardar`, 'error');
			}
		});
	}

	async function handleDelete() {
		if (!confirm('Apagar item?')) return;

		await deleteExternalNewsItem(id, {
			onSuccess: () => {
				toast(`Item ${id} apagado`, 'info');
				dispatch('delete', { id });
			},
			onError: () => {
				toast(`Erro ao apagar item ${id}`, 'error');
			}
		});
	}

	onMount(async () => {
		await getExternalNewsItem(id, {
			onSuccess: async (res) => {
				const item = await res.json();
				original = item;
				selectedRegions = item.region_ids.map((id) => {
					return { value: id };
				});
				selectedOperators = item.operator_ids.map((id) => {
					return { value: id };
				});
				summary = item.summary;
				content_md = item.content_md || item.prepro_content_md;
				is_complete = item.is_complete;
				is_relevant = item.is_relevant;
				is_sensitive = item.is_sensitive;
				is_validated = overrideIsValidated ? true : item.is_validated;
			},
			onError: () => {
				toast(`Erro ao carregar item`, 'error');
			}
		});
	});
</script>

{#if loaded}
	<h2 class="card-title text-lg">
		<span class="text-xs">#{id}</span>
		{original?.title}
		<span class="badge badge-info badge-sm">{original?.source}</span>
		<a
			class="link link-primary text-xs"
			href={original?.url}
			target="_blank"
			rel="noopener noreferrer">Link</a
		>
	</h2>
	<h4 class="label-text">Sumário:</h4>
	<textarea class="w-full h-20 input input-bordered" disabled={!canEdit}>{summary}</textarea>

	<h4 class="label-text">Markdown:</h4>
	<textarea class="w-full input input-bordered h-40" disabled={!canEdit} bind:value={content_md}
	></textarea>
	<h4 class="label-text">Previsão:</h4>
	<div class="border-l-2 ml-2 p-2 border-info bg-base-200">{@html content_html}</div>

	<h4 class="label-text">Operadores:</h4>
	<Select
		items={$operatorOptions}
		multiple={true}
		disabled={!canEdit}
		bind:value={selectedOperators}
	/>
	<h4 class="label-text">Regiões:</h4>
	<Select items={$regionOptions} multiple={true} disabled={!canEdit} bind:value={selectedRegions} />

	<h4 class="label-text">Imagens</h4>
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
		{#if (original.images ?? []).length === 0}
			<span>Sem imagens referênciadas</span>
		{/if}
	</div>
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

	<div class="flex gap-2 flex-wrap justify-between">
		<div class="flex flex-col justify-end">
			<div>
				<span class="label-text">{new Date(original.publish_datetime).toLocaleString('pt')}</span>
				<span class="label-text">; - {original.author}</span>
			</div>
			{#if original.edit_datetime}
				<span class="label-text">E{new Date(original.edit_datetime).toLocaleString('pt')}</span>
			{/if}
		</div>
	</div>

	<div class="flex gap-2 justify-between">
		<button class="btn btn-error" class:hidden={!canEdit} on:click={handleDelete}>Apagar</button>
		<div class="flex gap-2">
			<a
				class="btn btn-primary"
				class:hidden={!canEdit || !original?.is_validated}
				href="/news/import/{id}">Importar</a
			>
			<button
				class="btn btn-primary"
				class:hidden={!canEdit}
				on:click={handleSave}
				disabled={!formValid}>Guardar</button
			>
		</div>
	</div>
{:else}
	<div class="w-full flex justify-center">
		<span class="loading loading-dots loading-lg" />
	</div>
{/if}
