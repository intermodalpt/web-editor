<script>
	export let change;
	export let stops;

	$: originalStop = $stops && $stops[change.original.id];
</script>

<div class="flex flex-col">
	<h3
		class="font-bold self-start"
		class:border-b-2={!originalStop}
		class:border-error={!originalStop}
	>
		Alteração paragem {change.original.id}
	</h3>
	<span>➥ {change.original.name || change.original.official_name}</span>
</div>
