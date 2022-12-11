<script>
	import { listDifferences } from '$lib/utils.js';

	export let change;
	let expand = false;

	$: diffs = listDifferences(change.original, change.patch);
</script>

<h3 class="font-bold">
	Criação de variante {change.original.flag} ({change.original.id})
</h3>

{#if expand}
	<ul>
		{#each diffs as diff}
			<li>
				{diff.key}:
				{#if diff.original}<span class="bg-red-300">{diff.original}</span>{/if}
				-> <span class="bg-green-300">{diff.new}</span>
			</li>
		{/each}
	</ul>
{:else}
	<span
		class="link"
		on:mouseup={() => {
			expand = true;
		}}>Mostrar</span
	>
{/if}
