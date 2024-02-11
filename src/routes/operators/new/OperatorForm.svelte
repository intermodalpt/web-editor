<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { derived } from 'svelte/store';
	import { liveQuery } from 'dexie';
	import { getRegions, wipeRegionCachedData } from '$lib/db';
	import { token, decodedToken, toast } from '$lib/stores.js';
	import { apiServer } from '$lib/settings.js';
	import { isDeepEqual, deepCopy } from '$lib/utils.js';

	const regions = liveQuery(() => getRegions());
	const sortedRegions = derived(regions, ($regions) => {
		if (!$regions) {
			return [];
		}
		return Object.values($regions).sort((a, b) => a.name.localeCompare(b.name));
	});

	const dispatch = createEventDispatcher();

	export let original;

	let id = original?.id;
	let originalName = original?.name;
	let originalTag = original?.tag;
	let originalDescription = original?.description;
	let originalRegions = original?.regions || [];

	let name = originalName;
	let tag = originalTag;
	let description = originalDescription;
	let operatorRegions;
	let logoFiles;

	let operatorRegionsLoaded = id != undefined;

	$: dataChanged = originalName != name || originalTag != tag || originalDescription != description;

	$: regionsChanged =
		operatorRegionsLoaded && !isDeepEqual(originalRegions || {}, operatorRegions || {});

	$: changed = dataChanged || regionsChanged || logoFiles;

	$: invalidName = !name || name.trim().length < 3;
	$: invalidTag = !tag || tag.length < 2 || tag.includes(' ');
	$: invalidDescription = description && description.length < 3;
	$: invalidOperatorRegions = operatorRegions && operatorRegions.length < 1;
	$: invalidData = invalidName || invalidTag || invalidDescription || invalidOperatorRegions;

	async function saveOperator() {
		let data = {
			name: name,
			tag: tag,
			description: description?.trim() || null
		};

		const newRegions = operatorRegions.filter((region) => !originalRegions.includes(region));
		const removedRegions = originalRegions.filter((region) => !operatorRegions.includes(region));

		console.log(newRegions);
		console.log(removedRegions);

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
			if (logoFiles.length == 0) {
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

		if (id && !dataChanged) {
			await Promise.all([updateRegions(), uploadLogo()]);
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

			await Promise.all([updateRegions(), uploadLogo()]);
		}

		await wipeRegionCachedData();
	}

	onMount(async () => {
		if (id) {
			let originalRegions = await fetch(`${apiServer}/v1/operators/${id}/regions`).then((res) =>
				res.json()
			);
			console.log(originalRegions);
			operatorRegions = originalRegions;
			operatorRegionsLoaded = true;
		}
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
					disabled={!$decodedToken?.permissions.is_admin}
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
					disabled={!$decodedToken?.permissions.is_admin}
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
<textarea class="textarea textarea-bordered">{logoFiles}</textarea>
<textarea class="textarea textarea-bordered">{logoFiles ? logoFiles[0] : '-'}</textarea>

<div class="flex justify-end" class:hidden={!$decodedToken?.permissions.is_admin}>
	<input
		type="submit"
		value="Guardar"
		class="btn btn-primary"
		disabled={!changed || invalidData}
		on:click={saveOperator}
	/>
</div>
