<script>
	import { liveQuery } from 'dexie';
	import {
		fetchOperators,
		getOperators,
		fetchStops,
		fetchRoutes,
		getStops,
		getRoutes,
		loadMissing
	} from '$lib/db';
	import { decodedToken } from '$lib/stores';

	/** @type {import('./$types').PageData} */
	export let data;
	const operator = data.operator;
	const issues = data.issues;

	const stops = liveQuery(() => getStops());
	const routes = liveQuery(() => getRoutes());
	const operators = liveQuery(() => getOperators());

	async function loadData() {
		await Promise.all([fetchStops(), fetchRoutes(), fetchOperators()]);
	}

	loadData().then(async () => {
		console.log('data loaded');
		await loadMissing();
	});
</script>

<svelte:head>
	<title>Problemas em {operator.name}</title>
	<meta name="description" content="Problemas em {operator.name}" />
</svelte:head>

<div class="flex flex-col gap-4 max-w-[100em] w-full sm:px-4 self-center my-4">
	<div class="flex flex-wrap justify-between">
		<div class="breadcrumbs">
			<ul>
				<li><a class="link" href="/operators">Operadores</a></li>
				<li><a class="link" href="/operators/{operator.id}-{operator.tag}">{operator.name}</a></li>
				<li><a class="link" href="/operators/{operator.id}-{operator.tag}/issues">Problemas</a></li>
			</ul>
		</div>
		<a
			class="btn btn-primary btn-sm"
			class:hidden={!$decodedToken?.permissions?.is_admin}
			href="/issues/new"
		>
			Adicionar problema
		</a>
	</div>

	<div class="rounded-md p-4 bg-base-100 shadow-sm">
		{#if issues.length === 0}
			<p>Não existem problemas registados neste operador.</p>
		{/if}

		<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
			{#each issues as issue}
				<div class="card card-compact">
					<div class="card-body">
						<div class="flex gap-1">
							<span>Afecto a</span>
							<div class="flex">
								{#each issue.operator_ids as id}
									<span class="badge badge-secondary">{$operators[id]?.name}</span>
								{/each}
							</div>
						</div>
						<h2 class="card-title">
							<a href="/operators/{operator.id}-{operator.tag}/issues/{issue.id}">{issue.title}</a>
						</h2>
						<div class="flex gap-2">
							<span>Linhas</span>
							{#if $routes}
								{#each issue.route_ids as id}
									<div class="flex">
										<span
											class="rounded-l-full px-1 font-bold"
											style="color: {$routes[id].badge_text}; background-color: {$routes[id]
												.badge_bg}"
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
	</div>
</div>
