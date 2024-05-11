<script>
	import { decodedToken } from '$lib/stores.js';
	import OperatorForm from '../../OperatorForm.svelte';

	/** @type {import('./$types').PageData} */
	export let data;
	const operator = data.operator;
	const routeTypes = data.routeTypes;

	const isAdmin = $decodedToken?.permissions?.is_admin || false;
</script>

<svelte:head>
	<title>Intermodal - Novo operador</title>
	<meta name="description" content="Editor de dados do Intermodal" />
</svelte:head>

<div class="card self-center bg-base-100 shadow-md w-full max-w-[900px] mt-2">
	<div class="card-body">
		<h2 class="card-title">Editar {operator.name}</h2>
		<OperatorForm id={operator.id} {routeTypes} canEdit={isAdmin} />
	</div>
</div>
