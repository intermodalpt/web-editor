<script>
	import { onMount, createEventDispatcher } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import Select from 'svelte-select';
	import { apiServer } from '$lib/settings.js';
	import { token, toast } from '$lib/stores.js';
	import ExternalSourceRow from './ExternalSourceRow.svelte';
	import BooleanToggle from '$lib/components/BooleanToggle.svelte';
	import MdContent from './content/MdContent.svelte';
	import PicContent from './content/PicContent.svelte';
	import MapContent from './content/MapContent.svelte';
	import ReadMoreContent from './content/ContinuationContent.svelte';

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
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${$token}`
			}
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
	let content_md = '';
	let is_visible = true;
	let author_override = null;
	let publish_datetime = null;
	let edit_datetime = null;
	let content = [];
	let externalIds = [2, 6];
	let pictures = {};
	let thumbId = null;

	$: formValid = true;

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

	function addContentBlock(type) {
		if (type === 'md') {
			content.push({ md: '' });
		} else if (type === 'pic') {
			content.push({
				pic: {
					id: null,
					url: '',
					description: '',
					transcript: null,
					attribution: null
				}
			});
		} else if (type === 'map') {
			content.push({
				map: {
					data: [],
					lat: null,
					lon: null,
					zoom: null
				}
			});
		} else if (type === 'continuation') {
			content.push({
				continuation: {
					name: null,
					url: null
				}
			});
		}

		content = content;
	}

	function dropContentBlock(i) {
		content = [...content.slice(0, i), ...content.slice(i + 1)];
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
		const id = e.detail.id;

		const res = await fetch(`${apiServer}/v1/news/images/import_external/${id}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${$token}`
			}
		});

		if (!res.ok) {
			toast(`Erro ao carregar notícia externa ${$newExternalId}`, 'error');
			return;
		}

		const newImg = await res.json();

		pictures = [...pictures, newImg];
	}

	function calcPics() {
		for (const block of content) {
			if ('pic' in block) {
				const blockPic = structuredClone(block.pic);
				blockPic.linked = false;
				blockPic.used = true;
				pictures[block.pic.id] = blockPic;
			}
		}

		for (const linkedPic of original?.pictures ?? []) {
			const match = pictures[linkedPic.id];
			if (match) {
				match.linked = true;
			} else {
				pictures[linkedPic.id] = {
					id: linkedPic.id,
					url: linkedPic.url_medium,
					transcript: linkedPic.transcript,
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
				title = item.title;
				summary = item.summary;
				content = item.content;
				publish_datetime = stripTimezone(item.publish_datetime);
				edit_datetime = stripTimezone(item.edit_datetime);
				author_override = item.author_override;
				is_visible = item.is_visible;

				selectedRegions = item.region_ids.map((id) => {
					return { value: id };
				});
				selectedOperators = item.operator_ids.map((id) => {
					return { value: id };
				});
				calcPics();
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
					disabled={!canEdit}
				/>
			</label>
		</div>
	</h2>
	<h4 class="label-text">Sumário:</h4>
	<textarea class="w-full h-20 input input-bordered" disabled={!canEdit}>{summary}</textarea>
	<!--<textarea class="w-full h-40 input input-bordered">{JSON.stringify(pictures, null, 2)}</textarea>-->
	<h4 class="label-text">Miniatura:</h4>
	<div class="flex gap-2 flex-wrap ml-2">
		<button
			class="btn btn-outline h-32"
			class:btn-active={thumbId == null}
			on:click={() => (thumbId = null)}>Sem imagem</button
		>
		{#each Object.values(pictures ?? {}) as pic}
			<button
				class="relative"
				on:click={() => (thumbId = pic.id)}
			>
				<img
					src={pic.url}
					alt={pic.transcript}
					class="max-h-32 rounded-lg hover:scale-110 transition-all"
					class:border-2={thumbId == pic.id}
					class:border-primary={thumbId == pic.id}
				/>
			</button>
		{/each}
	</div>
	<h4 class="label-text">Conteúdo:</h4>
	{#each content as block, i}
		<div class="relative border-l-2 border-secondary pl-2">
			<div class="absolute right-2 top-2 flex gap-2">
				<button
					class="btn btn-xs btn-outline"
					class:hidden={i === 0}
					on:click={() => moveContentBlockUp(i)}>↑</button
				>
				<button
					class="btn btn-xs btn-outline"
					class:hidden={i === content.length - 1}
					on:click={() => moveContentBlockDown(i)}>↓</button
				>
				<button class="btn btn-xs btn-error" on:click={() => dropContentBlock(i)}>x</button>
			</div>
			{#if 'md' in block}
				<MdContent bind:data={block.md} {canEdit} />
			{:else if 'pic' in block}
				<PicContent
					bind:data={block.pic}
					bind:pictures
					{canEdit}
					on:new-pic={(e) => {
						const pic = e.detail.pic;

						if (!pictures[pic.id]) {
							pictures[pic.id] = {
								id: pic.id,
								url: pic.url_medium,
								transcript: pic.transcript,
								linked: false,
								used: true
							};
						} else {
							pictures[pic.id].used = true;
						}
						pictures = pictures;
					}}
					on:select-pic={calcPics}
				/>
			{:else if 'map' in block}
				<MapContent bind:data={block.map} {canEdit} />
				<img src={block.url} alt={block.alt} />
			{:else if 'continuation' in block}
				<ReadMoreContent bind:data={block.continuation} {canEdit} />
			{/if}
		</div>
		<hr />
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
				addContentBlock('pic');
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
				addContentBlock('continuation');
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
				<input type="datetime-local" bind:value={publish_datetime} class="input input-bordered" />
			</label>
		</div>
		<div class="form-control">
			<label class="input-group">
				<span>Edição</span>
				<input type="datetime-local" bind:value={edit_datetime} class="input input-bordered" />
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
							content = [{ md: e.detail.content_md || e.detail.prepro_content_md }];
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
							publish_datetime = stripTimezone(e.detail.pubDate);
							toast('Data de publicação sincronizada', 'success');
						}}
						on:sync-edit-date={(e) => {
							edit_datetime = stripTimezone(e.detail.editDate);
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
							publish_datetime = stripTimezone(e.detail.pubDatetime);
							edit_datetime = stripTimezone(e.detail.editDatetime);
							author_override = e.detail.author;
							content = [
								{ md: e.detail.content },
								{ continuation: { name: 'Lisboa para Pessoas', url: e.detail.url } }
							];
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
				<button class="btn btn-sm btn-circle btn-error absolute right-2 top-2">x</button>
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
