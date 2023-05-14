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
	<option disabled selected value={null}>Disfuncional à paragem?</option>
	<option value={0}>Sem inteferência à paragem</option>
	<option value={2}>Pouca intreferêcia à paragem</option>
	<option value={4}>Alguma intreferência à paragem</option>
	<option value={6}>Muita intreferência à paragem</option>
</select>
