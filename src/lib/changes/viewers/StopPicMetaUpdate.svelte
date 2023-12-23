<script>
	import { listDifferences, isDeepEqual } from '$lib/utils.js';

	export let change;
	let expand = false;

	$: diffs = listDifferences(change.original_meta, change.meta_patch);
</script>

<h3 class="font-bold">
	Alteração à fotografia {change.id}
</h3>

<ul>
	{#each diffs as diff}
		<li>
			{diff.key}:
			{#if diff.original}<span class="bg-red-300">{diff.original}</span>{/if}
			<span class="bg-green-300">{diff.new}</span>
		</li>
	{/each}
	{#if !isDeepEqual(change.original_stops, change.stops)}
		<li>Paragens:</li>
		<li class="ml-4">
			<span class="bg-green-300">
				{#each change.stops as stop}
					<span class="bg-green-300">{JSON.stringify(stop)}</span>
				{/each}
			</span>
		</li>
		<li class="ml-4">
			<span class="bg-green-300">
				{#each change.original_stops as stop}
					<span class="bg-red-300">{JSON.stringify(stop)}</span>
				{/each}
			</span>
		</li>
	{/if}
</ul>
