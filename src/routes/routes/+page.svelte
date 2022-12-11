<script>
	import { operators } from '$lib/stores.js';

	/** @type {import('./$types').PageData} */
	export let data;

	const routes = data.routes;
	let filter = null;
</script>

<div class="form-control self-end">
	<div class="input-group">
		<span>Filtro:</span>
		<input type="text" class="input input-border" bind:value={filter} />
	</div>
</div>

<div class="card card-compact max-w-5xl bg-base-100 shadow-md self-center">
	<div class="card-body overflow-x">
		<table class="table table-compact">
			{#each Object.entries(operators) as [operator_id, operator]}
				<thead>
					<tr>
						<th class="text-center" colspan="3">{operator.name}</th>
					</tr>
					<tr>
						<th>Código</th>
						<th>Nome</th>
					</tr>
				</thead>
				<tbody>
					{#each routes as route}
						{#if route.operator == operator_id && (!filter || route.name
									.toLowerCase()
									.includes(filter?.toLowerCase()) || route.code
									?.toLowerCase()
									.includes(filter?.toLowerCase()))}
							<tr>
								<th style="color: {route.badge_text}; background-color: {route.badge_bg}">
									{route.code}
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
