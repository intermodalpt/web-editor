<script>
	import { createEventDispatcher } from 'svelte';

	const PAGE_SHORTCUTS = 2;
	const dispatch = createEventDispatcher();

	export let page = 0;
	export let pageSize = 25;
	export let itemCount = 0;

	$: pageCount = Math.ceil(itemCount / pageSize);


	const range = (start, stop) => Array.from({ length: stop - start + 1 }, (_, i) => start + i);
    
	$: prePageShortcuts = page < 1 ? [] : range(Math.max(0, page - PAGE_SHORTCUTS), page - 1);
	$: postPageShortcuts =
		page >= pageCount - 1 ? [] : range(page + 1, Math.min(pageCount - 1, page + PAGE_SHORTCUTS));
</script>

<div>
	<div class="flex justify-center gap-2">
		<button
			class="btn btn-ghost btn-sm"
			disabled={page === 0}
			on:click={() => dispatch('goto', { page: page - 1 })}
		>
			«
		</button>

		{#if page > PAGE_SHORTCUTS}
			<button
				class="btn btn-ghost btn-circle btn-sm"
				on:click={() => dispatch('goto', { page: 0 })}
			>
				1
			</button>
		{/if}
		{#if page > PAGE_SHORTCUTS + 1}
			<span>...</span>
		{/if}

		{#each prePageShortcuts as shortcutPage}
			<button
				class="btn btn-ghost btn-circle btn-sm"
				on:click={() => dispatch('goto', { page: shortcutPage })}
			>
				{shortcutPage + 1}
			</button>
		{/each}

		<span class="btn btn-active btn-circle btn-sm">
			{page + 1}
		</span>

		{#each postPageShortcuts as shortcutPage}
			<button
				class="btn btn-ghost btn-circle btn-sm"
				on:click={() => dispatch('goto', { page: shortcutPage })}
			>
				{shortcutPage + 1}
			</button>
		{/each}

		{#if page < pageCount - PAGE_SHORTCUTS - 2}
			<span>...</span>
		{/if}
		{#if page < pageCount - PAGE_SHORTCUTS - 1}
			<button
				class="btn btn-ghost btn-circle btn-sm"
				on:click={() => dispatch('goto', { page: pageCount - 1 })}
			>
				{pageCount}
			</button>
		{/if}

		<button
			class="btn btn-ghost btn-sm"
			disabled={page === pageCount - 1}
			on:click={() => dispatch('goto', { page: page + 1 })}
		>
			»
		</button>
	</div>
</div>
