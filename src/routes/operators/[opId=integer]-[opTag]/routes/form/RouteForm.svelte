<script>
	import { token, toast } from '$lib/stores.js';
	import SubrouteForm from './SubrouteForm.svelte';
	import { apiServer } from '$lib/settings.js';
	import { softInvalidateRoutes } from '$lib/db.js';

	export let route;
	export let stops = {};
	export let routeStops = {};
	export let canEdit = false;

	let isSaving = false;

	function handleChange() {
		route._modified =
			route._original.code != route.code ||
			route._original.name != route.name ||
			route._original.circular != route.circular ||
			route._original.active != route.active ||
			// route._original.operator_id != route.operator ||
			// route._original.type_id != route.type_id ||
			route._original.main_subroute != route.main_subroute ||
			route.subroutes.some((sr) => sr._modified === true) ||
			route.subroutes.some((sr) => sr.id < 0);
	}

	async function save() {
		isSaving = true;
		await softInvalidateRoutes();
		for (const subroute of route.subroutes) {
			let successful = true;
			if (subroute.id < 0) successful = await createSubroute(subroute);
			else if (subroute._deleted) successful = await deleteSubroute(subroute);
			else if (subroute._modified) successful = await patchSubroute(subroute);

			if (!successful) {
				isSaving = false;
				return;
			}
		}

		// Trigger this call to check if there are any updates to the route itself
		handleChange();
		if (route._modified) {
			await patchRoute();
		}
		isSaving = false;
	}

	async function patchRoute() {
		let res = await fetch(`${apiServer}/v1/routes/${route.id}`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				authorization: `Bearer ${$token}`
			},
			body: JSON.stringify({
				operator_id: route._original.operator_id,
				type_id: route._original.type_id,
				main_subroute: route._original.main_subroute,
				code: route.code,
				name: route.name,
				circular: route.circular,
				active: route.active
			})
		});
		if (res.ok) {
			toast('Carreira alterada com sucesso', 'success');
			return true;
		} else {
			try {
				let error = await res.text();
				toast(`Erro a atualizar:\n${error}`, 'error');
			} catch (e) {
				toast('Erro a atualizar', 'error');
			}
			return false;
		}
	}

	function deleteRoute() {
		if (confirm(`Quer mesmo apagar a linha ${route.code}?`)) {
			fetch(`${apiServer}/v1/routes/${route.id}`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
					authorization: `Bearer ${$token}`
				}
			})
				.catch((e) => {
					toast(`Erro a apagar a rota`, 'error');
				})
				.then((res) => {
					if (res.ok) {
						routeChanged = false;
						toast(`Rota apagada com sucesso`);
					} else {
						res
							.text()
							.then((error) => {
								toast(`Erro a apagar a rota:\n${error}`, 'error');
							})
							.catch(() => {
								toast(`Erro a apagar a rota`, 'error');
							});
					}
				});
		}
	}

	async function createSubroute(subroute) {
		await fetch(`${apiServer}/v1/routes/${route.id}/create_subroute`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				authorization: `Bearer ${$token}`
			},
			body: JSON.stringify({
				group: subroute.group,
				flag: subroute._original.flag,
				headsign: subroute.headsign,
				origin: subroute.origin,
				destination: subroute.destination,
				via: subroute.via,
				circular: subroute.circular,
				polyline: subroute._original.polyline
			})
		}).then(async (res) => {
			if (res.ok) {
				await res.json().then((data) => {
					subroute._original.id = subroute.id = data.id;
					subroute._original.group = subroute.group = data.group;
					subroute._original.headsign = subroute.headsign = data.headsign;
					subroute._original.origin = subroute.origin = data.origin;
					subroute._original.destination = subroute.destination = data.destination;
					subroute._original.via = subroute.via = data.via;
					subroute._original.circular = subroute.circular = data.circular;
					subroute._updateModified();
				});
			} else {
				res
					.text()
					.then((error) => {
						alert(`Erro a criar variante:\n${error}`);
					})
					.catch(() => {
						alert('Erro a criar variante');
					});
			}
		});
	}

	async function patchSubroute(subroute) {
		await fetch(`${apiServer}/v1/routes/${route.id}/${subroute.id}`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				authorization: `Bearer ${$token}`
			},
			body: JSON.stringify({
				group: subroute.group,
				headsign: subroute.headsign,
				origin: subroute.origin,
				destination: subroute.destination,
				via: subroute.via,
				circular: subroute.circular,
				// TODO drop
				flag: subroute.flag
			})
		}).then((res) => {
			if (res.ok) {
				toast(`Variante ${subroute.id} guardada`, 'success');
				subroute._original.group = subroute.group;
				subroute._original.headsign = subroute.headsign;
				subroute._original.origin = subroute.origin;
				subroute._original.destination = subroute.destination;
				subroute._original.via = subroute.via;
				subroute._original.circular = subroute.circular;
				subroute._updateModified();
			} else {
				res
					.text()
					.then((error) => {
						toast(`Erro a alterar variante:\n${error}`, 'error');
					})
					.catch(() => {
						toast('Erro a alterar variante', 'error');
					});
			}
		});
	}

	async function deleteSubroute(subroute) {
		await fetch(`${apiServer}/v1/routes/${route.id}/${subroute.id}`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				authorization: `Bearer ${$token}`
			}
		})
			.catch((e) => {
				toast('Error deleting', 'error');
				console.log(e);
			})
			.then((res) => {
				if (res.ok) {
				} else {
					if (res.ok) {
						routeChanged = false;
					} else {
						res
							.text()
							.then((error) => {
								toast(`Erro a apagar variante:\n${error}`, 'error');
							})
							.catch(() => {
								toast('Erro a apagar variante', 'error');
							});
					}
				}
			});
		route.subroutes = route.subroutes;
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex gap-1 flex-wrap">
		<div class="form-control">
			<label class="input-group">
				<span>Código</span>
				<input
					type="text"
					bind:value={route.code}
					class="input input-bordered w-24 input-sm"
					disabled={!canEdit}
					on:change={handleChange}
				/>
			</label>
		</div>
		<div class="form-control grow">
			<label class="input-group">
				<span>Nome</span>
				<input
					type="text"
					bind:value={route.name}
					class="input input-bordered grow input-sm"
					disabled={!canEdit}
					on:change={handleChange}
				/>
			</label>
		</div>
		<div class="flex gap-2">
			<div class="form-control">
				<label class="input-group">
					<span>Circular</span>
					<input
						type="checkbox"
						bind:checked={route.circular}
						on:change={handleChange}
						class="checkbox"
						disabled={!canEdit}
					/>
				</label>
			</div>
			<div class="form-control">
				<label class="input-group">
					<span>Ativa</span>
					<input
						type="checkbox"
						bind:checked={route.active}
						on:change={handleChange}
						class="checkbox"
						disabled={!canEdit}
					/>
				</label>
			</div>
		</div>
	</div>
	<SubrouteForm
		{route}
		{stops}
		{routeStops}
		{canEdit}
		on:subroute-change={handleChange}
		on:subroute-delete={handleChange}
	/>
	<div class="flex gap-1 justify-between items-end">
		<button
			class="btn btn-error btn-xs"
			class:hidden={!canEdit || !route.id}
			on:mouseup={deleteRoute}
			>Apagar linha
		</button>
		<span />
		<div class="flex gap-4">
			<!-- <div class="form-control">
				<label class="input-group hidden sm:flex">
					<span>Mostrar GTFS</span>
					<input type="checkbox" class="checkbox" />
				</label>
			</div> -->
			<button
				class="btn btn-primary"
				class:hidden={!canEdit}
				on:mouseup={save}
				disabled={!route._modified}
			>
				Guardar
			</button>
		</div>
	</div>
</div>
