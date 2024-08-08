<script lang="ts">
	export let outline;
</script>

<div class="flex items-center gap-2">
	<label>
		Size:
		<input
			type="number"
			class="input input-bordered input-xs w-16"
			bind:value={outline.size}
		/>
	</label>
	<input type="color" class="input input-xs" bind:value={outline.color} />
	<label>
		O:
		<input
			type="number"
			class="input input-bordered input-xs"
			min="0"
			max="1"
			step="0.1"
			bind:value={outline.opacity}
		/>
	</label>
</div>
