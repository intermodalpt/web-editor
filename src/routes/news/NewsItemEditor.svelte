<script>
	import { onMount, createEventDispatcher } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import Select from 'svelte-select';
	import { marked } from 'marked';
	import { apiServer } from '$lib/settings.js';
	import { token, toast } from '$lib/stores.js';
	import BooleanToggle from '$lib/components/BooleanToggle.svelte';
	import ExternalNewsItemImporter from './ExternalNewsItemImporter.svelte';

	const dispatch = createEventDispatcher();

	export let id;
	export let operators;
	export let regions;
	export let canEdit;

	let externalDialog;

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

	const externalId = writable(2);

	const externalItem = derived(externalId, async ($externalId, set) => {
		if (!$externalId) {
			return;
		}
		const res = await fetch(`${apiServer}/v1/news/external/${$externalId}/full`, {
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${$token}`
			}
		});

		if (!res.ok) {
			toast(`Erro ao carregar notícia externa ${$externalId}`, 'error');
			return;
		}

		set(await res.json());
	});

	let original = null;
	let selectedRegions = [];
	let selectedOperators = [];
	let title = '';
	let summary = '';
	let content_md = '';
	let is_visible = null;
	let author_override = null;
	let publish_datetime = null;
	let edit_datetime = null;

	$: formValid = true;

	$: content_html = marked(content_md);

	$: loaded = id == original?.id;

	async function save() {
		const data = {
			id: original.id,
			title: title,
			author: original.author,
			summary,
			content_md,
			is_visible,
			region_ids: selectedRegions.map((r) => r.value),
			operator_ids: selectedOperators.map((o) => o.value),
			publish_datetime: original.publish_datetime,
			edit_datetime: original.edit_datetime
		};

		const res = await fetch(`${apiServer}/v1/news/external/${id}`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${$token}`
			},
			body: JSON.stringify(data)
		});

		if (res.ok) {
			toast(`Item ${id} guardado`, 'success');
			dispatch('save', { id });
		} else {
			toast(`Erro ao guardar`, 'error');
		}
	}

	async function deleteItem() {
		if (!confirm('Apagar item?')) {
			return;
		}

		const res = awaitfetch(`${apiServer}/v1/news/external/${id}`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${$token}`
			}
		});

		if (res.ok) {
			toast(`Item ${id} apagado`, 'info');
			dispatch('delete', { id });
		} else {
			toast(`Erro ao apagar item ${id}`, 'error');
		}
	}

	onMount(() => {
		if (!id) {
			return;
		}
		fetch(`${apiServer}/v1/news/${id}`, {
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${$token}`
			}
		})
			.then((r) => r.json())
			.then((item) => {
				original = item;
				selectedRegions = item.region_ids.map((id) => {
					return { value: id };
				});
				selectedOperators = item.operator_ids.map((id) => {
					return { value: id };
				});
				summary = item.summary;
				content_md = item.content_md;
				is_complete = item.is_complete;
				is_relevant = item.is_relevant;
				is_sensitive = item.is_sensitive;
			});
	});
</script>

{#if loaded}
	<div class="alert border-2 border-primary bg-zinc-50 relative">
		<span class="-top-2 left-4 badge badge-primary absolute">Fonte externa</span>
		<div class="flex gap-2 w-full items-center">
			<div class="form-control shrink-0">
				<label class="input-group">
					<span>Id</span>
					<input
						type="number"
						bind:value={$externalId}
						class="input input-bordered w-32"
						disabled={!canEdit}
					/>
				</label>
			</div>
			{#if $externalId}
				<span class="btn btn-success"></span>
				<span class="flex-grow text-lg font-bold">{$externalItem?.title}{$externalItem?.title}</span>
				<button
					class="btn btn-primary"
					on:click={() => {
						externalDialog.showModal();
					}}>Sincronizar</button
				>
			{:else}
				<span class="btn btn-error"></span>
			{/if}
		</div>
	</div>

	<h2 class="flex gap-2 items-center">
		{#if id}
			<span class="text-md">#{id}</span>
		{/if}
		<div class="form-control grow">
			<label class="input-group">
				<span class="w-32">Titulo</span>
				<input
					type="text"
					bind:value={title}
					class="input input-bordered w-full"
					disabled={!canEdit}
				/>
			</label>
		</div>
	</h2>
	<h4 class="label-text">Sumário:</h4>
	<textarea class="w-full h-20 input input-bordered" disabled={!canEdit}>{summary}</textarea>
	<div class="grid grid-cols-1 xl:grid-cols-2 gap-2">
		<div>
			<h4 class="label-text">Markdown:</h4>
			<textarea class="w-full input input-bordered h-40" disabled={!canEdit} bind:value={content_md}
			></textarea>
		</div>
		<div>
			<h4 class="label-text">Previsão:</h4>
			<div class="border-l-2 ml-2 p-2 border-info bg-base-200">{@html content_html}</div>
		</div>
	</div>

	<div class="grid grid-cols-1 xl:grid-cols-2 gap-2">
		<div>
			<h4 class="label-text">Operadores:</h4>
			<Select
				items={$operatorOptions}
				multiple={true}
				disabled={!canEdit}
				bind:value={selectedOperators}
			/>
		</div>
		<div>
			<h4 class="label-text">Regiões:</h4>
			<Select
				items={$regionOptions}
				multiple={true}
				disabled={!canEdit}
				bind:value={selectedRegions}
			/>
		</div>
	</div>
	<div class="flex py-2 gap-4 flex-wrap">
		<div class="form-control">
			<label class="input-group">
				<span class="w-32">Publicação</span>
				<input type="datetime-local" bind:value={publish_datetime} class="input input-bordered" />
			</label>
		</div>
		<div class="form-control">
			<label class="input-group">
				<span class="w-32">Edição</span>
				<input type="datetime-local" bind:value={edit_datetime} class="input input-bordered" />
			</label>
		</div>
	</div>
	<div class="flex py-2 gap-4 flex-wrap">
		<div class="form-control">
			<label class="input-group">
				<span class="w-48">Autor alternativo</span>
				<input
					type="text"
					bind:value={author_override}
					class="input input-bordered"
					disabled={!canEdit}
				/>
			</label>
		</div>
		<div>
			<span>Visível</span>
			<BooleanToggle bind:state={is_visible} disabled={!canEdit} nullable={false} />
		</div>
	</div>

	<div class="flex gap-2 justify-between">
		{#if id}
			<button class="btn btn-error" class:hidden={!canEdit} on:click={deleteItem}>Apagar</button>
		{/if}
		<div class="flex gap-2">
			<button class="btn btn-primary" class:hidden={!canEdit} on:click={save} disabled={!formValid}
				>Guardar</button
			>
		</div>
	</div>
{:else}
	<div class="w-full flex justify-center">
		<span class="loading loading-dots loading-lg" />
	</div>
{/if}

<dialog bind:this={externalDialog} class="modal modal-bottom sm:modal-middle">
	<div class="modal-box relative z-30 sm:max-w-5xl">
		<div>
			<form method="dialog">
				<button class="btn btn-sm btn-circle btn-error absolute right-2 top-2">x</button>
			</form>
			{#key externalId}
				{#if $externalItem}
					<ExternalNewsItemImporter
						{externalItem}
						{operators}
						{regions}
						{canEdit}
						on:sync-title={() => {
							title = $externalItem.title;
							toast('Título sincronizado', 'success');
						}}
						on:sync-summary={() => {
							summary = $externalItem.summary;
							toast('Sumário sincronizado', 'success');
						}}
						on:sync-content={() => {
							//content_md = $externalItem.content_md;
							toast('Conteúdo sincronizado', 'success');
						}}
						on:sync-regions={() => {
							selectedRegions = $externalItem.region_ids.map((id) => {
								return { value: id };
							});
							toast('Regiões sincronizadas', 'success');
						}}
						on:sync-operators={() => {
							selectedOperators = $externalItem.operator_ids.map((id) => {
								return { value: id };
							});
							toast('Operadores sincronizados', 'success');
						}}
						on:sync-pub-date={() => {
							publish_datetime = $externalItem.publish_datetime;
							toast('Data de publicação sincronizada', 'success');
						}}
						on:sync-edit-date={() => {
							edit_datetime = $externalItem.edit_datetime;
							toast('Data de edição sincronizada', 'success');
						}}
						on:sync-all={() => {
							title = $externalItem.title;
							summary = $externalItem.summary;
							//content_md = $externalItem.content_md;
							selectedRegions = $externalItem.region_ids.map((id) => {
								return { value: id };
							});
							selectedOperators = $externalItem.operator_ids.map((id) => {
								return { value: id };
							});
							publish_datetime = $externalItem.publish_datetime;
							edit_datetime = $externalItem.edit_datetime;
							toast('Tudo sincronizado', 'success');
						}}
						on:import-img={() => {
							// TODO
						}}
					/>
				{/if}
			{/key}
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button></button>
	</form>
</dialog>
