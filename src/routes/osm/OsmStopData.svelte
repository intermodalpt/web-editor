<script>
	import { createEventDispatcher } from 'svelte';
	import { writable, derived } from 'svelte/store';
	import { apiServer, movementTreshold } from '$lib/settings';
	import { toast, permissions } from '$lib/stores';
	import {
		createStop,
		attachStopToRegion,
		setStopPosition,
		getOsmStop,
		getOsmPairedStop
	} from '$lib/api';
	import { distance } from '$lib/utils';
	import { regionId } from '$lib/db';
	import Icon from '$lib/components/Icon.svelte';
	import Paginator from '$lib/components/Paginator.svelte';
	import CoordViewer from '$lib/components/CoordViewer.svelte';

	const dispatch = createEventDispatcher();

	export let osmStop;
	export let regions;

	let isCreating = false;
	let creationDialog;

	let newStopName;
	let newStopRegions = $regionId ? [$regionId] : [];

	const stopHistory = derived(osmStop, ($osmStop, set) => {
		if (!$osmStop) return [];
		getOsmStop($osmStop.id, {
			onSuccess: (data) => {
				set(data);
				$versionIndex = data.length - 1;
			},
			onError: () => {
				toast('Falha ao obter histórico da paragem', 'error');
			},
			toJson: true
		});
	});

	const nounce = writable(0);

	const derivedStop = derived([osmStop, nounce], async ([$osmStop, $nounce], set) => {
		if (!$osmStop) return;
		await getOsmPairedStop($osmStop.id, {
			onSuccess: (stop) => set(stop),
			onError: (res) => {
				set(null);
				if (res.status != 404) toast('Falha ao obter paragem associada', 'error');
			},
			toJson: true
		});
	});

	const derivedStopDistance = derived([derivedStop, osmStop], ([$derivedStop, $osmStop]) => {
		if (!$derivedStop || !$osmStop) return;
		return distance($derivedStop.lat, $derivedStop.lon, $osmStop.lat, $osmStop.lon);
	});

	const versionIndex = writable(1);
	const selectedVersion = derived(
		[stopHistory, versionIndex],
		([$stopHistory, $versionIndex], set) => {
			if (!$stopHistory) return null;
			set($stopHistory[$versionIndex]);
		}
	);

	function handlePrecreate() {
		newStopName = $osmStop.name;
		creationDialog.showModal();
	}

	async function handleCreate() {
		isCreating = true;
		newStopName = newStopName?.trim() ?? '?';

		const newStop = {
			lat: $osmStop.lat,
			lon: $osmStop.lon,
			osm_id: $osmStop.id,
			name: newStopName,
			license: 'ODbL',
			is_ghost: false
		};

		await createStop(newStop, {
			onSuccess: async (newStopId) => {
				creationDialog.close();
				dispatch('stopcreated', { id: newStopId });

				await updateStopTodos(stopId, ['verifyLocation'], {
					onSuccess: () => {
						toast('Marcada não verificada', 'success');
					},
					onError: (err) => {
						toast('Erro a marcar paragem como pendente de verificação', 'error');
					}
				});

				toast('Paragem criada', 'success');
				for (const regionId of newStopRegions) {
					await attachStopToRegion(newStopId, regionId, {
						onSuccess: () => {
							toast('Paragem associada à região', 'success');
						},
						onError: (e) => {
							toast('Falha ao associar paragem à região', 'error');
						}
					});
				}
				$nounce++;
			},
			onError: () => {
				toast('Falha ao criar paragem', 'error');
			},
			onAfter: () => {
				isCreating = false;
				creationDialog.close();
			}
		});
	}

	async function handleSyncPosition() {
		await setStopPosition($derivedStop.id, $osmStop.lat, $osmStop.lon, {
			onSuccess: () => {
				toast('Posição sincronizada', 'success');
				// TODO: update derived stop
			},
			onError: () => {
				toast('Falha ao sincronizar posição', 'error');
			}
		});
	}

	function handleKeydown(e) {
		switch (e.key) {
			case 'c':
				if (isCreating || $derivedStop) {
					return;
				}
				handlePrecreate();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="w-full h-full p-4 relative">
	<button
		class="btn btn-error btn-xs absolute right-2 top-2 z-50"
		on:click={() => ($osmStop = null)}
	>
		<Icon name="close" class="h-4 stroke-current" />
	</button>
	<div class="w-full h-full overflow-y-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
		<div class="flex flex-col gap-1 items-start">
			<div class="flex flex-wrap gap-2 items-center">
				{#if $osmStop.deleted}
					<span class="text-error border-error px-2 border-l-2 border-r-2">Apagada</span>
				{/if}
				<a class="text-lg" href="https://www.openstreetmap.org/node/{$osmStop.id}" target="_blank"
					>#{$osmStop.id}</a
				>
				<span class="text-lg text-base-300">v{$osmStop.version}</span>
				<CoordViewer lat={$osmStop.lat} lon={$osmStop.lon} />
			</div>
			<div class="form-control w-full">
				<label class="input-group">
					<span class="label-text w-24">Nome</span>
					<input
						type="text"
						value={$osmStop.name}
						class="input input-bordered w-full input-sm"
						disabled="true"
					/>
				</label>
			</div>
			<div class="form-control w-full">
				<label class="input-group">
					<span class="label-text w-24">Criação</span>
					<input
						type="text"
						value={new Date($osmStop.creation).toUTCString()}
						class="input input-bordered w-full input-sm"
						disabled="true"
					/>
				</label>
			</div>
			<div class="form-control w-full">
				<label class="input-group">
					<span class="label-text w-24">Edição</span>
					<input
						type="text"
						value={new Date($osmStop.modification).toUTCString()}
						class="input input-bordered w-full input-sm"
						disabled="true"
					/>
				</label>
			</div>
			<div class="form-control w-full">
				<label class="input-group">
					<span class="label-text w-24">Posicão</span>
					<input
						type="text"
						value={$osmStop.pos_author}
						class="input input-bordered w-full input-sm"
						disabled="true"
					/>
				</label>
			</div>
			<div class="form-control w-full">
				<label class="input-group">
					<span class="label-text w-24">Editor</span>
					<input
						type="text"
						value={$osmStop.last_author}
						class="input input-bordered w-full input-sm"
						disabled="true"
					/>
				</label>
			</div>
		</div>
		<div class="flex flex-col gap-2">
			<div class="flex flex-wrap gap-2">
				<h2 class="text-lg">Versão</h2>
				<Paginator
					bind:page={$versionIndex}
					pageSize={1}
					itemCount={$stopHistory?.length || 0}
					on:goto={(e) => {
						$versionIndex = e.detail.page;
					}}
				/>
			</div>
			<div class="flex gap-2 flex-wrap">
				<div class="flex flex-col flex-grow gap-2">
					{#if $selectedVersion?.deleted}
						<span class="text-error border-error px-2 border-l-2 border-r-2">Apagada</span>
					{/if}
					<CoordViewer lat={$selectedVersion?.lat ?? 0} lon={$selectedVersion?.lon ?? 0} />
					<div class="form-control w-full">
						<label class="input-group">
							<span class="label-text w-24">Autor</span>
							<input
								type="text"
								value={$selectedVersion?.author_uname}
								class="input input-bordered w-full input-sm"
								disabled="true"
							/>
						</label>
					</div>
					<div class="form-control w-full">
						<label class="input-group">
							<span class="label-text w-24">Data</span>
							<input
								type="text"
								value={new Date($selectedVersion?.timestamp).toUTCString()}
								class="input input-bordered w-full input-sm"
								disabled="true"
							/>
						</label>
					</div>
				</div>
				<div class="flex-grow p-1 bg-base-200 rounded-lg h-64 overflow-scroll">
					<table class="w-full table table-zebra table-xs">
						<thead>
							<tr>
								<th colspan="2">Atributos</th>
							</tr>
						</thead>
						<tbody>
							{#each $selectedVersion?.attributes || [] as attr}
								<tr>
									<td>{attr[0]}</td><td>{attr[1]}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
		<div class="flex flex-col gap-2">
			<h2 class="text-xl">Emparelhamento</h2>
			{#if $derivedStop}
				<div class="flex flex-col flex-grow gap-2">
					<div class="form-control w-full">
						<label class="input-group">
							<span class="label-text w-24">Id</span>
							<input
								type="text"
								value={$derivedStop?.id}
								class="input input-bordered w-full input-sm"
								disabled="true"
							/>
						</label>
					</div>
					<div class="form-control w-full">
						<label class="input-group">
							<span class="label-text w-24">Nome</span>
							<input
								type="text"
								value={$derivedStop?.name}
								class="input input-bordered w-full input-sm"
								disabled="true"
							/>
						</label>
					</div>
					<div class="flex gap-2">
						<CoordViewer lat={$derivedStop?.lat} lon={$derivedStop?.lon} />
						<span>({$derivedStopDistance} metros)</span>
					</div>
					<div class="flex flex-wrap gap-2">
						<button
							class="btn grow btn-primary"
							on:click={handleSyncPosition}
							disabled={!$permissions?.stops?.modifyPos ||
								!$derivedStopDistance ||
								Math.abs($derivedStopDistance) < movementTreshold}
						>
							Sincronizar posição
						</button>
						<button class="btn grow btn-primary" disabled> Submeter dados </button>
					</div>
				</div>
			{:else}
				<span>Sem equivalente</span>
				{#if $permissions?.stops?.create}
					<button class="btn btn-primary" on:click={handlePrecreate} disabled={isCreating}
						>Criar</button
					>
				{/if}
			{/if}
		</div>
	</div>
</div>

<dialog bind:this={creationDialog} class="modal modal-bottom sm:modal-middle z-30">
	<div class="modal-box z-30 max-w-5xl grid grid-cols-1" style="grid-template-rows: auto 1fr;">
		<form method="dialog">
			<button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
				<Icon name="close" class="h-4 stroke-current" />
			</button>
		</form>
		<div class="flex flex-col gap-1 mt-2 overflow-y-scroll">
			<div class="form-control w-full">
				<label class="input-group">
					<span class="label-text w-24">Nome</span>
					<input
						type="text"
						bind:value={newStopName}
						class="input input-bordered w-full input-sm"
					/>
				</label>
			</div>
			<span class="text-xs">Regiões</span>
			<select class="w-full select select-bordered" multiple bind:value={newStopRegions}>
				{#each regions as region}
					<option value={region.id}>{region.name}</option>
				{/each}
			</select>
			<div class="flex justify-end">
				<button
					class="btn btn-primary"
					on:click={handleCreate}
					disabled={isCreating || newStopRegions.length == 0}
					autofocus
				>
					{#if isCreating}
						<span class="loading loading-spinner loading-xs" />
					{/if}
					Criar
				</button>
			</div>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>Fechar</button>
	</form>
</dialog>
