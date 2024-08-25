<script lang="ts">
	import OperatorForm from '../../OperatorForm.svelte';
	import Menu from '../Menu.svelte';

	export let data;
	const operator = data.operator;
	const regions = data.regions;
</script>

<Menu {operator} page="attrs" />

<div class="card-body">
	<!-- TODO We already have the entire operator but the form will redownload. Optimize this. -->
	<OperatorForm id={operator.id} {regions} />
</div>
