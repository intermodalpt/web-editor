<script>
	import { createEventDispatcher } from 'svelte';
	import { writable, derived } from 'svelte/store';
	import { apiServer, movementTreshold } from '$lib/settings.js';
	import { decodedToken, token, toast } from '$lib/stores.js';
	import { distance } from '$lib/utils.js';
	import { regionId } from '$lib/db.js';
	import Paginator from '$lib/components/Paginator.svelte';
	import CoordViewer from '$lib/components/CoordViewer.svelte';

	const dispatch = createEventDispatcher();

	export let osmStop;
	export let regions;

	let isCreating = false;
	let creationDialog;

	let newStopName;
	let newStopRegions = $regionId ? [$regionId] : [];

	const isAdmin = $decodedToken?.permissions?.is_admin || false;

	const stopHistory = derived(osmStop, ($osmStop, set) => {
		if (!$osmStop) return [];
		fetch(`${apiServer}/v1/osm/stops/${$osmStop.id}`)
			.then((res) => res.json())
			.then((data) => {
				set(data);
				$versionIndex = data.length - 1;
			});
	});

	const nounce = writable(0);

	const derivedStop = derived([osmStop, nounce], async ([$osmStop, $nounce], set) => {
		if (!$osmStop) return;
		let res = await fetch(`${apiServer}/v1/osm/stops/${$osmStop.id}/paired`);
		if (res.ok) {
			set(await res.json());
		} else {
			set(null);
		}
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
		newStopName = newStopName.trim();

		const newStop = {
			lat: $osmStop.lat,
			lon: $osmStop.lon,
			osm_id: $osmStop.id,
			name: newStopName
		};
		let res = await fetch(`${apiServer}/v1/stops`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${$token}`
			},
			body: JSON.stringify(newStop)
		});

		if (!res.ok) {
			res
				.json()
				.catch((e) => {
					toast('Falha ao criar paragem', 'error');
					console.error(e);
				})
				.then((data) => {
					toast('Falha ao criar paragem:' + data.message, 'error');
				});
			console.error(res);
			isCreating = false;
			return;
		}
		let newStopId = await res.json().id;

		$nounce++;
		creationDialog.close();

		dispatch('stopcreated', { id: newStopId });

		for (const newRegionId of newStopRegions) {
			res = await fetch(`${apiServer}/v1/regions/${newRegionId}/stops/${newStopId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${$token}`
				}
			});
			if (!res.ok) {
				toast('Falha ao associar paragem à região', 'error');
				console.error(res);
				isCreating = false;
				return;
			}
		}

		isCreating = false;
	}

	function handleSyncPosition() {
		fetch(`${apiServer}/v1/stops/${$derivedStop.id}/position`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${$token}`
			}
		})
			.then((res) => {
				if (res.ok) {
					toast('Posição sincronizada', 'success');
				} else {
					toast('Falha ao sincronizar posição', 'error');
				}
			})
			.catch((e) => {
				toast('Falha ao sincronizar posição', 'error');
				console.error(e);
			});
	}
</script>

<div class="w-full h-full p-4 relative">
	<input
		type="button"
		class="btn btn-error btn-xs absolute right-2 top-2 z-50"
		on:click={() => ($osmStop = null)}
		on:keypress={() => ($osmStop = null)}
		value="X"
	/>
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
						value={new Date($osmStop.creation).toDateString()}
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
						value={new Date($osmStop.modification).toDateString()}
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
								value={new Date($selectedVersion?.timestamp).toDateString()}
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
							disabled={!isAdmin ||
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
				{#if isAdmin}
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
			<button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
		</form>
		<div class="flex flex-col gap-1 mt-2 overflow-y-scroll">
			<div class="form-control w-full">
				<label class="input-group">
					<span class="label-text w-24">Nome</span>
					<input type="text" value={newStopName} class="input input-bordered w-full input-sm" />
				</label>
			</div>
			<span class="text-xs">Regiões</span>
			<select class="w-full select select-bordered" multiple bind:value={newStopRegions}>
				{#each Object.values($regions || {}) as region}
					<option value={region.id}>{region.name}</option>
				{/each}
			</select>
			<div class="flex justify-end">
				<button
					class="btn btn-primary"
					on:click={handleCreate}
					disabled={isCreating || newStopRegions.length == 0}
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
