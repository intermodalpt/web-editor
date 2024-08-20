<script>
	import { permissions } from '$lib/stores';
	import ContentBlock from '$lib/content/renderer/ContentBlock.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Boolean from '$lib/components/Boolean.svelte';
	import ExternalNewsItemLoader from './ExternalNewsItemLoader.svelte';

	export let item;
	export let operators;
	export let regions;

	let previewExternalDialog;
	let previewExternalId;

	const publishDatetime = new Date(item.publish_datetime).toLocaleString('pt');
	const editDatetime = item.edit_datetime
		? new Date(item.edit_datetime).toLocaleString('pt')
		: null;
</script>

<div class="flex gap-2 flex-wrap text-xl font-bold">{item.title}</div>
<div class="flex flex-wrap items-center gap-2 ml-2">
	<span class="flex gap-2 text-sm"><Icon name="clock" class="w-4" />{publishDatetime}</span>
	{#if editDatetime}
		<span class="flex gap-2 text-sm"><Icon name="pencil" class="w-4" />{editDatetime}</span>
	{/if}
	<Boolean state={item.is_visible} text="Visibilidade" />
</div>
<span class="label-text text-slate-500">Sumário</span>
<p class="ml-2">{item.summary}</p>
<span class="label-text text-slate-500">Conteúdo</span>
{#if item.content.length === 0}
	<div class="ml-2 text-lg">Sem conteúdo</div>
{/if}
{#each item.content as block}
	<ContentBlock {block} />
{/each}

{#if item.operator_ids.length > 0}
	<span class="label-text text-slate-500">Operadores</span>
	<div class="flex gap-2 flex-wrap ml-2">
		{#each item.operator_ids as operatorId}
			<span class="badge badge-outline border-orange-500">{operators[operatorId]?.name}</span>
		{/each}
	</div>
{/if}
{#if item.region_ids.length > 0}
	<span class="label-text text-slate-500">Regiões</span>
	<div class="flex gap-2 flex-wrap ml-2">
		{#each item.region_ids as regionId}
			<span class="badge badge-outline border-green-500">{regions[regionId]?.name}</span>
		{/each}
	</div>
{/if}

<div class="alert flex border-2 border-info bg-zinc-50 relative mt-3 px-2 pb-3">
	<span class="-top-2 left-4 badge badge-info absolute">Fontes externas</span>
	<div class="flex flex-col gap-2 w-full">
		{#each item.external_rels as externalRel}
			<button
				class="flex gap-2 w-full items-center"
				on:click={() => {
					previewExternalId = externalRel.id;
					previewExternalDialog.showModal();
				}}
			>
				<span class="input content-center bg-base-300 rounded-lg hidden sm:block"
					>#{externalRel.id}</span
				>
				<div class="grow">
					<div class="font-semibold flex w-full justify-between">
						<h3 class="grow text-lg font-bold text-left">{externalRel.title ?? 'Sem título'}</h3>
						<span class="text-xs text-slate-400 self-start sm:hidden">#{item.id}</span>
					</div>
					<div class="flex gap-2 flex-wrap">
						<div class="badge badge-neutral">{externalRel.source}</div>
						<span>{new Date(externalRel.publish_datetime).toLocaleString('pt')}</span>
					</div>
				</div>
			</button>
		{/each}

		{#if item.external_rels.length === 0}
			<div class="text-center">Sem fontes externas</div>
		{/if}
	</div>
</div>

<div class="flex flex-wrap justify-end gap-2 mt-2">
	<slot name="actions" />
	{#if $permissions?.news?.modify}
		<a class="btn btn-neutral btn-sm" href="/news/{item.id}/edit"
			><Icon name="pencil" class="p-1 h-full fill-white" />Editar</a
		>
	{/if}
</div>

<dialog bind:this={previewExternalDialog} class="modal modal-bottom sm:modal-middle">
	<div class="modal-box relative z-30 sm:max-w-5xl">
		<div>
			<form method="dialog">
				<button class="btn btn-sm btn-circle btn-error absolute right-2 top-2">
					<Icon name="close" class="h-4 stroke-current" />
				</button>
			</form>
			{#if previewExternalId}
				{#key previewExternalId}
					<ExternalNewsItemLoader id={previewExternalId} {operators} {regions} />
				{/key}
			{/if}
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button></button>
	</form>
</dialog>
