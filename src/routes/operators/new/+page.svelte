<script lang="ts">
	import OperatorForm from '../OperatorForm.svelte';

	export let data;
	const regions = data.regions;
</script>

<div class="card self-center bg-base-100 shadow-md w-full max-w-[900px] mt-2">
	<div class="card-body">
		<h2 class="card-title">Novo operador</h2>
		<OperatorForm {regions} />
	</div>
</div>
