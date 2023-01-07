<script>
	import { invalidate } from '$app/navigation';
	import { api_server } from '$lib/settings.js';
	import { token, operators } from '$lib/stores.js';
	import { decodedToken } from '$lib/stores.js';

	/** @type {import('./$types').PageData} */
	export let data;

	let route = data.route;
	let routeChanged = false;
	let mainSubrouteIndex = route.subroutes.findIndex(
		(subroute) => subroute.id === route.main_subroute
	);

	function addSubroute() {
		route.subroutes.push({
			id: undefined,
			flag: '',
			circular: false,
			changed: true
		});
		route.subroutes = route.subroutes;
	}

	function saveRoute() {
		let savedCount = 0;
		for (const subroute of route.subroutes) {
			if (!subroute.changed && subroute.id) {
				continue;
			}
			if (subroute.id) {
				fetch(`${api_server}/v1/routes/${route.id}/${subroute.id}`, {
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
						authorization: `Bearer ${$token}`
					},
					body: JSON.stringify({
						flag: subroute.flag,
						circular: subroute.circular || false,
						polyline: subroute.polyline || null
					})
				})
					.catch((e) => {
						alert(`Error patching a route: ${JSON.stringify(subroute)}`);
					})
					.then((res) => {
						switch (res.status) {
							case 200:
								subroute.changed = false;
								savedCount += 1;
								break;
							default:
								alert('One request might have succeeded, or not');
						}
					});
			} else {
				fetch(`${api_server}/v1/routes/${route.id}/create_subroute`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						authorization: `Bearer ${$token}`
					},
					body: JSON.stringify({
						flag: subroute.flag,
						circular: subroute.circular,
						polyline: null
					})
				})
					.catch((e) => {
						alert(`Error creating a route: ${JSON.stringify(subroute)}`);
					})
					.then((res) => {
						switch (res.status) {
							case 200:
								subroute.changed = false;
								savedCount += 1;
								res.json().then((data) => {
									subroute.id = data.id;
								});
								break;
							default:
								alert('One request might have succeeded, or not');
						}
					});
			}
		}

		if (savedCount > 0) {
			console.log(`Saved ${savedCount} changes`);
		}

		if (routeChanged) {
			fetch(`${api_server}/v1/routes/${route.id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					authorization: `Bearer ${$token}`
				},
				body: JSON.stringify({
					code: route.code,
					name: route.name,
					// circular: route.circular,
					main_subroute: route.subroutes[mainSubrouteIndex]?.id,
					operator_id: route.operator,
					type_id: route.type_id,
					active: route.active,
					// FIXME
					badge_text: 'fa3250',
					badge_bg: '000000'
				})
			})
				.catch((e) => {
					alert('Error patching the route');
				})
				.then((res) => {
					switch (res.status) {
						case 200:
							alert('Route saved');
							routeChanged = false;
							break;
						default:
							alert('One request did not succeed');
					}
				});
		}
		invalidate('app:subroutes');
	}

	function delSubroute(index) {
		if (route.subroutes[index].id === undefined) {
			route.subroutes.splice(index, 1);
		} else if (
			confirm(
				`Do you really really want to delete ${route.subroutes[index].flag} (${route.subroutes[index].id})? This will fail if it has stops or departures.`
			)
		) {
			fetch(`${api_server}/v1/routes/${route.id}/${route.subroutes[index].id}`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
					authorization: `Bearer ${$token}`
				}
			})
				.catch((e) => {
					alert('Error deleting');
					console.log(e);
				})
				.then((res) => {
					if (res.ok) {
						invalidate('app:subroutes');
					} else if (res.status === 424) {
						alert('You need to delete the stops before you delete the subroute');
					} else {
						alert('There was an error deleting the subroute');
						invalidate('app:subroutes');
					}
				});
		}
		route.subroutes = route.subroutes;
	}

	function delRoute() {
		if (
			confirm(
				`Do you really really want to delete ${route.code}? This will fail if it has subroutes.`
			)
		) {
			fetch(`${api_server}/v1/routes/${route.id}`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
					authorization: `Bearer ${$token}`
				}
			})
				.catch((e) => {
					alert('Error deleting');
					console.log(e);
				})
				.then((res) => {
					switch (res.status) {
						case 424:
							alert('You need to delete the subroutes before you delete the route');
							break;
						// case 200:
						default:
							invalidate('app:subroutes');
					}
				});
		}
	}
</script>

<div class="card self-center bg-base-100 shadow-md w-full max-w-[900px]">
	<div class="card-body">
		<h2 class="card-title">Detalhes de {route.name}</h2>
		<div>
			<div class="flex flex-col gap-1 p-2 overflow-visible w-full">
				<div class="form-control">
					<label class="input-group">
						<span class="w-28">Operador</span>
						<input type="text" disabled class="input" value={operators[route.operator].name} />
					</label>
				</div>
				<div class="form-control">
					<label class="input-group">
						<span class="w-28">Código</span>
						<input
							type="text"
							bind:value={route.code}
							on:change={() => (routeChanged = true)}
							class="input input-bordered w-24 input-md"
							disabled={!$decodedToken?.permissions.is_admin} 
						/>
					</label>
				</div>
				<div class="form-control w-full">
					<label class="input-group">
						<span class="w-32">Nome</span>
						<input
							type="text"
							bind:value={route.name}
							on:change={() => (routeChanged = true)}
							class="input input-bordered w-full input-md"
							disabled={!$decodedToken?.permissions.is_admin} 
						/>
					</label>
				</div>
				<div class="flex gap-2">
					<!-- <div class="form-control">
						<label class="input-group">
							<span>Circular</span>
							<input
								type="checkbox"
								bind:checked={route.circular}
								on:change={() => (routeChanged = true)}
								class="checkbox checkbox-info "
							/>
						</label>
					</div> -->
					<div class="form-control">
						<label class="input-group">
							<span>Activa</span>
							<input
								type="checkbox"
								bind:checked={route.active}
								on:change={() => (routeChanged = true)}
								class="checkbox checkbox-info"
								disabled={!$decodedToken?.permissions.is_admin} 
							/>
						</label>
					</div>
				</div>
			</div>
		</div>
		<table class="table table-zebra table-compact w-full  mb-4">
			<thead>
				<tr>
					<th>Principal</th>
					<th class="w-full">Bandeira</th>
					<th class="w-full">Circular</th>
					<th>
						<input
							type="button"
							class="btn btn-success btn-xs"
							value="+"
							on:mouseup={addSubroute}
							disabled={!$decodedToken?.permissions.is_admin} 
						/>
					</th>
				</tr>
			</thead>
			<tbody>
				{#each route.subroutes as subroute, index}
					<tr>
						<td>
							<input
								type="radio"
								bind:group={mainSubrouteIndex}
								on:change={() => (routeChanged = true)}
								name="main-route"
								value={index}
								disabled={!$decodedToken?.permissions.is_admin} 
							/>
						</td>
						<td>
							<input
								class="input input-bordered w-full"
								type="text"
								bind:value={subroute.flag}
								on:change={() => (subroute.changed = true)}
								disabled={!$decodedToken?.permissions.is_admin} 
							/>
						</td>
						<td>
							<input
								class="input input-bordered"
								type="checkbox"
								bind:checked={subroute.circular}
								on:change={() => (subroute.changed = true)}
								disabled={!$decodedToken?.permissions.is_admin} 
							/>
						</td>
						<td>
							<input
								type="button"
								class="btn btn-error btn-xs"
								value="-"
								on:mouseup={() => {
									delSubroute(index);
								}}
								 disabled={!$decodedToken?.permissions.is_admin} 
							/>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<div class="flex gap-2 justify-end">
			<button class="btn btn-error" on:mouseup={delRoute} disabled={route.subroutes.length !== 0}>
				Apagar linha
			</button>
			<button
				class="btn btn-primary"
				on:mouseup={saveRoute}
				disabled={!routeChanged &&
					route.subroutes.findIndex((sr) => {
						return sr.changed;
					}) === -1}
			>
				Guardar
			</button>
		</div>
	</div>
</div>
