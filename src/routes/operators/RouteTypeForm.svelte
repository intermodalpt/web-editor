<script>
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let canEdit;

	export let rtype;

	$: id = rtype.id;

	let originalName = rtype.name;
	let originalZappingCost = rtype.zapping_cost;
	let originalBoardCost = rtype.board_cost;
	let originalMultiTrip = rtype.multi_trip;
	let originalBadgeTextColor = rtype.badge_text_color;
	let originalBadgeBgColor = rtype.badge_bg_color;

	let hasChanged = false;

	function recalcHasChanged() {
		hasChanged =
			originalName !== name ||
			originalZappingCost !== zapping_cost ||
			originalBoardCost !== board_cost ||
			originalMultiTrip !== multi_trip ||
			originalBadgeTextColor !== badge_text_color ||
			originalBadgeBgColor !== badge_bg_color;
	}

	function handleChange() {
		recalcHasChanged();
		if (hasChanged) {
			dispatch('change', { fromOriginal: hasChanged });
		}
	}
</script>

<div class="flex flex-col gap-2">
	<div class="flex justify-between">
		<span
			class="bg-base-200 rounded-md px-2 py-1"
			class:border-[1px]={rtype.id < 0}
			class:text-success={rtype.id < 0}
			class:border-success={rtype.id < 0}>{id > 0 ? id : '?'}</span
		>
		<button class="btn btn-xs btn-error" class:hidden={!canEdit} on:click={() => dispatch('delete')}
			>-</button
		>
	</div>
	<div class="flex flex-wrap gap-3 items-center">
		<label class="input input-bordered flex items-center gap-2 w-full flex-wrap">
			<span class="text-zinc-400 hidden sm:block">Nome:</span>
			<input
				type="text"
				placeholder="Sem nome definido"
				bind:value={rtype.name}
				on:change={handleChange}
				class="grow"
				disabled={!canEdit}
			/>
			<span class="badge badge-info hidden sm:block">Opcional</span>
		</label>
		<div class="form-control">
			<label class="input-group flex gap-1 items-center">
				<span>Texto</span>
				<input
					type="color"
					bind:value={rtype.badge_text_color}
					on:change={handleChange}
					class="input input-bordered input-sm"
					disabled={!canEdit}
				/>
			</label>
		</div>
		<div class="form-control">
			<label class="input-group flex gap-1 items-center">
				<span>Fundo</span>
				<input
					type="color"
					bind:value={rtype.badge_bg_color}
					on:change={handleChange}
					class="input input-bordered input-sm"
					disabled={!canEdit}
				/>
			</label>
		</div>
		<div class="form-control">
			<label class="input-group">
				<span>Zapping</span>
				<input
					type="number"
					min="0"
					max="99999"
					bind:value={rtype.zapping_cost}
					on:change={handleChange}
					class="input input-bordered w-24 input-sm"
					disabled={!canEdit}
				/>
			</label>
		</div>
		<div class="form-control">
			<label class="input-group flex gap-1 items-center">
				<span>Bordo</span>
				<input
					type="number"
					min="0"
					max="99999"
					bind:value={rtype.board_cost}
					on:change={handleChange}
					class="input input-bordered w-24 input-sm"
					disabled={!canEdit}
				/>
			</label>
		</div>
		<div class="form-control">
			<label class="input-group flex gap-1 items-center">
				<span>Multi-viagem</span>
				<input
					type="checkbox"
					bind:checked={rtype.multi_trip}
					on:change={handleChange}
					class="checkbox"
					disabled={!canEdit}
				/>
			</label>
		</div>
	</div>
</div>
