<script>
	const values = {
		little: 'little',
		some: 'some',
		alot: 'alot',
		enthusiast: 'enthusiast'
	};
    
	export let value = null;
</script>

<div role="tablist" class="tabs tabs-boxed w-fit ml-2">
	<button
		role="tab"
		tabindex="0"
		class="tab"
		class:tab-active={value === values.little}
		on:click={() => (value = values.little)}>Pouco</button
	>
	<button
		role="tab"
		tabindex="0"
		class="tab"
		class:tab-active={value === values.some}
		on:click={() => (value = values.some)}>Algum</button
	>
	<button
		role="tab"
		tabindex="0"
		class="tab"
		class:tab-active={value === values.alot}
		on:click={() => (value = values.alot)}>Muito</button
	>
	<button
		role="tab"
		tabindex="0"
		class="tab"
		class:tab-active={value === values.enthusiast}
		on:click={() => (value = values.enthusiast)}>Entusiasta</button
	>
</div>
