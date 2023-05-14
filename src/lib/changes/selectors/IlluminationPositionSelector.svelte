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
	<option selected value={null}>Desconhecido</option>
	<option value={0}>Sem iluminação</option>
	<option value={1}>Iluminação Fraca</option>
	<option value={3}>Iluminação Moderada</option>
	<option value={5}>Iluminação Forte</option>
</select>
