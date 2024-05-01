<script>
	import Markdown from '$lib/components/Markdown.svelte';

	export let data;
	export let canEdit;

	const tabs = {
		edit: 1,
		preview: 2,
		hybrid: 3
	};
	let tab = tabs.hybrid;
</script>

<div role="tablist" class="tabs tabs-boxed mb-1">
	<button
		role="tab"
		class="tab"
		class:tab-active={tab == tabs.edit}
		on:click={() => (tab = tabs.edit)}>Editar</button
	>
	<button
		role="tab"
		class="tab"
		class:tab-active={tab == tabs.preview}
		on:click={() => (tab = tabs.preview)}>Prever</button
	>
	<button
		role="tab"
		class="tab"
		class:tab-active={tab == tabs.hybrid}
		on:click={() => (tab = tabs.hybrid)}>Ambos</button
	>
</div>
{#if tab == tabs.hybrid}
	<div class="grid grid-cols-1 xl:grid-cols-2 gap-2">
		<textarea class="w-full input input-bordered h-40 grow" disabled={!canEdit} bind:value={data}
		></textarea>
		<Markdown content={data} />
	</div>
{:else if tab == tabs.edit}
	<textarea class="w-full input input-bordered h-40" disabled={!canEdit} bind:value={data}
	></textarea>
{:else if tab == tabs.preview}
	<Markdown content={data} />
{/if}
