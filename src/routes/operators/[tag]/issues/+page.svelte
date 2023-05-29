<script>
	import { operators } from '$lib/stores.js';
	import { fetchStops, fetchRoutes, getStops, getRoutes, loadMissing } from '$lib/db';
	import { liveQuery } from 'dexie';

	/** @type {import('./$types').PageData} */
	export let data;
	const currOperator = data.operator;
	const issues = data.issues;

	const stops = liveQuery(() => getStops());
	const routes = liveQuery(() => getRoutes());

	async function loadData() {
		await Promise.all([fetchStops(), fetchRoutes()]);
	}

	loadData().then(async () => {
		console.log('data loaded');
		await loadMissing();
	});
</script>

<svelte:head>
	<title>Problemas em {currOperator.name}</title>
	<meta name="description" content="Problemas em {currOperator.name}" />
</svelte:head>

<div class="grid p-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
	{#each issues as issue}
		<div class="card card-compact self-center bg-base-100 shadow-md">
			<div class="card-body">
				<div class="flex gap-1">
					<span>Afecto a</span>
					<div class="flex">
						{#each issue.operator_ids as id}
							<span class="badge badge-secondary">{operators[id].name}</span>
						{/each}
					</div>
				</div>
				<h2 class="card-title">
					<a href="/operators/{currOperator.tag}/issues/{issue.id}">{issue.title}</a>
				</h2>
				<div class="flex gap-2">
					<span>Linhas</span>
					{#if $routes}
						{#each issue.route_ids as id}
							<div class="flex">
								<span
									class="rounded-l-full px-1 font-bold"
									style="color: {$routes[id].badge_text}; background-color: {$routes[id].badge_bg}"
								>
									{$routes[id].code}
								</span>
								<span class="badge rounded-r-full badge-outline">{$routes[id].name}</span>
							</div>
						{/each}
					{:else}
						<span>Linhas a carregar...</span>
					{/if}
				</div>
				<div class="flex gap-2">
					<span>Stops</span>
					{#if $stops}
						{#each issue.stop_ids as id}
							<span class="badge badge-outline">{id} - {$stops[id].name}</span>
						{/each}
					{:else}
						<span>Stops a carregar...</span>
					{/if}
				</div>
			</div>
		</div>
	{/each}
</div>
