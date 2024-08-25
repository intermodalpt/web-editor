<script lang="ts">
	import Editor from '$lib/issues/Editor.svelte';

	export let data;
	const issue = data.issue;
	const operators = data.operators;
	const stops = data.stops;
	const routes = data.routes;
	const regions = data.regions;

	const operatorIndex = Object.fromEntries(operators.map((o) => [o.id, o]));
	const stopIndex = Object.fromEntries(stops.map((s) => [s.id, s]));
	const routeIndex = Object.fromEntries(routes.map((r) => [r.id, r]));
	const regionIndex = Object.fromEntries(regions.map((r) => [r.id, r]));
</script>

<div class="card-body">
	<h2 class="card-title">Editar problema</h2>
	<Editor
		{issue}
		operators={operatorIndex}
		stops={stopIndex}
		routes={routeIndex}
		regions={regionIndex}
	/>
</div>
