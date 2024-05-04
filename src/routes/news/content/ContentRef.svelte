<script>
	export let data;

	export let canEdit;
</script>

<div class="bg-amber-50 rounded-lg p-2">
	<div class="flex flex-wrap gap-1">
		<span>Leia mais em</span>
		{#if data.url}
			<a class="link link-primary font-bold" href={data.url}>{data.name ?? data.url}</a>
		{:else}
			<span class="font-bold">{data.name ?? ''}</span>
		{/if}
	</div>
	{#if canEdit}
		<div class="flex py-2 gap-4 flex-wrap">
			<div class="form-control">
				<label class="input-group">
					<span>Nome</span>
					<input type="text" bind:value={data.name} class="input input-bordered" />
				</label>
			</div>
			<div class="form-control grow">
				<label class="input-group w-full">
					<span>URL</span>
					<input type="text" bind:value={data.url} class="input input-bordered grow" />
				</label>
			</div>
		</div>
	{/if}
</div>
