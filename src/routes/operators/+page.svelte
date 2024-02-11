<script>
	import { derived } from 'svelte/store';
	import { liveQuery } from 'dexie';
	import { loadMissing, fetchOperators, getOperators } from '$lib/db';

	const operators = liveQuery(() => getOperators());

	const sortedOperators = derived(operators, ($operators) => {
		return Object.entries($operators || []).sort(([, a], [, b]) => {
			return a.name.localeCompare(b.name);
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

<div class="card max-w-[100em] self-center shadow-md my-4 bg-base-100">
	<div class="card-body">
		<h2 class="card-title">Operadores</h2>
		<div class="grid p-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
			{#each Object.values($sortedOperators || {}) as [id, operator]}
				<a
					class="border-[2px] pointer-cursor rounded-lg hover:bg-base-200 p-1 flex items-start"
					href="/operators/{operator.tag}"
				>
					{#if operator.logo_url}
						<img class="h-12" src={operator.logo_url} alt={operator.name} />
					{/if}
					<span class="text-lg lg:text-xl font-bold p-3">{operator.name}</span>
				</a>
			{/each}
		</div>
	</div>
</div>
