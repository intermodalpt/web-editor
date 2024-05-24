<script>
	export let change;
	let expand = false;
</script>

<h3 class="font-bold">
	Extinção da variante {change.data?.flag || change.subroute?.flag} ({change.data?.id ||
		change.subroute.id})
</h3>

{#if expand}
	<ul>
		{#each Object.entries(change.data) as [key, value]}
			<li>{key}:<span class="bg-red-300">{value}</span></li>
		{/each}
	</ul>
{:else}
	<button class="link" on:click={() => (expand = true)}>Mostrar</button>
{/if}
