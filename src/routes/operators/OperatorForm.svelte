<script>
	import { createEventDispatcher } from 'svelte';
	import { derived } from 'svelte/store';
	import { liveQuery } from 'dexie';
	import { getRegions, wipeRegionCachedData } from '$lib/db';
	import { token, decodedToken, toast } from '$lib/stores.js';
	import { apiServer } from '$lib/settings.js';
	import { isDeepEqual, deepCopy } from '$lib/utils.js';
	import RouteTypeForm from './RouteTypeForm.svelte';

	const regions = liveQuery(() => getRegions());
	const sortedRegions = derived(regions, ($regions) => {
		if (!$regions) {
			return [];
		}
		return Object.values($regions).sort((a, b) => a.name.localeCompare(b.name));
	});

	const dispatch = createEventDispatcher();

	const canEdit = $decodedToken?.permissions.is_admin;

	export let operator;
	export let routeTypes = [];

	let id = operator?.id;
	let originalName = operator?.name;
	let originalTag = operator?.tag;
	let originalDescription = operator?.description;
	let originalRegions = operator?.regions || [];
	let originalRouteTypes = routeTypes ? deepCopy(routeTypes) : [];

	let name = originalName;
	let tag = originalTag;
	let description = originalDescription;
	let operatorRegions = originalRegions ? deepCopy(originalRegions) : [];
	let logoFiles;

	let tmpRouteTypeId = -1;
	const emptyRouteType = {
		id: tmpRouteTypeId,
		name: null,
		zapping_cost: 0,
		board_cost: 0,
		multi_trip: false,
		badge_text_color: '#ffffff',
		badge_bg_color: '#000000'
	};
	if (routeTypes.length == 0) {
		addRouteType();
	}

	let operatorRegionsLoaded = id != undefined;

	$: dataChanged = originalName != name || originalTag != tag || originalDescription != description;

	$: regionsChanged =
		operatorRegionsLoaded && !isDeepEqual(originalRegions || {}, operatorRegions || {});

	$: routeTypesChanged = !isDeepEqual(originalRouteTypes, routeTypes);

	$: changed = dataChanged || regionsChanged || logoFiles || routeTypesChanged;

	$: invalidName = !name || name.trim().length < 3;
	$: invalidTag = !tag || tag.length < 2 || tag.includes(' ');
	$: invalidDescription = description != null && description.length < 3;
	$: invalidOperatorRegions = operatorRegions && operatorRegions.length < 1;
	$: invalidRouteTypes = routeTypes.some(
		(routeType) =>
			(!routeType.zapping_cost && routeType.zapping_cost !== 0) ||
			(!routeType.board_cost && routeType.board_cost !== 0) ||
			(!routeType.multi_trip && routeType.multi_trip !== false) ||
			!routeType.badge_text_color ||
			!routeType.badge_bg_color
	);
	$: invalidData =
		invalidName || invalidTag || invalidDescription || invalidOperatorRegions || invalidRouteTypes;

	function addRouteType() {
		const newRouteType = deepCopy(emptyRouteType);
		newRouteType.id = tmpRouteTypeId--;
		routeTypes.push(newRouteType);
		routeTypes = routeTypes;
	}

	async function saveOperator() {
		let data = {
			name: name,
			tag: tag,
			description: description?.trim() || null
		};

		const newRegions = operatorRegions.filter((region) => !originalRegions.includes(region));
		const removedRegions = originalRegions.filter((region) => !operatorRegions.includes(region));

		let updateRegions = async () => {
			for (let region of newRegions) {
				fetch(`${apiServer}/v1/regions/${region}/operators/${id}`, {
					method: 'PUT',
					headers: {
						authorization: `Bearer ${$token}`
					}
				}).then((res) => {
					if (res.ok) {
						toast(`Região ${region} adicionada ao operador ${originalTag}`, 'success');
					} else {
						res
							.text()
							.then((error) => {
								alert(`Erro a adicionar região ao operador:\n${error}`);
							})
							.catch(() => {
								alert('Erro a adicionar região ao operador');
							});
					}
				});
			}
			for (let region of removedRegions) {
				fetch(`${apiServer}/v1/regions/${region}/operators/${id}`, {
					method: 'DELETE',
					headers: {
						authorization: `Bearer ${$token}`
					}
				}).then((res) => {
					if (res.ok) {
						toast(`Região ${region} removida do operador ${originalTag}`, 'success');
					} else {
						res
							.text()
							.then((error) => {
								alert(`Erro a remover região do operador:\n${error}`);
							})
							.catch(() => {
								alert('Erro a remover região do operador');
							});
					}
				});
			}
			originalRegions = deepCopy(operatorRegions);
		};

		let uploadLogo = async () => {
			if (!logoFiles || logoFiles.length == 0) {
				return;
			}
			let formData = new FormData();
			formData.append('logo', logoFiles[0]);
			let res = await fetch(`${apiServer}/v1/operators/${id}/logo`, {
				method: 'POST',
				headers: {
					authorization: `Bearer ${$token}`
				},
				body: formData
			});

			if (res.ok) {
				toast(`Logotipo do operador ${originalTag} alterado com sucesso`, 'success');
				logoFiles = null;
			} else {
				res
					.text()
					.then((error) => {
						alert(`Erro a alterar logotipo do operador:\n${error}`);
					})
					.catch(() => {
						alert('Erro a alterar logotipo do operador');
					});
			}
		};

		let updateRouteTypes = async () => {
			const deletedRouteTypes = originalRouteTypes.filter(
				(originalRouteType) => !routeTypes.some((routeType) => routeType.id == originalRouteType.id)
			);

			for (const rt of deletedRouteTypes) {
				let res = await fetch(`${apiServer}/v1/operators/${id}/routes/types/${rt.id}`, {
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${$token}`
					}
				});

				if (res.ok) {
					toast(`Tipo de rota ${rt.id} (${rt.name}) apagada`, 'success');
					originalRouteTypes = originalRouteTypes.filter((rt) => rt.id != rt.id);
				} else {
					res
						.text()
						.then((error) => {
							alert(`Erro a apagar tipo de rota:\n${error}`);
						})
						.catch(() => {
							alert('Erro a apagar tipo de rota');
						});
				}
			}

			for (const rt of routeTypes) {
				const body = {
					name: rt.name || '',
					zapping_cost: rt.zapping_cost,
					board_cost: rt.board_cost,
					multi_trip: rt.multi_trip,
					badge_text_color: rt.badge_text_color,
					badge_bg_color: rt.badge_bg_color
				};

				if (body.name.trim() == '') {
					body.name = null;
				}

				if (rt.id < 0) {
					let res = await fetch(`${apiServer}/v1/operators/${id}/routes/types`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${$token}`
						},
						body: JSON.stringify(body)
					});

					if (res.ok) {
						toast(`Tipo de rota ${rt.id} (${rt.name}) criado com sucesso`, 'success');
						let id = await res.json();
						rt.id = id;
						originalRouteTypes.push(deepCopy(rt));
					} else {
						res
							.text()
							.then((error) => {
								alert(`Erro a criar tipo de rota:\n${error}`);
							})
							.catch(() => {
								alert('Erro a criar tipo de rota');
							});
					}
				} else {
					let res = await fetch(`${apiServer}/v1/operators/${id}/routes/types/${rt.id}`, {
						method: 'PATCH',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${$token}`
						},
						body: JSON.stringify(body)
					});

					if (res.ok) {
						toast(`Tipo de rota ${rt.id} (${rt.name}) alterado com sucesso`, 'success');
						originalRouteTypes = originalRouteTypes.map((ort) =>
							ort.id == rt.id ? deepCopy(rt) : ort
						);
					} else {
						res
							.text()
							.then((error) => {
								alert(`Erro a alterar tipo de rota:\n${error}`);
							})
							.catch(() => {
								alert('Erro a alterar tipo de rota');
							});
					}
				}
			}
		};

		if (id && !dataChanged) {
			await Promise.all([updateRegions(), uploadLogo(), updateRouteTypes()]);
		} else if (id) {
			const [dataRes] = await Promise.all([
				fetch(`${apiServer}/v1/operators/${id}`, {
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
						authorization: `Bearer ${$token}`
					},
					body: JSON.stringify(data)
				}),
				updateRegions(),
				uploadLogo()
			]);
			if (dataRes.ok) {
				originalName = name;
				originalTag = tag;
				originalDescription = description?.trim() || null;
				toast(`Operador ${operator.tag} alterado com sucesso`, 'success');
			} else {
				dataRes
					.text()
					.then((error) => {
						alert(`Erro a alterar operador:\n${error}`);
					})
					.catch(() => {
						alert('Erro a alterar operador');
					});
			}
		} else {
			let res = await fetch(`${apiServer}/v1/operators`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					authorization: `Bearer ${$token}`
				},
				body: JSON.stringify(data)
			});

			if (res.ok) {
				id = await res.json().then((data) => data.id);

				originalName = name;
				originalTag = tag;
				originalDescription = description?.trim() || null;
				toast(`Operador ${originalTag} alterado com sucesso`, 'success');
			} else {
				res
					.text()
					.then((error) => {
						alert(`Erro a criar operador:\n${error}`);
					})
					.catch(() => {
						alert('Erro a criar operador');
					});
				return;
			}

			await Promise.all([updateRegions(), uploadLogo(), updateRouteTypes()]);
		}

		await wipeRegionCachedData();
	}
</script>

<div class="flex flex-col gap-1 p-2 overflow-visible w-full">
	<div class="flex gap-4">
		<div class="form-control">
			<label class="input-group">
				<span class="w-28">Etiqueta</span>
				<input
					type="text"
					bind:value={tag}
					class="input input-bordered w-24 input-md"
					class:input-error={invalidTag}
					disabled={!canEdit}
				/>
			</label>
		</div>
		<div class="form-control w-full">
			<label class="input-group">
				<span class="w-32">Nome</span>
				<input
					type="text"
					bind:value={name}
					class="input input-bordered w-full input-md"
					class:input-error={invalidName}
					disabled={!canEdit}
				/>
			</label>
		</div>
	</div>
	<label class="form-control w-full">
		<div class="label">
			<span class="label-text">Regiões</span>
		</div>
		<select class="select select-bordered" multiple bind:value={operatorRegions} cl>
			{#each $sortedRegions as region}
				<option value={region.id}>{region.name}</option>
			{/each}
		</select>
	</label>
	<label class="form-control w-full max-w-xs">
		<div class="label">
			<span class="label-text">Logotipo</span>
		</div>
		<input
			bind:files={logoFiles}
			type="file"
			class="file-input file-input-bordered w-full max-w-xs"
			accept=".svg,.png,.jpg,.webp"
		/>
	</label>
	<label class="form-control w-full">
		<div class="label">
			<span class="label-text">Descrição</span>
		</div>
		<textarea class="textarea textarea-bordered" bind:value={description} />
	</label>
</div>

<div class="label">
	<span class="label-text">Tipos de rota</span>
	<button class="btn btn-xs btn-success" on:click={addRouteType}>+</button>
</div>
<div class="flex flex-col gap-2">
	{#each routeTypes as rt (rt.id)}
		<div class="border-2 rounded-lg p-2"
			class:bg-green-50={rt.id < 0}>
			<RouteTypeForm
				bind:id={rt.id}
				bind:name={rt.name}
				bind:zapping_cost={rt.zapping_cost}
				bind:board_cost={rt.board_cost}
				bind:multi_trip={rt.multi_trip}
				bind:badge_text_color={rt.badge_text_color}
				bind:badge_bg_color={rt.badge_bg_color}
				on:change={() => (routeTypes = routeTypes)}
				on:delete={() => {
					routeTypes = routeTypes.filter((rt) => rt.id != rt.id);
					routeTypes = routeTypes;
				}}
				{canEdit}
			/>
		</div>
	{/each}
</div>

<div class="flex justify-end" class:hidden={!canEdit}>
	<input
		type="submit"
		value="Guardar"
		class="btn btn-primary"
		disabled={!changed || invalidData}
		on:click={saveOperator}
	/>
</div>
