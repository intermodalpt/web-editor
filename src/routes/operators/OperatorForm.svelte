<script lang="ts">
	import { onMount } from 'svelte';
	import { error } from '@sveltejs/kit';
	import Select from 'svelte-select';
	import { permissions, toast } from '$lib/stores';
	import { isValidUri } from '$lib/utils';
	import {
		attachOperatorToRegion,
		createOperator,
		createOperatorRouteType,
		deleteOperatorRouteType,
		dettachOperatorFromRegion,
		getOperator,
		getOperatorRouteTypes,
		patchOperator,
		patchOperatorRouteType,
		uploadLogo
	} from '$lib/api';
	import { isDeepEqual, deepCopy } from '$lib/utils';
	import RouteTypeForm from './RouteTypeForm.svelte';
	import Icon from '$lib/components/Icon.svelte';

	export let id: number | null = null;
	export let regions: SimpleRegion[] = [];
	const regionIndex: Record<string, SimpleRegion> = Object.fromEntries(
		regions.map((r) => [r.id, r])
	);
	let routeTypes: RouteType[] = [];

	const regionOptions = regions
		.sort((a, b) => a.name.localeCompare(b.name))
		.map((region) => ({
			value: region.id,
			label: region.name
		}));

	const canEdit =
		(id && $permissions?.operators?.create) || (!id && $permissions?.operators?.modifyBase);

	let originalName: string = '',
		originalTag: string = '',
		originalDescription: string = '',
		originalIsComplete: boolean = false,
		originalWebsiteUrl: string = '',
		originalLibraryUrl: string = '',
		originalForumUrl: string = '',
		originalContactUris: string = '',
		originalRegions: number[] = [],
		originalRouteTypes = {};

	let currentLogoUrl: string | null = null;

	let name: string = '',
		tag: string = '',
		description: string = '',
		isComplete: boolean = false,
		websiteUrl: string = '',
		libraryUrl: string = '',
		forumUrl: string = '',
		contactUris: string = '',
		operatorRegions: { value: number; label: string }[] = [];

	let logoFiles: FileList;

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
	let isSaving = false;

	$: dataChanged =
		originalName != name.trim() ||
		originalTag != tag.trim() ||
		originalDescription != description.trim() ||
		originalWebsiteUrl != websiteUrl.trim() ||
		originalLibraryUrl != libraryUrl.trim() ||
		originalForumUrl != forumUrl.trim() ||
		originalContactUris != contactUris.trim();

	$: regionsChanged =
		operatorRegionsLoaded &&
		!isDeepEqual(
			originalRegions,
			Object.values(operatorRegions ?? []).map((r) => r.value)
		);

	$: routeTypesChanged = haveRouteTypesChanged(originalRouteTypes, routeTypes);

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

	function haveRouteTypesChanged(original: Record<string, RouteType>, current: RouteType[]) {
		for (const rt of current) {
			if (rt._deleted) {
				return true;
			}
			if (rt.id < 0) {
				return true;
			}

			const ort = original[rt.id];

			if (
				ort.name != rt.name ||
				ort.zapping_cost != rt.zapping_cost ||
				ort.board_cost != rt.board_cost ||
				ort.multi_trip != rt.multi_trip ||
				ort.badge_text_color != rt.badge_text_color ||
				ort.badge_bg_color != rt.badge_bg_color
			) {
				return true;
			}
		}

		return false;
	}

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
		let isSaving = true;

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

		const newRegions = operatorRegions
			?.filter((region) => !originalRegions.includes(region.value))
			.map((region) => region.value);
		const removedRegions = originalRegions.filter(
			(region) => !operatorRegions?.some((r) => r.value == region)
		);

		let updateRegions = async (id: number) => {
			let allSuccesses = true;
			let errorMessage = null;

			for (let region of newRegions) {
				if (!allSuccesses) {
					break;
				}

				await attachOperatorToRegion(id, region, {
					/*onSuccess: () => {
						toast(`Região ${region} adicionada ao operador ${originalTag}`, 'success');
					},*/
					onError: async (res) => {
						allSuccesses = false;
						await res.text().then((error) => (errorMessage = error));
					}
				});
			}

			for (let region of removedRegions) {
				if (!allSuccesses) {
					break;
				}

				await dettachOperatorFromRegion(id, region, {
					/*onSuccess: () => {
						toast(`Região ${region} removida do operador`, 'success');
					},*/
					onError: async (res) => {
						allSuccesses = false;
						await res.text().then((error) => (errorMessage = error));
					}
				});
			}

			if (allSuccesses) {
				originalRegions = operatorRegions.map((r) => r.value);
			} else {
				if (errorMessage) {
					toast(`Erro a gravar regiões:\n${errorMessage}`, 'error');
				} else {
					toast('Erro a gravar regiões', 'error');
				}
			}
			return allSuccesses;
		};

		let handleUploadLogo = async (id: number) => {
			if (!logoFiles || logoFiles.length == 0) {
				return true;
			}
			const formData = new FormData();
			formData.append('logo', logoFiles[0]);

			let success = true;

			await uploadLogo(id, formData, {
				onSuccess: () => {
					// toast(`Logotipo do operador ${originalTag} alterado`, 'success');
					logoFiles = undefined;
				},
				onError: async (res) => {
					await res
						.text()
						.then((error) => {
							toast(`Erro a alterar logotipo:\n${error}`, 'error');
						})
						.catch(() => {
							toast('Erro a alterar logotipo', 'error');
						});
					success = false;
				}
			});

			return success;
		};

		let updateRouteTypes = async (id: number) => {
			const deletedRouteTypes = routeTypes.filter((rt) => rt._deleted);

			let allSuccesses = true;
			let errorMessage = null;

			for (const rt of deletedRouteTypes) {
				if (!allSuccesses) {
					break;
				}
				await deleteOperatorRouteType(id, rt.id, {
					onSuccess: () => {
						/*if (rt.name) {
							toast(`Tipo de rota ${rt.name} apagado`);
						} else {
							toast(`Tipo de rota #${rt.id} apagado`);
						}*/
						routeTypes = routeTypes.filter((ort: RouteType) => ort.id != rt.id);
						delete originalRouteTypes[rt.id];
					},
					onError: async (res) => {
						allSuccesses = false;
						await res.text().then((error) => (errorMessage = error));
					}
				});
			}

			for (const rt of routeTypes) {
				if (!allSuccesses) {
					break;
				}

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
					await createOperatorRouteType(id, body, {
						onSuccess: (res: RouteType) => {
							/*if (res.name) {
								toast(`Criado tipo de rota ${res.name}`);
							} else {
								toast(`Criado tipo de rota`);
							}*/
							rt.id = res.id;
							originalRouteTypes[rt.id] = deepCopy(rt);
							routeTypes = routeTypes;
						},
						onError: async (res) => {
							allSuccesses = false;
							await res.text().then((error) => (errorMessage = error));
						},
						toJson: true
					});
				} else if (rt._changed) {
					await patchOperatorRouteType(id, rt.id, body, {
						onSuccess: () => {
							/*if (rt.name) {
								toast(`Tipo de rota ${rt.name} alterado`, 'success');
							} else {
								toast(`Tipo de rota #${rt.id} alterado`, 'success');
							}*/
							delete rt._changed;
							originalRouteTypes[rt.id] = deepCopy(rt);
						},
						onError: async (res) => {
							allSuccesses = false;
							await res.text().then((error) => (errorMessage = error));
						}
					});
				}
			}

			if (!allSuccesses) {
				if (errorMessage) {
					toast(`Erro a gravar tipos de rota:\n${errorMessage}`, 'error');
				} else {
					toast('Erro a gravar tipos de rota', 'error');
				}
			}
			return allSuccesses;
		};

		if (id) {
			let opDataStatus = true;

			const [_, regStatus, logoStatus, typesStatus] = await Promise.all([
				dataChanged
					? patchOperator(id, data, {
							onSuccess: () => {
								copyCurrentToOriginal();
							},
							onError: () => {
								opDataStatus = false;
							}
						})
					: null,
				updateRegions(id),
				handleUploadLogo(id),
				updateRouteTypes(id)
			]);

			if (!opDataStatus || !regStatus || !logoStatus || !typesStatus) {
				toast('Erro a gravar informação', 'error');
			} else {
				toast(`Operador alterado`);
			}
		} else {
			await createOperator(data, {
				onSuccess: async (res) => {
					const newOperator: Operator = await res.json();
					id = newOperator.id;
					currentLogoUrl = newOperator.logo_url;
					copyCurrentToOriginal();
					toast(`Operador ${originalTag} criado`, 'success');
					const [regStatus, logoStatus, rtStatus] = await Promise.all([
						updateRegions(id),
						handleUploadLogo(id),
						updateRouteTypes(id)
					]);
					if (!regStatus || !logoStatus || !rtStatus) {
						toast('Erro a gravar informação', 'error');
					}
				},
				onError: async (res) => {
					res
						.text()
						.then((error) => {
							toast(`Erro a criar operador:\n${error}`, 'error');
						})
						.catch(() => {
							toast('Erro a criar operador', 'error');
						});
				}
			});
		}

		isSaving = false;
	}

	onMount(async () => {
		if (!id) return;
		const [operator, rts] = await Promise.all([
			getOperator(id, {
				onError: (res) => {
					error(res.status, 'Failed to load the operator');
				},
				toJson: true
			}),
			getOperatorRouteTypes(id, {
				onError: (res) => {
					error(res.status, 'Failed to fetch route types');
				},
				toJson: true
			})
		]);

		name = originalName = operator.name;
		tag = originalTag = operator.tag;
		description = originalDescription = operator.description ?? '';
		isComplete = originalIsComplete = operator.is_complete ?? false;
		websiteUrl = originalWebsiteUrl = operator.website_url ?? '';
		libraryUrl = originalLibraryUrl = operator.library_url ?? '';
		forumUrl = originalForumUrl = operator.forum_url ?? '';
		contactUris = originalContactUris = operator.contact_uris.join(';') ?? '';
		originalRegions = operator.regions;
		operatorRegions = originalRegions.map((id) => {
			return {
				value: id,
				label: regionIndex[id].name
			};
		});
		currentLogoUrl = operator.logo_url;

		routeTypes = rts;
		originalRouteTypes = Object.fromEntries(rts.map((rt: RouteType) => [rt.id, deepCopy(rt)]));
	});
</script>

<div class="flex flex-col gap-3 overflow-visible w-full">
	<div class="flex gap-4">
		<div class="form-control w-24">
			<label class="input-group flex flex-col">
				<span class="label-text">Etiqueta</span>
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
			<label class="input-group flex flex-col">
				<span class="label-text">Nome</span>
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
	<div class="form-control w-full">
		<span class="label-text">Regiões</span>
		<Select
			items={regionOptions}
			multiple={true}
			disabled={!canEdit}
			bind:value={operatorRegions}
		/>
	</div>
	<label class="form-control w-full max-w-xs">
		<span class="label-text">Logotipo</span>
		{#if currentLogoUrl}
			<img src={currentLogoUrl} alt="Logotipo atual" class="max-w-32 max-h-32" />
		{/if}
		<input
			bind:files={logoFiles}
			type="file"
			class="file-input file-input-bordered w-full max-w-xs"
			accept=".svg,.png,.jpg,.webp"
		/>
	</label>
	<label class="form-control w-full">
		<span class="label-text">Descrição</span>
		<textarea
			class="textarea textarea-bordered"
			class:textarea-error={invalidDescription}
			bind:value={description}
		/>
	</label>
	<div class="form-control w-full">
		<label class="input-group">
			<span class="label-text">Site</span>
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
			<span class="label-text">Forum</span>
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
			<span class="label-text">Biblioteca</span>
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
			<span class="label-text">Contactos</span>
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
</div>
<hr />
<div class="flex gap-2 flex-wrap">
	<h2 class="text-lg grow">Tipos de rota</h2>
	<button class="btn btn-xs btn-success" on:click={addRouteType}>+</button>
</div>
<div class="flex flex-col gap-2">
	{#if canEdit && routeTypes.length == 0}
		<div role="alert" class="alert border-2 border-warning bg-base-100 w-fit">
			<span>Deve de ter pelo menos um tipo de linha</span>
		</div>
	{/if}
	{#each routeTypes as rt (rt.id)}
		<div class="border-2 rounded-lg p-2">
			{#if rt._deleted}
				<div class="flex gap-2 items-center justify-between">
					<div class="flex gap-2 items-center">
						<span class="badge rounded-md px-2 py-1 badge-error badge-outline">{rt.id}</span>
						{#if rt.name}
							<span>{rt.name}</span>
						{/if}
					</div>
					<button
						class="btn btn-xs btn-neutral"
						on:click={() => {
							rt._deleted = false;
							routeTypes = routeTypes;
						}}>Restaurar</button
					>
				</div>
			{:else}
				<RouteTypeForm
					bind:rtype={rt}
					on:change={(e) => {
						rt._changed = e.detail.fromOriginal;
						routeTypes = routeTypes;
					}}
					on:delete={() => {
						if (rt.id > 0) {
							rt._deleted = true;
						} else {
							routeTypes = routeTypes.filter((ort) => rt != ort);
						}
						routeTypes = routeTypes;
					}}
					{canEdit}
				/>
			{/if}
		</div>
	{/each}
</div>
<hr />

<div class="flex justify-between items-center flex-wrap" class:hidden={!canEdit}>
	<label class="input-group flex gap-2 items-center py-2">
		<span class="text-lg">Informação completa</span>
		<input type="checkbox" bind:checked={isComplete} class="checkbox" disabled={!canEdit} />
	</label>
	<div class="flex items-center">
		{#if isSaving}
			<Icon name="spinner" class="animate-spin -ml-1 mr-3 h-6 w-6" />
		{/if}
		<input
			type="submit"
			value="Guardar"
			class="btn btn-primary"
			disabled={!changed || invalidData || isSaving}
			on:click={saveOperator}
		/>
	</div>
</div>
