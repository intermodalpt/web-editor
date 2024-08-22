<script>
	import { createEventDispatcher } from 'svelte';
	import { toast } from '$lib/stores';
	import SubrouteForm from './SubrouteForm.svelte';
	import { softInvalidateRoutes } from '$lib/db';
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
			route.subroutes.some((sr) => sr._modified) ||
			route.subroutes.some((sr) => sr._deleted) ||
			route.subroutes.some((sr) => sr.id < 0);

		isValid = route.code != null && route.name != null && route.type_id != null;
	}

	async function handleSave() {
		isSaving = true;
		const newRoute = route.id == null;

		if (newRoute) {
			const data = {
				operator_id: route._original.operator_id,
				main_subroute: route._original.main_subroute,
				code: route.code,
				name: route.name,
				type_id: route.type_id,
				circular: route.circular,
				active: route.active,
				badge_text_color: inherit_colors ? null : route.badge_text_color,
				badge_bg_color: inherit_colors ? null : route.badge_bg_color
			};

			await createRoute(data, {
				onSuccess: async (res) => {
					toast('Linha criada', 'success');
					const id = (await res.json()).id;
					route.id = id;
					route._original.id = id;

					dispatch('route-created', {
						id: route.id,
						route: route
					});
				},
				onError: (res) => {
					toast(`Erro a atualizar:\n${error}`, 'error');
					isSaving = false;
				}
			});

			if (!id) {
				isSaving = false;
				return;
			}
		} else if (route._modified) {
			const data = {
				operator_id: route._original.operator_id,
				main_subroute: route._original.main_subroute,
				code: route.code,
				name: route.name,
				type_id: route.type_id,
				circular: route.circular,
				active: route.active,
				badge_text_color: inherit_colors ? null : route.badge_text_color,
				badge_bg_color: inherit_colors ? null : route.badge_bg_color
			};
			await updateRoute(route.id, data, {
				onSuccess: (res) => {
					toast('Linha alterada', 'success');
				},
				onError: (res) => {
					toast(`Erro a atualizar`, 'error');
				}
			});
		}
		await softInvalidateRoutes();

		for (const subroute of route.subroutes) {
			let hadError = false;

			if (subroute.id < 0) {
				const data = {
					group: subroute.group,
					flag: deriveFlag(subroute),
					headsign: subroute.headsign,
					origin: subroute.origin,
					destination: subroute.destination,
					via: subroute.via,
					circular: subroute.circular,
					// TODO get rid of this
					polyline: subroute._original.polyline
				};

				await createSubroute(route.id, data, {
					onSuccess: (res) => {
						const data = res.json();
						subroute._original.id = subroute.id = data.id;
						subroute._original.group = subroute.group = data.group;
						subroute._original.headsign = subroute.headsign = data.headsign;
						subroute._original.origin = subroute.origin = data.origin;
						subroute._original.destination = subroute.destination = data.destination;
						subroute._original.via = subroute.via = data.via;
						subroute._original.circular = subroute.circular = data.circular;
						subroute._updateModified();
						toast('Variante criada', 'success');
					},
					onError: (res) => {
						toast(`Erro a criar variante`, 'error');
						hadError = true;
					}
				});
			} else if (subroute._deleted) {
				await deleteSubroute(subroute.id, {
					onSuccess: (res) => {
						toast('Variante apagada', 'success');
						route.subroutes = route.subroutes;
					},
					onError: (res) => {
						toast(`Erro a apagar variante`, 'error');
						hadError = true;
					}
				});
			} else if (subroute._modified) {
				const data = {
					group: subroute.group,
					headsign: subroute.headsign,
					origin: subroute.origin,
					destination: subroute.destination,
					via: subroute.via,
					circular: subroute.circular,
					// TODO drop
					flag: subroute.flag
				};

				await updateSubroute(subroute.id, data, {
					onSuccess: (res) => {
						toast('Variante alterada', 'success');
					},
					onError: (res) => {
						toast(`Erro a alterar variante`, 'error');
						hadError = true;
					}
				});
			}

			if (hadError) {
				isSaving = false;
				return;
			}
		}

		// Trigger this call to check if there are any updates to the route itself
		handleChange();
		isSaving = false;
	}

	async function handleCreateRoute() {
		const data = {
			operator_id: route._original.operator_id,
			main_subroute: route._original.main_subroute,
			code: route.code,
			name: route.name,
			type_id: route.type_id,
			circular: route.circular,
			active: route.active,
			badge_text_color: inherit_colors ? null : route.badge_text_color,
			badge_bg_color: inherit_colors ? null : route.badge_bg_color
		};

		let newId;

		await createRoute(data, {
			onSuccess: (res) => {
				toast('Linha criada', 'success');
				const json = res.json();
				newId = json.id;
			},
			onError: (res) => {
				toast(`Erro a atualizar:\n${error}`, 'error');
				return;
			}
		});

		return newId;
	}

	async function handleDeleteRoute() {
		if (!confirm(`Quer mesmo apagar a linha ${route.code}?`)) return;

		await deleteRoute(route.id, {
			onSuccess: (res) => {
				toast('Linha apagada', 'success');
			},
			onError: (res) => {
				toast(`Erro a apagar linha`, 'error');
			}
		});
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
			on:click={handleDeleteRoute}
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
				on:click={handleSave}
				disabled={!route._modified || !isValid || isSaving}
			>
				Guardar
			</button>
		</div>
	</div>
</div>
