<script lang="ts">
	import OperatorForm from '../../OperatorForm.svelte';
	import Menu from '../Menu.svelte';

	export let data;
	const operator = data.operator;
	const routeTypes = data.routeTypes;
</script>

<Menu {operator} page="attrs" />

<div class="card-body">
	<OperatorForm id={operator.id} {routeTypes} />
</div>
