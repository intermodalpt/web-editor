<script>
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let canEdit;

	export let id;
	export let name;
	export let zapping_cost;
	export let board_cost;
	export let multi_trip;
	export let badge_text_color;
	export let badge_bg_color;
</script>

<div class="flex flex-col gap-2">
	<div class="flex justify-between">
		<span class="bg-base-200 rounded-md px-2 py-1">{id > 0 ? id : '?'}</span>
		<button class="btn btn-xs btn-error" class:hidden={!canEdit} on:click={() => dispatch('delete')}
			>-</button
		>
	</div>
	<div class="flex flex-wrap gap-2">
		<div class="form-control w-full">
			<label class="input-group">
				<span class="w-36">Nome (opc)</span>
				<input
					type="text"
					bind:value={name}
					on:change={() => dispatch('change')}
					class="input input-bordered w-full input-sm"
					disabled={!canEdit}
				/>
			</label>
		</div>
		<div class="form-control">
			<label class="input-group">
				<span>Texto</span>
				<input
					type="color"
					bind:value={badge_text_color}
					on:change={() => dispatch('change')}
					class="input input-bordered input-sm"
					disabled={!canEdit}
				/>
			</label>
		</div>
		<div class="form-control">
			<label class="input-group">
				<span>Fundo</span>
				<input
					type="color"
					bind:value={badge_bg_color}
					on:change={() => dispatch('change')}
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
					bind:value={zapping_cost}
					on:change={() => dispatch('change')}
					class="input input-bordered w-24 input-sm"
					disabled={!canEdit}
				/>
			</label>
		</div>
		<div class="form-control">
			<label class="input-group">
				<span>Bordo</span>
				<input
					type="number"
					min="0"
					max="99999"
					bind:value={board_cost}
					on:change={() => dispatch('change')}
					class="input input-bordered w-24 input-sm"
					disabled={!canEdit}
				/>
			</label>
		</div>
		<div class="form-control">
			<label class="input-group">
				<span class="w-32">Multi-viagem</span>
				<input
					type="checkbox"
					bind:checked={multi_trip}
					on:change={() => dispatch('change')}
					class="checkbox"
					disabled={!canEdit}
				/>
			</label>
		</div>
	</div>
</div>
