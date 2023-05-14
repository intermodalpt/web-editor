<script>
	export let val;
	export let disabled = true;
	export let wrong = false;
</script>

<select
	class="select select-xs"
	{disabled}
	value={val}
	class:select-primary={!wrong}
	class:select-error={wrong}
>
	<option disabled selected value={null}>Disfuncional ao acesso?</option>
	<option value={0}>Acesso sem inteferência</option>
	<option value={2}>Acesso com pouca intreferêcia</option>
	<option value={4}>Acesso com alguma intreferência</option>
	<option value={6}>Acesso com muita intreferência</option>
</select>
