<script>
	import StopImageEditor from '$lib/editor/StopImageEditor.svelte';
	import { imageRoot } from '$lib/settings.js';
	import { writable } from 'svelte/store';
	import { apiServer } from '$lib/settings.js';
	import { token } from '$lib/stores.js';

	/** @type {import('./$types').PageData} */
	export let data;

	let uploadModal = false;
	let openImage = writable(null);
	const pageSize = 20;

	// Map of all untagged stops
	let untaggedStopPictures = Object.fromEntries(
		data.untagged.map((stop) => {
			return [stop.id, stop];
		})
	);

	$: orderedUntaggedPictures = Object.values(untaggedStopPictures).sort((a, b) =>
		(a.capture_date || a.upload_date).localeCompare(b.capture_date || b.upload_date)
	);

	function loadMoreUntaggedStops() {
		let page = Object.keys(untaggedStopPictures).length / pageSize;
		let pages = [];
		if (Math.floor(page) !== page) {
			pages.push(Math.floor(page));
			pages.push(Math.floor(page) + 1);
		} else {
			pages.push(Math.floor(page));
		}

		Promise.all(
			pages.map((page) => {
				return fetch(`${apiServer}/v1/tagging/stops/untagged?p=${page}`, {
					headers: {
						authorization: `Bearer ${$token}`
					}
				}).then((r) => r.json());
			})
		)
			.then((pages) => {
				pages.forEach((results) => {
					results.forEach((image) => {
						image.stops = [];
					});
					for (let image of results) {
						untaggedStopPictures[image.id] = image;
					}
					untaggedStopPictures = untaggedStopPictures;
				});
			})
			.catch(() => alert('Unable to load untagged stops'));
	}

	function openPic(id) {
		$openImage = untaggedStopPictures[id];
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

<div class="flex flex-col gap-4 max-w-5xl mt-4 self-center">
	<div class="flex justify-end">
		<a class="btn btn-primary" href="/images/upload">Enviar mais imagens</a>
	</div>
	<div class="card bg-base-100 shadow-xl">
		<div class="card-body">
			<h2 class="card-title">Por Catalogar</h2>
			<div class="flex flex-col items-center">
				{#if Object.keys(untaggedStopPictures).length === 0}
					<span class="text-lg">Não há imagens por catalogar</span>
				{/if}
				<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
					{#each orderedUntaggedPictures as pic}
						<div class="p-2 flex justify-center items-center cursor-pointer">
							<!-- {pic.id};{pic.capture_date} -->
							<img
								src="{imageRoot}/medium/{pic.sha1}/preview"
								class="rounded-box transition-all hover:scale-105"
								on:click={() => {
									openPic(pic.id);
								}}
							/>
						</div>
					{/each}
				</div>
				<div class="btn btn-primary w-full" on:click={() => loadMoreUntaggedStops()}>
					Listar mais
				</div>
			</div>
		</div>
	</div>

	<div class="card bg-base-100 shadow-xl self-center w-full">
		<div class="card-body">
			<h2 class="card-title">Catalogadas</h2>
			<div class="flex flex-col items-center">Por fazer</div>
		</div>
	</div>
</div>

{#if $openImage}
	<StopImageEditor image={openImage} on:close={close} />
{/if}
