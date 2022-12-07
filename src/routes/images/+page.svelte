<script>
	import StopImageEditor from '$lib/editor/StopImageEditor.svelte';
	import { writable } from 'svelte/store';

	/** @type {import('./$types').PageData} */
	export let data;

	let uploadModal = false;
	let openImage = writable(null);

	let untaggedStopPictures = [];

	function openPic(id) {
		$openImage = data.untagged.find((stop) => {
			return stop.id === id;
		});
	}

	function close() {
		uploadModal = false;
		$openImage = null;
		untaggedStopPictures = untaggedStopPictures;
	}
</script>

<svelte:head>
	<title>Intermodal - Editor - Imagens</title>
	<meta name="description" content="Catalogo de imagens" />
</svelte:head>

<div class="card bg-base-100 shadow-xl max-w-5xl mt-4 self-center">
	<div class="card-body">
		<h2 class="card-title">Por Catalogar</h2>

		<div class="flex flex-col items-center">
			{#if data.untagged.length === 0}
				<span class="text-lg">Não há imagens por catalogar</span>
			{/if}
			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
				{#each data.untagged as picture}
					{#if !picture.tagged}
						<div class="p-2 flex justify-center items-center cursor-pointer">
							<img
								src="https://intermodal-storage-worker.claudioap.workers.dev/medium/{picture.sha1}/preview"
								class="rounded-box transition-all hover:scale-105"
								on:click={() => {
									openPic(picture.id);
								}}
							/>
						</div>
					{/if}
				{/each}
			</div>

			<div class="card-actions justify-end">
				{#if data.untagged.length > 0}
					<div class="btn btn-primary" on:click={() => loadMoreUntaggedStops()}>Load more</div>
				{/if}
				<a class="btn btn-primary" href="/images/upload">Enviar imagens</a>
			</div>
		</div>
	</div>
</div>
{#if $openImage}
	<StopImageEditor image={openImage} on:close={close} />
{/if}
