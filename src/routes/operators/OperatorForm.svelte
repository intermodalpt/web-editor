<script>
	import { createEventDispatcher } from 'svelte';
	import { derived } from 'svelte/store';
	import { onMount } from 'svelte';
	import { liveQuery } from 'dexie';
	import { getRegions, wipeOperators } from '$lib/db';
	import { token, decodedToken, toast } from '$lib/stores.js';
	import { apiServer } from '$lib/settings.js';
	import { isDeepEqual, deepCopy } from '$lib/utils.js';
	import RouteTypeForm from './RouteTypeForm.svelte';
	import { isValidUri } from '$lib/utils.js';

	const regions = liveQuery(() => getRegions());
	const sortedRegions = derived(regions, ($regions) => {
		if (!$regions) {
			return [];
		}
		return Object.values($regions).sort((a, b) => a.name.localeCompare(b.name));
	});

	const dispatch = createEventDispatcher();

	const canEdit = $decodedToken?.permissions.is_admin;

	export let id = null;

	export let routeTypes = [];

	let originalName,
		originalTag,
		originalDescription,
		originalIsComplete,
		originalWebsiteUrl,
		originalLibraryUrl,
		originalForumUrl,
		originalContactUris,
		originalRegions = [],
		originalRouteTypes = deepCopy(routeTypes);

	let name,
		tag,
		description,
		isComplete,
		websiteUrl,
		libraryUrl,
		forumUrl,
		contactUris,
		operatorRegions;

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

	let operatorRegionsLoaded = id != undefined;

	$: dataChanged =
		originalName != name ||
		originalTag != tag ||
		originalDescription != description ||
		originalWebsiteUrl != websiteUrl ||
		originalLibraryUrl != libraryUrl ||
		originalForumUrl != forumUrl ||
		originalContactUris != contactUris ||
		!isDeepEqual(originalRegions || [], operatorRegions || []) ||
		logoFiles ||
		!isDeepEqual(originalRouteTypes, routeTypes);

	$: regionsChanged =
		operatorRegionsLoaded && !isDeepEqual(originalRegions || {}, operatorRegions || {});

	$: routeTypesChanged = !isDeepEqual(originalRouteTypes, routeTypes);

	$: changed = dataChanged || regionsChanged || logoFiles || routeTypesChanged;

	$: invalidName = !name || name.trim().length < 3;
	$: invalidTag = !tag || tag.length < 2 || tag.includes(' ');
	$: invalidDescription = description != null && description != '' && description.trim().length < 3;
	$: invalidSite = websiteUrl && websiteUrl.trim() != '' && !isValidUri(websiteUrl);
	$: invalidLibrary = libraryUrl && libraryUrl.trim() != '' && !isValidUri(libraryUrl);
	$: invalidForum = forumUrl && forumUrl.trim() != '' && !isValidUri(forumUrl);
	$: invalidContactUris = contactUris
		?.split(';')
		.map((uri) => uri.trim())
		.filter((uri) => uri)
		.find((uri) => !isValidUri(uri));
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
		invalidName ||
		invalidTag ||
		invalidDescription ||
		invalidSite ||
		invalidLibrary ||
		invalidForum ||
		invalidContactUris ||
		invalidOperatorRegions ||
		invalidRouteTypes;

	function addRouteType() {
		const newRouteType = deepCopy(emptyRouteType);
		newRouteType.id = tmpRouteTypeId--;
		routeTypes.push(newRouteType);
		routeTypes = routeTypes;
	}

	function copyCurrentToOriginal() {
		originalName = name;
		originalTag = tag;
		originalDescription = description;
		originalIsComplete = isComplete;
		originalWebsiteUrl = websiteUrl;
		originalLibraryUrl = libraryUrl;
		originalForumUrl = forumUrl;
		originalContactUris = contactUris;
	}

	async function saveOperator() {
		let data = {
			name: name,
			tag: tag,
			description: description?.trim() || null,
			is_complete: isComplete,
			website_url: websiteUrl?.trim() || null,
			library_url: libraryUrl?.trim() || null,
			forum_url: forumUrl?.trim() || null,
			contact_uris:
				contactUris
					?.split(';')
					.map((uri) => uri.trim())
					.filter((uri) => uri) || []
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
				copyCurrentToOriginal();
				toast(`Operador ${tag} alterado com sucesso`, 'success');
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
				copyCurrentToOriginal();
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

		await wipeOperators();
	}

	onMount(() => {
		if (!id) return;

		fetch(`${apiServer}/v1/operators/${id}`, {
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${$token}`
			}
		})
			.then((r) => r.json())
			.then((item) => {
				name = originalName = item.name;
				tag = originalTag = item.tag;
				description = originalDescription = item.description;
				isComplete = originalIsComplete = item.is_complete ?? false;
				websiteUrl = originalWebsiteUrl = item.website_url;
				libraryUrl = originalLibraryUrl = item.library_url;
				forumUrl = originalForumUrl = item.forum_url;
				contactUris = originalContactUris = item.contact_uris.join(';') ?? '';
				originalRegions = item.regions || [];
				operatorRegions = originalRegions ? deepCopy(originalRegions) : [];
				originalRouteTypes = item.route_types ? deepCopy(item.route_types) : [];
			});
	});
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
		<textarea
			class="textarea textarea-bordered"
			class:textarea-error={invalidDescription}
			bind:value={description}
		/>
	</label>
	<div class="form-control w-full">
		<label class="input-group">
			<span class="w-32">Site</span>
			<input
				type="text"
				bind:value={websiteUrl}
				class="input input-bordered w-full input-md"
				class:input-error={invalidSite}
				disabled={!canEdit}
			/>
		</label>
	</div>
	<div class="form-control w-full">
		<label class="input-group">
			<span class="w-32">Forum</span>
			<input
				type="text"
				bind:value={forumUrl}
				class="input input-bordered w-full input-md"
				class:input-error={invalidForum}
				disabled={!canEdit}
			/>
		</label>
	</div>
	<div class="form-control w-full">
		<label class="input-group">
			<span class="w-32">Biblioteca</span>
			<input
				type="text"
				bind:value={libraryUrl}
				class="input input-bordered w-full input-md"
				class:input-error={invalidLibrary}
				disabled={!canEdit}
			/>
		</label>
	</div>
	<div class="form-control w-full">
		<label class="input-group">
			<span class="w-32">Contactos</span>
			<input
				type="text"
				bind:value={contactUris}
				class="input input-bordered w-full input-md"
				placeholder="tel:+351912345678; mailto:foo@bar.com; https://example.com/contactos"
				class:input-error={invalidContactUris}
				disabled={!canEdit}
			/>
		</label>
	</div>
	<div class="flex">
		<div class="form-control">
			<label class="input-group">
				<span>Info completa</span>
				<input type="checkbox" bind:checked={isComplete} class="checkbox" disabled={!canEdit} />
			</label>
		</div>
	</div>
</div>
<div class="label">
	<span class="label-text">Tipos de rota</span>
	<button class="btn btn-xs btn-success" on:click={addRouteType}>+</button>
</div>
<div class="flex flex-col gap-2">
	{#each routeTypes as rt (rt.id)}
		<div class="border-2 rounded-lg p-2" class:bg-green-50={rt.id < 0}>
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
