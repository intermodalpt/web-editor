<script>
	import { createEventDispatcher } from 'svelte';
	import ViaInput from './ViaInput.svelte';
	import ViaForm from './ViaForm.svelte';

	const dispatch = createEventDispatcher();

	export let subroute;
	export let stops;
	export let subrouteStops;
	export let groupIndex;
	export let indexInGroup;
	export let canEdit;

	let viaDialog;
	let editingViaIndex = -1;

	function dragStart(event, groupIndex, itemIndex) {
		const data = { groupIndex, itemIndex, subrouteId: subroute.id };
		event.dataTransfer.setData('text/plain', JSON.stringify(data));
	}

	function handleDelete() {
		dispatch('delete-subroute', { id: subroute.id });
	}

	function handleChange() {
		subroute._updateModified();
		dispatch('subroute-change', { id: subroute.id });
	}
</script>

<div class="rounded-md p-1 flex flex-col gap-1 flex-nowrap bg-base-100">
	<div class="flex justify-between">
		<div class="flex">
			{#if canEdit}
				<span
					class="w-8"
					on:dragstart={(event) => dragStart(event, groupIndex, indexInGroup)}
					draggable="true"
				>
					<svg
						class="fill-base-content opacity-40 w-4"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 448 512"
					>
						<!-- Font Awesome Free 6.4.0 https://fontawesome.com/license/free (Free License). -->
						<path
							d="M32 288c-17.7 0-32 14.3-32 32s14.3 32 32 32l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L32 288zm0-128c-17.7 0-32 14.3-32 32s14.3 32 32 32l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L32 160z"
						/></svg
					>
				</span>
			{/if}
			<span>{subroute.flag || ''}</span>
		</div>
		<div class="flex gap-1">
			<span class="bg-base-200 rounded-md px-2">{subroute.id >= 0 ? subroute.id : '?'}</span>
			<div class="form-control">
				<label class="input-group">
					<span>Circular</span>
					<input
						type="checkbox"
						class="checkbox"
						bind:checked={subroute.circular}
						on:change={handleChange}
						disabled={!canEdit}
					/>
				</label>
			</div>
			<button class="btn btn-error btn-xs" class:hidden={!canEdit} on:click={handleDelete}>-</button
			>
		</div>
	</div>
	<div class="flex flex-wrap gap-2">
		<label class="form-control">
			<div class="label py-0">
				<span class="label-text-alt">Bandeira</span>
			</div>
			<input
				type="text"
				class="input input-bordered input-sm w-64"
				bind:value={subroute.headsign}
				on:change={handleChange}
				disabled={!canEdit}
			/>
		</label>
		<label class="form-control grow-0">
			<div class="label py-0">
				<span class="label-text-alt">De</span>
			</div>
			<input
				type="text"
				class="input input-bordered input-sm w-64"
				bind:value={subroute.origin}
				on:change={handleChange}
				disabled={!canEdit}
			/>
		</label>
		<label class="form-control">
			<div class="label py-0">
				<span class="label-text-alt">Para</span>
			</div>
			<input
				type="text"
				class="input input-bordered input-sm w-64"
				bind:value={subroute.destination}
				on:change={handleChange}
				disabled={!canEdit}
			/>
		</label>
		<span class="form-control">
			<div class="label py-0">
				<span class="label-text-alt">Via</span>
			</div>
			<ViaInput
				vias={subroute.via}
				{canEdit}
				on:open={(e) => {
					editingViaIndex = e.detail.index;
					viaDialog.showModal();
				}}
				on:new={() => {
					editingViaIndex = -1;
					viaDialog.showModal();
				}}
			/>
		</span>
	</div>
	<!-- <div class="flex justify-between">
		<span class="text-xs">Curral de Moinas - Queijo Fiambre | via Cenas compridas</span>
		<span class="text-xs">1234_3</span>
    </div> -->
</div>

<dialog bind:this={viaDialog} class="modal modal-bottom sm:modal-middle">
	{#if stops}
		<ViaForm
			vias={subroute.via}
			viaIndex={editingViaIndex}
			{stops}
			{subrouteStops}
			on:save={(e) => {
				const via = {
					name: e.detail.name,
					stops: e.detail.stops
				};
				if (e.detail.index == -1) {
					subroute.via.push(via);
				} else {
					subroute.via[e.detail.index] = via;
				}
				subroute = subroute;
				handleChange();
				viaDialog.close();
			}}
			on:delete={(e) => {
				const index = e.detail.index;
				subroute.via.splice(index, 1);
				subroute = subroute;
				handleChange();
				viaDialog.close();
			}}
		/>
	{/if}
</dialog>
