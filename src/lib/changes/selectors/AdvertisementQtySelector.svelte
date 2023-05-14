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
	<option value={0}>Sem anúncios</option>
	<option value={2}>Pouca área de anúncio</option>
	<option value={4}>Muita área de anúncio</option>
	<option value={6}>Anúncios intrusivos</option>
</select>
