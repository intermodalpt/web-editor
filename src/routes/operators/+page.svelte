<script>
	import { operators } from '$lib/stores.js';
	import { loadMissing } from '$lib/db';

	setTimeout(async () => {
		await loadMissing();
	}, 100);
</script>

<svelte:head>
	<title>Editor Intermodal - Operadores</title>
	<meta name="description" content="Editor Intermodal - Operadores" />
</svelte:head>

<div class="card max-w-[100em] self-center shadow-md my-4 bg-base-100">
	<div class="card-body">
		<h2 class="card-title">Operadores</h2>
		<div class="grid p-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
			{#each Object.entries(operators).sort(([, a], [, b]) => {
				return a.name.localeCompare(b.name);
			}) as [id, operator]}
				<a
					class="border-[2px] pointer-cursor rounded-lg hover:bg-base-200 p-1 flex items-start"
					href="/operators/{operator.tag}"
				>
					<span class="text-xs font-light">#{id}</span>
					<span class="text-lg lg:text-xl font-bold p-3">{operator.name}</span>
				</a>
			{/each}
		</div>
	</div>
</div>
