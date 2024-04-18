<script>
	export let state = null;
	export let disabled = false;
	export let compact = false;
	export let nullable = true;

	function rotateState() {
		if (state === null || (!nullable && !state)) {
			state = true;
		} else if (state) {
			state = false;
		} else {
			state = null;
		}
	}
</script>

{#if compact}
	{#if state}
		<button
			class="btn btn-xs border-0 bg-green-400 hover:bg-green-500 text-green-900 w-10"
			class:!bg-green-300={disabled}
			class:!hover:bg-green-300={disabled}
			class:cursor-not-allowed={disabled}
			on:click={() => !disabled && rotateState()}>Sim</button
		>
	{:else if state === false}
		<button
			class="btn btn-xs border-0 bg-red-400 hover:bg-red-500 text-yellow-900 w-10"
			class:!bg-red-300={disabled}
			class:!hover:bg-red-300={disabled}
			class:cursor-not-allowed={disabled}
			on:click={() => !disabled && rotateState()}>Não</button
		>
	{:else}
		<button
			class="btn btn-xs border-0 bg-yellow-400 hover:bg-yellow-500 text-red-900 w-10"
			class:!bg-yellow-300={disabled}
			class:!hover:bg-yellow-300={disabled}
			class:cursor-not-allowed={disabled}
			on:click={() => !disabled && rotateState()}>???</button
		>
	{/if}
{:else}
	<div class="btn-group">
		<button
			class="btn btn-sm border-0 bg-green-50 hover:bg-green-500 w-10"
			class:!bg-green-500={state && !disabled}
			class:!bg-green-300={state && disabled}
			class:cursor-not-allowed={disabled}
			on:click={() => !disabled && (state = true)}>✔️</button
		>
		{#if nullable}
			<button
				class="btn btn-sm border-0 bg-yellow-50 hover:bg-yellow-500 w-8"
				class:!bg-yellow-500={(state == null || state == undefined) && !disabled}
				class:!bg-yellow-300={(state == null || state == undefined) && disabled}
				class:cursor-not-allowed={disabled}
				on:click={() => !disabled && (state = null)}>❓</button
			>
		{/if}
		<button
			class="btn btn-sm border-0 bg-red-50 hover:bg-red-500 text-red-900 font-extrabold w-10"
			class:!bg-red-400={state === false && !disabled}
			class:!bg-red-300={state === false && disabled}
			class:cursor-not-allowed={disabled}
			on:click={() => !disabled && (state = false)}>X</button
		>
	</div>
{/if}
