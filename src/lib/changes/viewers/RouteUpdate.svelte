<script>
	import { listDifferences } from '$lib/utils.js';

	export let change;
	let expand = false;

	$: diffs = listDifferences(change.original, change.patch);
</script>

<h3 class="font-bold">
	Alteração rota {change.original.name}; ({change.original.id})
</h3>

{#if expand}
	<ul>
		{#each diffs as diff}
			<li>
				{diff.key}:
				{#if diff.original}<span class="bg-red-300">{diff.original}</span>{/if}
				-&gt; <span class="bg-green-300">{diff.new}</span>
			</li>
		{/each}
	</ul>
{:else}
	<button class="link" on:click={() => (expand = true)}>Mostrar</button>
{/if}
