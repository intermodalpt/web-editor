<script>
	import { writable, derived } from 'svelte/store';
	import { apiServer } from '$lib/settings.js';
	import Paginator from '$lib/components/Paginator.svelte';
	import CoordViewer from '$lib/components/CoordViewer.svelte';

	export let osmStop;

	export let isAdmin = true;

	let isCreating = false;

	const stopHistory = derived(osmStop, ($osmStop, set) => {
		if (!$osmStop) return [];
		fetch(`${apiServer}/v1/osm/stops/${$osmStop.id}`)
			.then((res) => res.json())
			.then((data) => {
				set(data);
				$versionIndex = data.length - 1;
			});
	});

	const derivedStop = derived(osmStop, async ($osmStop, set) => {
		if (!$osmStop) return;
		let res = await fetch(`${apiServer}/v1/osm/stops/${$osmStop.id}/paired`);
		if (!res.ok) return;
		set(await res.json());
	});

	const versionIndex = writable(1);
	const selectedVersion = derived(
		[stopHistory, versionIndex],
		([$stopHistory, $versionIndex], set) => {
			if (!$stopHistory) return null;
			set($stopHistory[$versionIndex]);
		}
	);

	function handleCreate() {
		isCreating = true;

		isCreating = false;
	}
</script>

<div class="w-full overflow-y-auto p-4 relative">
	<input
		type="button"
		class="btn btn-error btn-xs absolute right-2 top-2"
		on:click={() => ($osmStop = null)}
		on:keypress={() => ($osmStop = null)}
		value="X"
	/>
	<div class="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
		<div class="flex flex-col gap-1 items-start">
			<div class="flex gap-2 items-center">
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
			<div class="flex gap-2">
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
				<div class="flex-grow p-1 bg-base-200 rounded-lg">
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
				<textarea>{JSON.stringify($derivedStop)}</textarea>
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
							<span class="label-text w-24">Name</span>
							<input
								type="text"
								value={$derivedStop?.name}
								class="input input-bordered w-full input-sm"
								disabled="true"
							/>
						</label>
					</div>
				</div>
			{:else}
				<span>Sem equivalente</span>
				{#if isAdmin}
					<button class="btn btn-primary" on:click={handleCreate} disabled={isCreating}
						>Criar</button
					>
				{/if}
			{/if}
		</div>
	</div>
</div>
