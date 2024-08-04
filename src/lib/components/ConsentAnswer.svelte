<script>
	export let value;
</script>

<div role="tablist" class="tabs tabs-boxed w-fit">
	<button
		role="tab"
		tabindex="0"
		class="tab"
		class:tab-active={value === true}
		on:click={() => (value = true)}>Sim</button
	>
	<button
		role="tab"
		tabindex="0"
		class="tab"
		class:tab-active={value === false}
		on:click={() => (value = false)}>Não</button
	>
</div>
