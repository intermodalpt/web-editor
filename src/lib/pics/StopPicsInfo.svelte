<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { derived } from 'svelte/store';
	import { apiServer } from '$lib/settings';
	import { toast } from '$lib/stores';
	import { getPicsForStop } from '$lib/api';

	const dispatch = createEventDispatcher();

	export let stop;

	let stopPics;

	onMount(async () => {
		stopPics = await getPicsForStop(stop.id, {
			onError: () => {
				toast('Erro ao carregar fotografias', 'error');
			},
			toJson: true
		});
	});
</script>

<span class="text-xl font-bold"
	>Fotografias de
	<button
		class="badge badge-lg badge-secondary cursor-pointer whitespace-nowrap"
		on:click={() => {
			dispatch('select-stop', { id: stop.id });
		}}
		>{stop?.id}: {stop?.short_name || stop?.name}
	</button></span
>
{#if stopPics}
	{#if stopPics.length === 0}
		<span class="text-lg">Sem fotografias associadas</span>
	{/if}

	<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
		{#each stopPics as pic}
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
