<script>
	import { createEventDispatcher } from 'svelte';
	import { derived } from 'svelte/store';
	import { token } from '$lib/stores';
	import { apiServer } from '$lib/settings';

	const dispatch = createEventDispatcher();

	export let selectedStop;

	const stopPics = derived(selectedStop, ($selectedStop, set) => {
		if (!$selectedStop) {
			return;
		}

		fetch(`${apiServer}/v1/stops/${$selectedStop.id}/pictures/all`, { credentials: 'include' })
			.then((r) => r.json())
			.then((r) => {
				set(r);
			});
	});
</script>

{#if $stopPics}
	<span class="card-title"
		>Fotografias de

		<button
			class="badge badge-lg badge-secondary cursor-pointer whitespace-nowrap"
			on:click={() => {
				dispatch('select-stop', { id: $selectedStop.id });
			}}
		>
			{$selectedStop?.id}: {$selectedStop?.short_name || $selectedStop?.name}
		</button></span
	>
	{#if $stopPics.length === 0}
		<span class="text-lg">Sem fotografias associadas</span>
	{/if}
	<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
		{#each $stopPics as pic}
			<button
				class="p-2 flex justify-center items-center cursor-pointer"
				on:click={() => {
					dispatch('select-pic', { id: pic.id });
				}}
			>
				<img
					src={pic.url_medium}
					alt="Fotografia de paragem"
					class="rounded-box transition-all hover:scale-105"
				/>
			</button>
		{/each}
	</div>
{/if}
