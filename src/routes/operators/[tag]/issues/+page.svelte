<script>
	import { operators } from '$lib/stores.js';
	
	/** @type {import('./$types').PageData} */
	export let data;
	const operator = data.operator;
	const issues = data.issues;
	const stops = data.stops;
	const routes = data.routes;
</script>

<svelte:head>
	<title>Problemas em {operator.name}</title>
	<meta name="description" content="Problemas em {operator.name}" />
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
				<h2 class="card-title"><a href="/operators/{operator.tag}/issues/{issue.id}">{issue.title}</a></h2>
				<div class="flex gap-2">
					<span>Linhas</span>
					{#each issue.route_ids as id}
						<div class="flex">
							<span
								class="rounded-l-full px-1 font-bold"
								style="color: {routes[id].badge_text}; background-color: {routes[id].badge_bg}"
							>
								{routes[id].code}
							</span>
							<span class="badge rounded-r-full badge-outline">{routes[id].name}</span>
						</div>
					{/each}
				</div>
				<div class="flex gap-2">
					<span>Stops</span>
					{#each issue.stop_ids as id}
						<span class="badge badge-outline">{id} - {stops[id].name}</span>
					{/each}
				</div>
			</div>
		</div>
	{/each}
</div>
