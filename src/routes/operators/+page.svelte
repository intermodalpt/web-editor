<script lang="ts">
	import { derived } from 'svelte/store';
	import { regionId } from '$lib/db';
	import OperatorCard from '$lib/components/OperatorCard.svelte';

	export let data;

	const operators = data.operators;
	const regions = data.regions;

	const sortedOperators = Object.values(operators).sort((a, b) => {
		return a.name.localeCompare(b.name);
	});

	const regionOperators = derived(regionId, ($regionId) => {
		if (!$regionId) return [];
		return sortedOperators.filter((operator) => {
			return operator.regions.includes($regionId);
		});
	});

	const otherOperators = derived(regionId, ($regionId) => {
		if (!$regionId) return sortedOperators;
		return sortedOperators.filter((operator) => {
			return !operator.regions.includes($regionId);
		});
	});
</script>

<svelte:head>
	<title>Editor Intermodal - Operadores</title>
	<meta name="description" content="Editor Intermodal - Operadores" />
</svelte:head>

<div class="card w-[min(100em,100%)] self-center shadow-sm my-4 bg-base-100">
	<div class="card-body">
		<h2 class="card-title">Operadores</h2>
		<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
			{#each $regionOperators as operator}
				<OperatorCard {operator} {regions} />
			{/each}
		</div>
		<div class="divider">Em outras regiões</div>
		<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
			{#each $otherOperators as operator}
				<OperatorCard {operator} {regions} />
			{/each}
		</div>
	</div>
</div>
