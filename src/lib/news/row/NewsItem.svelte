<script>
	import Boolean from '$lib/components/Boolean.svelte';
	import Icon from '$lib/components/Icon.svelte';

	export let item;
	export let operators;
	export let regions;

	const publishDatetime = new Date(item.publish_datetime).toLocaleString('pt');
	const editDatetime = item.edit_datetime
		? new Date(item.edit_datetime).toLocaleString('pt')
		: null;
</script>

<div class="font-semibold flex w-full justify-between">
	<h2 class="text-lg text-left font-semibold">{item.title}</h2>
	<span class="text-xs text-slate-400 self-start">#{item.id}</span>
</div>
<p class="text-justify">{item.summary}</p>

{#if item.operator_ids.length > 0 || item.region_ids.length > 0}
	<div class="flex gap-2 flex-wrap my-2">
		{#each item.operator_ids as operatorId}
			<span class="badge badge-outline border-orange-500">{operators[operatorId]?.name}</span>
		{/each}
		{#each item.region_ids as regionId}
			<span class="badge badge-outline border-green-500">{regions[regionId]?.name}</span>
		{/each}
	</div>
{/if}

<div class="flex flex-wrap gap-x-2 gap-y-1 justify-between items-center">
	<Boolean state={item.is_visible} text="Visível" />
	<div class="flex flex-wrap text-sm">
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
</div>
