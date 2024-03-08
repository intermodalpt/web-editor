<script>
	export let lat;
	export let lon;
</script>

<div class="join">
	<input
		class="join-item p-1 btn btn-xs"
		type="button"
		value={lat.toFixed(6)}
		on:click={() => {
			navigator.clipboard.writeText(lat.toFixed(6));
		}}
		on:keypress={() => {
			navigator.clipboard.writeText(lat.toFixed(6));
		}}
	/>
	<input
		class="join-item p-1 btn btn-xs"
		type="button"
		value={lon.toFixed(6)}
		on:click={() => {
			navigator.clipboard.writeText(lon.toFixed(6));
		}}
		on:keypress={() => {
			navigator.clipboard.writeText(lon.toFixed(6));
		}}
	/>
	<input
		class="btn btn-info btn-xs join-item"
		type="button"
		value="Copiar"
		on:click={() => {
			navigator.clipboard.writeText(lat.toFixed(6) + ',' + lon.toFixed(6));
		}}
		on:keypress={() => {
			navigator.clipboard.writeText(lat.toFixed(6) + ',' + lon.toFixed(6));
		}}
	/>
</div>
