<script>
	import { derived } from 'svelte/store';
	import { liveQuery } from 'dexie';
	import { loadMissing, fetchOperators, getOperators, getRegions, regionId } from '$lib/db';
	import OperatorCard from './OperatorCard.svelte';

	const operators = liveQuery(() => getOperators());
	const regions = liveQuery(() => getRegions());

	const sortedOperators = derived(operators, ($operators) => {
		if (!$operators) return [];
		return Object.values($operators).sort((a, b) => {
			return a.name.localeCompare(b.name);
		});
	});

	const regionOperators = derived([sortedOperators, regionId], ([$sortedOperators, $regionId]) => {
		if (!$regionId || !$sortedOperators) return [];
		return $sortedOperators.filter((operator) => {
			return operator.regions.includes($regionId);
		});
	});

	const otherOperators = derived([sortedOperators, regionId], ([$sortedOperators, $regionId]) => {
		if (!$regionId || !$sortedOperators) return [];
		return $sortedOperators.filter((operator) => {
			return !operator.regions.includes($regionId);
		});
	});

	fetchOperators().then(async () => {
		console.log('data loaded');
		await loadMissing();
	});
</script>

<svelte:head>
	<title>Editor Intermodal - Operadores</title>
	<meta name="description" content="Editor Intermodal - Operadores" />
</svelte:head>

<div class="card max-w-[100em] self-center shadow-sm my-4 bg-base-100">
	<div class="card-body">
		<h2 class="card-title">Operadores</h2>
		<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
			{#each $regionOperators as operator}
				<OperatorCard {operator} regions={$regions} />
			{/each}
		</div>
		<div class="divider">Em outras regiões</div>
		<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
			{#each $otherOperators as operator}
				<OperatorCard {operator} regions={$regions} />
			{/each}
		</div>
	</div>
</div>
