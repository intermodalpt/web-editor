<script>
	import { onMount, createEventDispatcher } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import Select from 'svelte-select';
	import { apiServer } from '$lib/settings.js';
	import { toast } from '$lib/stores.js';
	import Icon from '$lib/components/Icon.svelte';
	import ExternalSourceRow from './ExternalSourceRow.svelte';
	import BooleanToggle from '$lib/components/BooleanToggle.svelte';
	import ContentBlock from './content/ContentBlock.svelte';
	import { defaultContentBlock, nonBlankString } from './content/utils.js';

	const dispatch = createEventDispatcher();

	export let id;
	export let operators;
	export let regions;
	export let canEdit;

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

	// The dialog in the current component
	let newExternalDialog;
	const newExternalId = writable(null);
	const newExternalItem = derived(newExternalId, async ($newExternalId, set) => {
		if (!$newExternalId) {
			return;
		}
		const res = await fetch(`${apiServer}/v1/news/external/${$newExternalId}/full`, {
			credentials: 'include'
		});

		if (!res.ok) {
			toast(`Erro ao carregar notícia externa ${$newExternalId}`, 'error');
			return;
		}

		set(await res.json());
	});

	// Foreign dialog inside ExternalSourceRow
	let externalDialog;

	let original = null;
	let selectedRegions = [];
	let selectedOperators = [];
	let title = '';
	let summary = '';
	let is_visible = true;
	let author_override = null;
	let pubDatetime = null;
	let editDatetime = null;
	let content = [];
	let externalIds = [2, 6];
	let images = {};
	let thumbId = null;

	$: loaded = id == original?.id;

	let contentBlockValidity = [];
	$: isContentValid = contentBlockValidity.every((v) => v);
	$: formValid =
		isContentValid && nonBlankString(title) && nonBlankString(summary) && content.length > 0;

	$: resultingData = {
		id: original?.id,
		title,
		summary,
		content,
		thumb_id: thumbId,
		region_ids: selectedRegions.map((r) => r.value),
		operator_ids: selectedOperators.map((o) => o.value),
		external_ids: externalIds,
		publish_datetime: nonBlankString(pubDatetime)
			? new Date(pubDatetime).toISOString()
			: original?.publish_datetime ?? new Date().toISOString(),
		edit_datetime: nonBlankString(editDatetime)
			? new Date(editDatetime).toISOString()
			: original?.edit_datetime ?? null,
		author_override,
		is_visible
	};

	async function save() {
		const id = original?.id;
		if (id) {
			const res = await fetch(`${apiServer}/v1/news/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(resultingData)
			});

			if (res.ok) {
				toast(`Item ${id} guardado`, 'success');
				dispatch('save', { id });
			} else {
				toast(`Erro ao guardar`, 'error');
			}
		} else {
			const res = await fetch(`${apiServer}/v1/news`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(resultingData)
			});

			if (res.ok) {
				const id = await res.json().id;
				toast(`Novo item guardado (${id})`, 'success');
				dispatch('save', { id });
			} else {
				toast(`Erro ao guardar`, 'error');
			}
		}
	}

	async function deleteItem() {
		if (!confirm('Apagar item?')) {
			return;
		}

		const res = awaitfetch(`${apiServer}/v1/news/external/${id}`, {
			method: 'DELETE',
			credentials: 'include'
		});

		if (res.ok) {
			toast(`Item ${id} apagado`, 'info');
			dispatch('delete', { id });
		} else {
			toast(`Erro ao apagar item ${id}`, 'error');
		}
	}

	function addContentBlock(type) {
		contentBlockValidity = [...contentBlockValidity, false];
		content.push(defaultContentBlock(type));
		content = content;
	}

	function dropContentBlock(i) {
		content = [...content.slice(0, i), ...content.slice(i + 1)];
		contentBlockValidity = [
			...contentBlockValidity.slice(0, i),
			...contentBlockValidity.slice(i + 1)
		];
		content = content;
	}

	function stripTimezone(datestr) {
		if (!datestr) {
			return null;
		}

		const date = new Date(datestr);
		return date.toISOString().slice(0, 19);
	}

	async function importExternalImg(e) {
		const newImg = e.detail.img;
		if (images[newImg.id]) return;

		newImg.linked = false;
		newImg.used = false;
		newImg.url = newImg.url_medium;
		images[newImg.id] = newImg;
	}

	function calcImgs() {
		for (const block of content) {
			if ('img' in block) {
				const blockImg = structuredClone(block.img);
				blockImg.linked = false;
				blockImg.used = true;
				images[block.img.id] = blockImg;
			}
		}

		for (const linkedImg of original?.images ?? []) {
			const match = images[linkedImg.id];
			if (match) {
				match.linked = true;
			} else {
				images[linkedImg.id] = {
					id: linkedImg.id,
					url: linkedImg.url_medium,
					transcript: linkedImg.transcript,
					linked: true,
					used: false
				};
			}
		}
	}

	function moveContentBlockUp(i) {
		if (i === 0) {
			return;
		}

		const tmp = content[i - 1];
		content[i - 1] = content[i];
		content[i] = tmp;
		content = content;
	}

	function moveContentBlockDown(i) {
		if (i === content.length - 1) {
			return;
		}

		const tmp = content[i + 1];
		content[i + 1] = content[i];
		content[i] = tmp;
		content = content;
	}

	function externalContentToContentBlocks(data) {
		const refBlock = { ref: { name: null, url: null } };

		if (data.source == 'lpp') {
			refBlock.ref.name = 'Lisboa para Pessoas';
			refBlock.ref.url = data.url;
		}

		return [{ md: data.content }, refBlock];
	}

	onMount(() => {
		if (!id) {
			return;
		}
		fetch(`${apiServer}/v1/news/${id}`, {
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include'
		})
			.then((r) => r.json())
			.then((item) => {
				original = item;
				title = item.title;
				summary = item.summary;
				content = item.content;
				pubDatetime = stripTimezone(item.publish_datetime);
				editDatetime = stripTimezone(item.edit_datetime);
				author_override = item.author_override;
				is_visible = item.is_visible;

				selectedRegions = item.region_ids.map((id) => {
					return { value: id };
				});
				selectedOperators = item.operator_ids.map((id) => {
					return { value: id };
				});
				calcImgs();
			});
	});
</script>

{#if loaded}
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
					class:input-error={!nonBlankString(title)}
					disabled={!canEdit}
				/>
			</label>
		</div>
	</h2>
	<h4 class="label-text">Sumário:</h4>
	<textarea
		class="w-full h-20 input input-bordered"
		class:input-error={!nonBlankString(summary)}
		bind:value={summary}
		disabled={!canEdit}
	></textarea>
	<h4 class="label-text">Miniatura:</h4>
	<div class="flex gap-2 flex-wrap ml-2">
		<button
			class="btn btn-outline h-32"
			class:btn-active={thumbId == null}
			on:click={() => (thumbId = null)}>Sem imagem</button
		>
		{#each Object.values(images ?? {}) as img}
			<button class="relative" x on:click={() => (thumbId = img.id)}>
				<img
					src={img.url}
					alt={img.transcript}
					class="max-h-32 rounded-lg hover:scale-110 transition-all"
					class:border-2={thumbId == img.id}
					class:border-primary={thumbId == img.id}
				/>
			</button>
		{/each}
	</div>
	<h4 class="label-text">Conteúdo:</h4>
	{#each content as block, i}
		<ContentBlock
			bind:block
			bind:images
			{canEdit}
			hasPrevious={i > 0}
			hasNext={i < content.length - 1}
			on:up={() => moveContentBlockUp(i)}
			on:down={() => moveContentBlockDown(i)}
			on:drop={() => dropContentBlock(i)}
			on:validation-update={(e) => (contentBlockValidity[i] = e.detail.isValid)}
			on:refresh-imgs={calcImgs}
		></ContentBlock>
	{/each}
	<div class="flex flex-wrap gap-3 justify-end">
		<button
			class="btn btn-primary btn-sm"
			on:click={() => {
				addContentBlock('md');
			}}>+Texto</button
		>
		<button
			class="btn btn-primary btn-sm"
			on:click={() => {
				addContentBlock('img');
			}}>+Imagem</button
		>
		<button
			class="btn btn-primary btn-sm"
			on:click={() => {
				addContentBlock('map');
			}}>+Mapa</button
		>
		<button
			class="btn btn-primary btn-sm"
			on:click={() => {
				addContentBlock('ref');
			}}>+Continuação</button
		>
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
				<span>Publicação</span>
				<input type="datetime-local" bind:value={pubDatetime} class="input input-bordered" />
			</label>
		</div>
		<div class="form-control">
			<label class="input-group">
				<span>Edição</span>
				<input type="datetime-local" bind:value={editDatetime} class="input input-bordered" />
			</label>
		</div>
	</div>
	<div class="flex py-2 gap-4 flex-wrap">
		<div class="form-control">
			<label class="input-group">
				<span>Autor alternativo</span>
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
	<div class="alert flex border-2 border-info bg-zinc-50 relative px-2 pb-3">
		<span class="-top-2 left-4 badge badge-info absolute">Fontes externas</span>
		<button
			class="-top-2 right-4 btn btn-xs btn-success absolute"
			on:click={() => {
				newExternalDialog.showModal();
			}}>+</button
		>
		<div class="flex flex-col gap-2 w-full">
			{#each externalIds as externalId}
				{#key externalId}
					<ExternalSourceRow
						{externalId}
						{operators}
						{regions}
						{canEdit}
						on:sync-title={(e) => {
							title = e.detail.title;
							toast('Título sincronizado', 'success');
						}}
						on:sync-summary={(e) => {
							summary = e.detail.summary;
							toast('Sumário sincronizado', 'success');
						}}
						on:sync-content={(e) => {
							content = externalContentToContentBlocks(e.detail);
							toast('Conteúdo sincronizado', 'success');
						}}
						on:sync-regions={(e) => {
							selectedRegions = e.detail.regionIds.map((id) => {
								return {
									label: $regions[id]?.name,
									value: id
								};
							});
							toast('Regiões sincronizadas', 'success');
						}}
						on:sync-operators={(e) => {
							selectedOperators = e.detail.operatorIds.map((id) => {
								return {
									label: $operators[id]?.name,
									value: id
								};
							});
							toast('Operadores sincronizados', 'success');
						}}
						on:sync-pub-date={(e) => {
							pubDatetime = stripTimezone(e.detail.pubDatetime);
							toast('Data de publicação sincronizada', 'success');
						}}
						on:sync-edit-date={(e) => {
							editDatetime = stripTimezone(e.detail.editDatetime);
							toast('Data de edição sincronizada', 'success');
						}}
						on:sync-author={(e) => {
							author_override = e.detail.author;
							toast('Autor sincronizado', 'success');
						}}
						on:sync-all={(e) => {
							title = e.detail.title;
							summary = e.detail.summary;
							selectedRegions = e.detail.regionIds.map((id) => {
								return {
									label: $regions[id]?.name,
									value: id
								};
							});
							selectedOperators = e.detail.operatorIds.map((id) => {
								return {
									label: $operators[id]?.name,
									value: id
								};
							});
							pubDatetime = stripTimezone(e.detail.pubDatetime);
							editDatetime = stripTimezone(e.detail.editDatetime);
							author_override = e.detail.author;
							content = externalContentToContentBlocks(e.detail);
							externalDialog?.close();
							toast('Tudo sincronizado', 'success');
						}}
						on:import-img={importExternalImg}
						on:open-dialog={(e) => {
							externalDialog = e.detail.dialog;
						}}
						on:delete={(e) => {
							externalIds = externalIds.filter((id) => id !== e.detail.id);
							externalIds = externalIds;
						}}
					/>
				{/key}
			{/each}
		</div>
	</div>

	<div class="flex gap-2 justify-between">
		{#if id}
			<button class="btn btn-error" class:hidden={!canEdit} on:click={deleteItem}>Apagar</button>
		{:else}
			<span></span>
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

<dialog bind:this={newExternalDialog} class="modal modal-bottom sm:modal-middle">
	<div class="modal-box relative z-30 sm:max-w-5xl">
		<div>
			<form method="dialog">
				<button class="btn btn-sm btn-circle btn-error absolute right-2 top-2">
					<Icon name="close" class="h-4 stroke-current" />
				</button>
			</form>
			<div class="form-control mb-2">
				<label class="input-group">
					<span>Identificador</span>
					<input type="number" bind:value={$newExternalId} class="input input-bordered" />
				</label>
			</div>
			<div class="flex gap-2 w-full items-center">
				{#if $newExternalId}
					{#if $newExternalItem}
						<span class="btn btn-success"></span>
					{:else}
						<span class="btn btn-error"></span>
					{/if}
					<span class="text-lg font-bold">{$newExternalItem?.title}</span>
				{/if}
			</div>
			<div class="flex justify-end">
				<button
					class="btn btn-info"
					on:click={() => {
						newExternalDialog.close();
						// Add ensuring no duplicates
						externalIds = [...new Set([...externalIds, $newExternalId])];
						toast(`Conteúdo externo ligado com sucesso`, 'success');
					}}>Adicionar</button
				>
			</div>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button></button>
	</form>
</dialog>
