<script>
	export let change;
	let expand = false;
</script>

<h3 class="font-bold">
	Criação de variante {change.data.flag} ({change.data.id})
</h3>

{#if expand}
	<ul>
		<li>Flag: <span class="bg-green-300">{change.data.flag}</span></li>
		<li>Circular: <span class="bg-green-300">{change.data.circular}</span></li>
		<li>Polyline: <span class="bg-green-300">{change.data.polyline}</span></li>
	</ul>
{:else}
	<span
		class="link"
		on:mouseup={() => {
			expand = true;
		}}>Mostrar</span
	>
{/if}
