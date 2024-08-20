<script>
	import { marked } from 'marked';
	import { permissions } from '$lib/stores';
	import ContentBlock from '$lib/content/renderer/ContentBlock.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Boolean from '$lib/components/Boolean.svelte';

	export let item;
	export let operators;
	export let regions;

	const content_html = marked(item.content_md);

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
	<div class="flex gap-1">
		<span class="badge badge-info badge-sm">{item.source}</span>
		{#if item.url}
			<a class="link link-primary text-xs" href={item.url} target="_blank" rel="noopener noreferrer"
				>Link</a
			>
		{/if}
		<span class="text-xs text-slate-500 self-start">#{item.id}</span>
	</div>
</div>
<div class="flex gap-2 flex-wrap ml-2 mt-1">
	<Boolean state={item.is_validated} text="Validado" />
	<Boolean state={item.is_sensitive} text="Sensivel" />
	<Boolean state={item.is_complete} text="Completo" />
	<Boolean state={item.is_relevant} text="Relevante" />
</div>
<span class="label-text text-slate-500">Sumário</span>
<p class="ml-2">{item.summary}</p>
<span class="label-text text-slate-500">Conteúdo</span>
<div class="ml-2">
	{@html content_html}
</div>
<span class="label-text text-slate-500">Imagens</span>
<div class="flex gap-2 flex-wrap ml-2">
	{#each item.images ?? [] as image}
		<button>
			<img
				src={image.url}
				alt={image.transcript}
				class="max-h-32 rounded-lg hover:scale-110 transition-all"
			/>
		</button>
	{/each}
	{#if (item.images ?? []).length === 0}
		<span>Sem imagens referênciadas</span>
	{/if}
</div>

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

<div class="flex flex-wrap justify-end gap-2 mt-2">
	<slot name="actions" />
	{#if $permissions?.externalNews?.modify}
		<a class="btn btn-neutral btn-sm" href="/news/external/{item.id}/edit"
			><Icon name="pencil" class="p-1 h-full fill-white" />Editar</a
		>
	{/if}
</div>
