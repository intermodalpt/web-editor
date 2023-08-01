<script>
	export let change;
	export let stops;

	$: originalStop = $stops && $stops[change.original.id];
</script>

<div class="flex flex-col">
	<h3 class="font-bold">Alteração paragem {change.original.id}{originalStop ? '' : '(⚠️Apagada)'}</h3> 
	<span>➥ {change.original.name || change.original.official_name}</span>
</div>
