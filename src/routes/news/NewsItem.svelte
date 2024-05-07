<script>
	import BooleanToggle from '$lib/components/BooleanToggle.svelte';

	export let item;
	export let operators;
	export let regions;
</script>

<h2 class="card-title text-lg">
	<span class="text-xs">#{item.id}</span>
	{item.title}
</h2>
<p class="text-justify">{item.summary}</p>

<div class="flex gap-2 flex-wrap justify-between">
	<div class="flex gap-2 flex-wrap">
		{#if $operators}
			{#each item.operator_ids as operator_id}
				<span class="badge badge-outline border-orange-500">{$operators[operator_id]?.name}</span>
			{/each}
		{/if}
		{#if $regions}
			{#each item.region_ids as region_id}
				<span class="badge badge-outline border-green-500">{$regions[region_id]?.name}</span>
			{/each}
		{/if}
	</div>
</div>

<div class="flex gap-2 flex-wrap justify-between">
	<div class="flex gap-2 flex-wrap" />

	<div class="flex flex-wrap gap-2 justify-end">
		<span class="label-text">Pub:{new Date(item.publish_datetime).toLocaleString('pt')}</span>
		<span class="label-text">Edit:{new Date(item.edit_datetime).toLocaleString('pt')}</span>

		<div class="flex gap-2 flex-wrap">
			<span>Visível:</span>
			<BooleanToggle state={item.is_visible} disabled={true} compact={true} nullable={false} />
		</div>
	</div>
</div>
