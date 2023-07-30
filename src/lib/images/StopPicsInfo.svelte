<script>
	import { derived } from 'svelte/store';
	import { token } from '$lib/stores';
	import { apiServer } from '$lib/settings';

	export let stops;
	export let selectedStop;

	const stopPics = derived(selectedStop, ($selectedStop, set) => {
		if (!$selectedStop) {
			return;
		}

		fetch(`${apiServer}/v1/stops/${$selectedStop.id}/pictures/all`, {
			headers: {
				authorization: `Bearer ${$token}`
			}
		})
			.then((r) => r.json())
			.then((r) => {
				set(r);
			});
	});

	function picClickHandler(picId) {
		console.log('picClickHandler', picId);
	}
</script>

{#if $stopPics}
	<span class="card-title">Paragem selecionada</span>

	<span class="badge badge-lg badge-secondary">
		{$selectedStop?.id}: {$selectedStop?.short_name ||
			$selectedStop?.name ||
			$selectedStop?.official_name ||
			$selectedStop?.osm_name}
	</span>

	<span class="card-title">Fotografias</span>
	{#if $stopPics.length === 0}
		<span class="text-lg">Sem fotografias associadas</span>
	{/if}
	<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
		{#each $stopPics as pic}
			<div class="p-2 flex justify-center items-center cursor-pointer">
				<img
					src={pic.url_medium}
					class="rounded-box transition-all hover:scale-105"
					on:click={() => {
						picClickHandler(pic.id);
					}}
				/>
			</div>
		{/each}
	</div>
{/if}
