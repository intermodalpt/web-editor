<script>
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let vias;
	export let viaIndex;
	export let stops;
	export let subrouteStops;

	export let elem;

	let name = '';
	let startIndex = null;
	let endIndex = null;

	let hoveredIndex = null;

	$: initialSelectionIndex = startIndex != null ? startIndex : hoveredIndex;
	$: finalSelectionIndex = initialSelectionIndex != null ? endIndex || hoveredIndex : null;

	$: sortedInitialSelectionIndex =
		finalSelectionIndex == null
			? initialSelectionIndex
			: initialSelectionIndex == null
			? null
			: Math.min(initialSelectionIndex, finalSelectionIndex);
	$: sortedFinalSelectionIndex =
		finalSelectionIndex == null ? null : Math.max(initialSelectionIndex, finalSelectionIndex);

	$: refreshData(vias, viaIndex);

	$: stopNames = Object.fromEntries(
		subrouteStops.map((stopId) => {
			let stop = stops[stopId];
			if (!stop) {
				return [stopId, '?????'];
			}
			// TODO Show operator name first

			return [stopId, stop.name];
		})
	);

	function refreshData(vias, viaIndex) {
		const via = vias[viaIndex];
		if (via === undefined) {
			name = '';
			startIndex = null;
			endIndex = null;
		} else {
			name = via.name;
			if (via.stops) {
				startIndex = via.stops[0];
				endIndex = via.stops[1];
			} else {
				startIndex = null;
				endIndex = null;
			}
		}
	}

	function handleSave() {
		const rangePair =
			sortedInitialSelectionIndex != null && sortedFinalSelectionIndex != null
				? [sortedInitialSelectionIndex, sortedFinalSelectionIndex]
				: null;

		dispatch('save', {
			index: viaIndex,
			name,
			stops: rangePair
		});
	}

	function handleDelete() {
		dispatch('delete', {
			index: viaIndex
		});
	}
	function handleClick(i) {
		if (startIndex === null) startIndex = i;
		else if (endIndex === null) endIndex = i;
		else {
			startIndex = null;
			endIndex = null;
		}
	}
</script>

{#if vias}
	<div class="modal-box !max-w-[75em]">
		<div class="flex gap-4">
			<div class="flex flex-col overflow-y-scroll">
				{#if stops}
					{#each subrouteStops as stopId, i}
						<div
							class="flex gap-1"
							on:mouseenter={() => (hoveredIndex = i)}
							on:mouseleave={() => (hoveredIndex = null)}
							on:keydown={() => handleClick(i)}
							on:click={() => handleClick(i)}
						>
							<span
								class="w-6 h-5"
								class:rounded-tl-lg={sortedInitialSelectionIndex === i}
								class:rounded-bl-lg={sortedFinalSelectionIndex === i}
								class:bg-blue-400={sortedInitialSelectionIndex >= 0 &&
									sortedInitialSelectionIndex != null &&
									sortedFinalSelectionIndex != null &&
									sortedInitialSelectionIndex <= i &&
									i <= sortedFinalSelectionIndex}
							/>

							<b>{stopNames[stopId]}</b>
							<span>({stopId})</span>
						</div>
					{/each}
				{/if}
			</div>
			<div>
				<form method="dialog">
					<button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
				</form>
				<label class="form-control">
					<div class="label py-0">
						<span class="label-text-alt">Via</span>
					</div>
					<input type="text" class="input input-bordered input-sm w-64" bind:value={name} />
				</label>
				{#if stops && sortedInitialSelectionIndex != null && sortedInitialSelectionIndex < subrouteStops.length}
					<span class="form-control">
						<div class="label py-0">
							<span class="label-text-alt">De</span>
						</div>
						<span class="input input-bordered input-disabled"
							>{subrouteStops[sortedInitialSelectionIndex]} -
							{stopNames[subrouteStops[sortedInitialSelectionIndex]]}
						</span>
					</span>
				{/if}
				{#if stops && sortedFinalSelectionIndex != null && sortedFinalSelectionIndex < subrouteStops.length}
					<span class="form-control">
						<div class="label py-0">
							<span class="label-text-alt">Até</span>
						</div>
						<span class="input input-bordered input-disabled"
							>{subrouteStops[sortedFinalSelectionIndex]} -
							{stopNames[subrouteStops[sortedFinalSelectionIndex]]}
						</span>
					</span>
				{/if}
			</div>
		</div>
		<div class="modal-action">
			<button class="btn btn-error" class:hidden={viaIndex < 0} on:click={handleDelete}>
				Apagar
			</button>
			<button
				class="btn btn-primary"
				disabled={!name || name.trim().length == 0}
				on:click={handleSave}>{viaIndex < 0 ? 'Adicionar' : 'Guardar'}</button
			>
			<form method="dialog">
				<button class="btn">Fechar</button>
			</form>
		</div>
	</div>
{/if}
