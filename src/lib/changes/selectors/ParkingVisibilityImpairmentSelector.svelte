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
	<option value={0}>Sem limitações à visibilidade</option>
	<option value={2}>Pouco limitante à visibilidade</option>
	<option value={4}>Algo limitante à visibilidade</option>
	<option value={6}>Muito limitante à visibilidade</option>
</select>
