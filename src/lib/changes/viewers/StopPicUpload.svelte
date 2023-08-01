<script>
	export let change;
	let expand = false;
</script>

<h3 class="font-bold">
	<!-- {change.pic.id}, {change.pic.original_filename} -->
</h3>

{#if expand}
	<ul>
		<li>Upload date: <span class="bg-green-300">{change.pic.upload_date}</span></li>
		<li>Public: <span class="bg-green-300">{change.pic.public}</span></li>
		<li>Sensitive: <span class="bg-green-300">{change.pic.sensitive}</span></li>
		<li>Notes: <span class="bg-green-300">{change.pic.notes}</span></li>
		<li>Width: <span class="bg-green-300">{change.pic.width}</span></li>
		<li>Height: <span class="bg-green-300">{change.pic.height}</span></li>
		{#if change.pic.lat && change.pic.lon}
			<li>Lat: <span class="bg-green-300">{change.pic.lat}</span></li>
			<li>Lon: <span class="bg-green-300">{change.pic.lon}</span></li>
		{/if}
	</ul>
{:else}
	<span
		class="link"
		on:mouseup={() => {
			expand = true;
		}}>Mostrar</span
	>
{/if}
