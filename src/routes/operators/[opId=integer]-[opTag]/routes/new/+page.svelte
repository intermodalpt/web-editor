<script>
	import RouteForm from '../form/RouteForm.svelte';
	import { permissions } from '$lib/stores.js';
	import { canCreateRoutes } from '$lib/permissions';

	/** @type {import('./$types').PageData} */
	export let data;
	const operator = data.operator;
	const routeTypes = data.routeTypes;

	const blankRoute = {
		id: null,
		code: null,
		name: null,
		circular: false,
		active: true,
		operator_id: operator.id,
		main_subroute: null,
		type_id: null
	};

	let route = {
		...structuredClone(blankRoute),
		subroutes: [],
		_original: blankRoute,
		_modified: false
	};

	function handleRouteCreated(event) {
		const newRoute = event.detail.route;
		goto(`/operators/${operator.id}-${operator.tag}/routes/${newRoute.id}-${newRoute.code || ''}`);
	}
</script>

<svelte:head>
	<title>Intermodal - Nova rota em {operator.name}</title>
	<meta name="description" content="Editor de dados do Intermodal" />
</svelte:head>

<div class="card self-center bg-base-100 shadow-md w-full max-w-[900px] mt-2">
	<div class="card-body">
		<h2 class="card-title">Nova rota em {operator.name}</h2>
		<RouteForm
			bind:route
			canEdit={canCreateRoutes($permissions)}
			{routeTypes}
			on:route-created={handleRouteCreated}
		/>
	</div>
</div>
