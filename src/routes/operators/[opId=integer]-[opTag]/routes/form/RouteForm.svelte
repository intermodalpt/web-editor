<script>
	import { createEventDispatcher } from 'svelte';
	import { toast } from '$lib/stores';
	import SubrouteForm from './SubrouteForm.svelte';
	import { softInvalidateRoutes } from '$lib/db.ts';
	import {
		createRoute,
		createSubroute,
		deleteRoute,
		deleteSubroute,
		updateRoute,
		updateSubroute
	} from '$lib/api';

	const dispatch = createEventDispatcher();

	export let route;
	export let stops = {};
	export let routeStops = {};
	export let routeTypes = [];

	export let canEdit = false;

	let isSaving = false;
	let inherit_colors =
		(route.badge_text_color ?? null) == null || (route.badge_bg_color ?? null) == null;
	let badge_text_color = route.badge_text_color ?? '#000000';
	let badge_bg_color = route.badge_bg_color ?? '#ffffff';

	let isValid = false;

	function handleChange() {
		if (inherit_colors) {
			route.badge_text_color = null;
			route.badge_bg_color = null;
		} else {
			route.badge_text_color = badge_text_color;
			route.badge_bg_color = badge_bg_color;
		}
		route._modified =
			route._original.code != route.code ||
			route._original.name != route.name ||
			route._original.circular != route.circular ||
			route._original.active != route.active ||
			// route._original.operator_id != route.operator ||
			// route._original.type_id != route.type_id ||
			route._original.main_subroute != route.main_subroute ||
			route._original.badge_text_color != (inherit_colors ? null : route.badge_text_color) ||
			route._original.badge_bg_color != (inherit_colors ? null : route.badge_bg_color) ||
			route.subroutes.some((sr) => sr._modified === true) ||
			route.subroutes.some((sr) => sr.id < 0);

		isValid = route.code != null && route.name != null && route.type_id != null;
	}

	async function save() {
		isSaving = true;
		const newRoute = route.id == null;

		if (newRoute) {
			const id = await createRoute();
			if (!id) {
				isSaving = false;
				return;
			}
			route.id = id;
			route._original.id = id;
		}
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
		if (route._modified && !newRoute) {
			await patchRoute();
		}
		isSaving = false;

		if (newRoute) {
			dispatch('route-created', {
				id: route.id,
				route: route
			});
		}
	}

	async function createRoute() {
		let res = await fetch(`${apiServer}/v1/routes`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({
				operator_id: route._original.operator_id,
				main_subroute: route._original.main_subroute,
				code: route.code,
				name: route.name,
				type_id: route.type_id,
				circular: route.circular,
				active: route.active,
				badge_text_color: inherit_colors ? null : route.badge_text_color,
				badge_bg_color: inherit_colors ? null : route.badge_bg_color
			})
		});
		if (res.ok) {
			toast('Linha criada com sucesso', 'success');
			return await res.json().then((newRoute) => newRoute.id);
		} else {
			try {
				let error = await res.text();
				toast(`Erro a atualizar:\n${error}`, 'error');
			} catch (e) {
				toast('Erro a atualizar', 'error');
			}
			return;
		}
	}

	async function patchRoute() {
		let res = await fetch(`${apiServer}/v1/routes/${route.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({
				// TODO rename once the API is updated
				// operator_id: route._original.operator_id,
				operator_id: route._original.operator,
				main_subroute: route._original.main_subroute,
				code: route.code,
				name: route.name,
				type_id: route.type_id,
				circular: route.circular,
				active: route.active,
				badge_text_color: inherit_colors ? null : route.badge_text_color,
				badge_bg_color: inherit_colors ? null : route.badge_bg_color
			})
		});
		if (res.ok) {
			toast('Linha alterada com sucesso', 'success');
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
			fetch(`${apiServer}/v1/routes/${route.id}`, { method: 'DELETE', credentials: 'include' })
				.catch((e) => {
					toast(`Erro a apagar a rota`, 'error');
				})
				.then((res) => {
					if (res.ok) {
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

	function deriveFlag(subroute) {
		if (subroute.via.length > 0) {
			const viaStr = subroute.via
				.map((v) => {
					return v.name;
				})
				.join(', ');

			return `${subroute.origin} - ${subroute.destination} via ${viaStr}`;
		}

		return `${subroute.origin} - ${subroute.destination}`;
	}

	async function createSubroute(subroute) {
		return await fetch(`${apiServer}/v1/routes/${route.id}/create_subroute`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({
				group: subroute.group,
				flag: deriveFlag(subroute),
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

				toast(`Variante criada com sucesso`, 'success');
				return true;
			} else {
				res
					.text()
					.then((error) => {
						alert(`Erro a criar variante:\n${error}`);
					})
					.catch(() => {
						alert('Erro a criar variante');
					});

				return false;
			}
		});
	}

	async function patchSubroute(subroute) {
		return await fetch(`${apiServer}/v1/routes/${route.id}/${subroute.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
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

				toast(`Variante ${subroute.id} alterada com sucesso`, 'success');
				return true;
			} else {
				res
					.text()
					.then((error) => {
						toast(`Erro a alterar variante:\n${error}`, 'error');
					})
					.catch(() => {
						toast('Erro a alterar variante', 'error');
					});

				return false;
			}
		});
	}

	async function deleteSubroute(subroute) {
		const success = await fetch(`${apiServer}/v1/routes/${route.id}/${subroute.id}`, {
			method: 'DELETE',
			credentials: 'include'
		})
			.catch((e) => {
				toast('Error deleting', 'error');
				console.error(e);
			})
			.then((res) => {
				if (res.ok) {
					toast(`Variante apagada com sucesso`);
					return true;
				} else {
					res
						.text()
						.then((error) => {
							toast(`Erro a apagar variante:\n${error}`, 'error');
						})
						.catch(() => {
							toast('Erro a apagar variante', 'error');
						});
					return false;
				}
			});

		route.subroutes = route.subroutes;
		return success;
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
					class="input input-bordered w-20 input-sm"
					class:input-error={!route.code || route.code.trim() === ''}
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
					class:input-error={!route.name || route.name.trim() === ''}
					disabled={!canEdit}
					on:change={handleChange}
				/>
			</label>
		</div>
		<div class="form-control">
			<label class="input-group">
				<span>Tipo</span>
				<select
					class="input input-sm input-bordered"
					class:input-error={!route.type_id}
					disabled={!canEdit}
					on:change={handleChange}
					bind:value={route.type_id}
				>
					{#each routeTypes as type}
						<option value={type.id}>{type.name}</option>
					{/each}
				</select>
			</label>
		</div>
		<div class="flex gap-1">
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
			<div class="form-control">
				<label class="input-group">
					<span>Herdar cores</span>
					<input
						type="checkbox"
						bind:checked={inherit_colors}
						on:change={handleChange}
						class="checkbox"
						disabled={!canEdit}
					/>
				</label>
			</div>
		</div>

		<div class="form-control" class:hidden={inherit_colors}>
			<label class="input-group">
				<span>Primária</span>
				<input
					type="color"
					bind:value={badge_text_color}
					on:change={handleChange}
					class="input input-bordered input-xs"
					disabled={!canEdit}
				/>
			</label>
		</div>
		<div class="form-control" class:hidden={inherit_colors}>
			<label class="input-group">
				<span>Fundo</span>
				<input
					type="color"
					bind:value={badge_bg_color}
					on:change={handleChange}
					class="input input-bordered input-xs"
					disabled={!canEdit}
				/>
			</label>
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
				disabled={!route._modified || !isValid || isSaving}
			>
				Guardar
			</button>
		</div>
	</div>
</div>
