<script>
	export let token;
</script>

{#if token}
	<div class="flex flex-col gap-y-1 px-2 py-1 border-2 rounded-lg">
		<span class="font-bold">{token.name}</span>
		<input class="input input-bordered" type="text" value={token?.token} readonly disabled />
		<div class="flex justify-between align-middle ml-1 flex-wrap">
			<span class="text-xs">{token.id}</span>
			{#if token.revoked}
				<span class="badge badge-error badge-xs">Revogado</span>
			{:else}
				<div class="flex gap-2">
					<span class="badge badge-success badge-outline">Válido</span>
					<button class="btn btn-error btn-xs">Revogar</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
