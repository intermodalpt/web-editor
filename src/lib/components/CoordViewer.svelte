<script>
	export let lat;
	export let lon;
</script>

<div class="join">
	<button
		class="join-item p-1 btn btn-xs"
		on:click={() => {
			navigator.clipboard.writeText(lat?.toFixed(6));
		}}>{lat?.toFixed(6)}</button
	>
	<button
		class="join-item p-1 btn btn-xs"
		on:click={() => {
			navigator.clipboard.writeText(lon?.toFixed(6));
		}}>{lon?.toFixed(6)}</button
	>
	<button
		class="btn btn-info btn-xs join-item"
		on:click={() => {
			navigator.clipboard.writeText(lat?.toFixed(6) + ',' + lon?.toFixed(6));
		}}>Copiar</button
	>
</div>
