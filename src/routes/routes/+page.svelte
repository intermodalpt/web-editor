<script>
	import { operators } from '$lib/stores.js';
	import { writable, derived } from 'svelte/store';
	import { fetchRoutes, getRoutes, loadMissing } from '$lib/db';
	import { liveQuery } from 'dexie';

	const routes = liveQuery(() => getRoutes());
	const filter = writable('');

	const sortedRoutes = derived([routes, filter], ([$routes, $filter]) => {
		if (!$routes) return [];

		const filterFunc = $filter
			? (r) =>
					r.name.toLowerCase().includes($filter.toLowerCase()) ||
					r.code?.toLowerCase().includes($filter.toLowerCase())
			: () => true;

		return Object.values($routes)
			.filter(filterFunc)
			.sort((ra, rb) => {
				if (!ra.code) {
					return -1;
				} else if (!rb.code) {
					return 1;
				} else {
					return (parseInt(ra.code) || 10000) - (parseInt(rb.code) || 10000);
				}
			});
	});

	async function loadData() {
		await fetchRoutes();
	}

	loadData().then(async () => {
		console.log('data loaded');
		await loadMissing();
	});
</script>

<div class="form-control self-center p-2">
	<div class="join border">
		<input type="text" class="input input-border join-item" bind:value={$filter} />
		<input type="button" class="btn join-item" value="Filtrar"/>
	</div>
</div>

<div class="card card-compact max-w-5xl bg-base-100 shadow-md self-center">
	<div class="card-body">
		<table class="table table-compact table-pin-rows">
			{#each Object.entries(operators) as [operator_id, operator]}
				<thead>
					<tr>
						<th class="text-center" colspan="3">{operator.name}</th>
					</tr>
				</thead>
				<tbody>
					{#each $sortedRoutes as route}
						{#if route.operator == operator_id}
							<tr>
								<th style="color: {route.badge_text}; background-color: {route.badge_bg}">
									{#if route.code}
										{route.code}
									{:else}
										<span class="text-gray-500">N/A</span>
									{/if}
								</th>
								<td>
									<div class="collapse">
										<input type="checkbox" class="peer min-h-0" />
										<div class="collapse-title min-h-0 p-0">
											<div class="btn btn-xs btn-ghost">{route.name}</div>
										</div>
										<div class="collapse-content">
											<div class="flex gap-4">
												<a class="link" href={`/routes/${route.id}/subroutes`}>Subrotas</a>
												<a class="link" href={`/routes/${route.id}/departures`}>Partidas</a>
												<a class="link" href={`/routes/${route.id}/stops`}>Paragens</a>
											</div>
										</div>
									</div>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			{/each}
		</table>
	</div>
</div>
