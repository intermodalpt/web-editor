<script lang="ts">
	import Menu from '../Menu.svelte';

	export let data;
	const permissions = data.permissions;
</script>

<div class="card-body">
	<Menu {data} page="perms" />
	<div class="flex flex-col gap-4">
		{#each Object.entries(permissions) as [scope, perms]}
			{#if Object.keys(perms).length > 0}
				<div>
					<h3 class="text-lg">{scope}</h3>
					<div class="flex gap-4 ml-4 flex-wrap max-w-full">
						{#each Object.entries(perms) as [key, val]}
							<div class="flex items-start">
								<span>{key}</span>
								{#if val}
									<i class="bg-success p-1 rounded-full"></i>
								{:else}
									<i class="bg-error p-1 rounded-full"></i>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/each}
	</div>
</div>
