<script>
	export let operator;
	export let regions;
</script>

<a
	class="border-[1px] shadow-sm pointer-cursor rounded-lg hover:bg-zinc-50 p-1 flex flex-col"
	href="/operators/{operator.id}-{operator.tag}"
>
	<span class="flex justify-between flex-col-reverse sm:flex-row gap-2 p-2">
		<span class="text-lg lg:text-xl font-bold">{operator.name}</span>
		{#if operator.logo_url}
			<span
				class="grow bg-left-top sm:bg-right-top bg-no-repeat bg-contain h-12"
				style="background-image: url('{operator.logo_url}'); background-size: contain; max-width: 10rem; min-width: 5rem;"
			/>
		{:else}
			<span class="h-12" />
		{/if}
	</span>
	<span class="flex flex-wrap gap-2 p-2 pt-0">
		{#if regions}
			{#if operator.regions.length > 4}
				<div class="border-b-2 border-orange-300">Nacional</div>
			{:else}
				{#each operator.regions as regionId}
					<div class="border-b-2 border-sky-300">{regions[regionId]?.name ?? '?'}</div>
				{/each}
			{/if}
		{/if}
	</span>
</a>
