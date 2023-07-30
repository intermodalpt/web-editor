<script>
	import { derived, writable } from 'svelte/store';
	import ImageEditor from '$lib/editor/ImageEditor.svelte';
	import ImageUploader from '$lib/images/ImageUploader.svelte';
	import MapImageViewer from '$lib/images/MapImageViewer.svelte';
	import StopPicsInfo from '$lib/images/StopPicsInfo.svelte';
	import PicInfo from '$lib/images/PicInfo.svelte';
	import { apiServer } from '$lib/settings.js';
	import { token } from '$lib/stores.js';
	import { fetchStops, getStops, loadMissing } from '$lib/db';
	import { liveQuery } from 'dexie';

	const basePictures = writable([]);
	const stops = liveQuery(() => getStops());

	async function loadData() {
		await Promise.all([
			fetchStops(),
			fetch(`${apiServer}/v1/stop_pics/map`)
				.then((r) => r.json())
				.then((r) => {
					$basePictures = r;
				})
		]);
	}

	loadData().then(async () => {
		console.log('data loaded');
		await loadMissing();
	});

	const tabs = {
		map: 0,
		tagged: 1,
		untagged: 2,
		unpositioned: 3,
		upload: 4
	};

	const tab = writable(tabs.map);

	const selectedStop = writable(null);
	const selectedPicId = writable(null);
	const compactMap = derived([selectedStop, selectedPicId], ([$selectedStop, $selectedPicId]) => {
		return $selectedStop || $selectedPicId;
	});

	class Gallery {
		constructor(asc = true, pageSize = defaultPageSize) {
			this.pageSize = pageSize;
			this.asc = asc;
			this.pictures = [];
			this.seenIds = new Set();
		}

		mergePictures(pictures) {
			const newPictures = pictures.filter((pic) => {
				return !this.seenIds.has(pic.id);
			});

			newPictures.forEach((pic) => {
				this.seenIds.add(pic.id);
			});

			let hasUploadDate = pictures[0]?.upload_date || this.pictures[0]?.upload_date;

			if (hasUploadDate) {
				this.pictures = this.pictures
					.concat(newPictures)
					.sort((a, b) =>
						this.asc
							? (a.capture_date || a.upload_date).localeCompare(b.capture_date || b.upload_date)
							: (b.capture_date || b.upload_date).localeCompare(a.capture_date || a.upload_date)
					);
			} else {
				this.pictures = this.pictures.concat(newPictures).sort((a, b) => (this.asc ? a.id - b.id : b.id - a.id));
			}
		}

		get nextPage() {
			return this.pictures.length / this.pageSize;
		}
	}

	let taggedGallery = new Gallery(false);
	let untaggedGallery = new Gallery(false);
	let unpositionedGallery = new Gallery(true);

	tab.subscribe((value) => {
		if (value !== tabs.map) {
			$selectedStop = null;
			$selectedPicId = null;
		}

		if (value === tabs.tagged) {
			if (taggedGallery.pictures.length === 0) {
				loadMoreTaggedStops();
			}
		} else if (value === tabs.untagged) {
			if (untaggedGallery.pictures.length === 0) {
				loadMoreUntaggedStops();
			}
		}
	});

	let uploadModal = false;
	let openImage = writable(null);
	const defaultPageSize = 20;

	function pagesToFetch(page) {
		let pages = [];
		if (Math.floor(page) !== page) {
			pages.push(Math.floor(page));
			pages.push(Math.floor(page) + 1);
		} else {
			pages.push(Math.floor(page));
		}
		return pages;
	}

	function loadMoreTaggedStops() {
		let pages = pagesToFetch(taggedGallery.nextPage);

		Promise.all(
			pages.map((page) => {
				return fetch(`${apiServer}/v1/stop_pics/latest?tagged_only=true&p=${page}`, {
					headers: {
						authorization: `Bearer ${$token}`
					}
				}).then((r) => r.json());
			})
		)
			.then((pages) => {
				let pictures = [];
				pages.forEach((results) => {
					pictures = pictures.concat(results);
				});
				taggedGallery.mergePictures(pictures);
				taggedGallery = taggedGallery;
			})
			.catch((e) => {
				console.error(e);
				alert('Unable to load tagged pictures: ' + e.message);
			});
	}

	function loadMoreUntaggedStops() {
		let pages = pagesToFetch(untaggedGallery.nextPage);

		Promise.all(
			pages.map((page) => {
				return fetch(`${apiServer}/v1/stop_pics/latest?untagged_only=true&p=${page}`, {
					headers: {
						authorization: `Bearer ${$token}`
					}
				}).then((r) => r.json());
			})
		)
			.then((pages) => {
				let pictures = [];
				pages.forEach((results) => {
					pictures = pictures.concat(results);
				});
				untaggedGallery.mergePictures(pictures);
				untaggedGallery = untaggedGallery;
			})
			.catch((e) => {
				console.error(e);
				alert('Unable to load tagged pictures: ' + e.message);
			});
	}

	function loadMoreUnpositionedStops() {
		let pages = pagesToFetch(unpositionedGallery.nextPage);

		Promise.all(
			pages.map((page) => {
				return fetch(`${apiServer}/v1/stop_pics/unpositioned?p=${page}`, {
					headers: {
						authorization: `Bearer ${$token}`
					}
				}).then((r) => r.json());
			})
		)
			.then((pages) => {
				let pictures = [];
				pages.forEach((results) => {
					pictures = pictures.concat(results);
				});
				unpositionedGallery.mergePictures(pictures);
				unpositionedGallery = unpositionedGallery;
			})
			.catch((e) => {
				console.error(e);
				alert('Unable to load tagged pictures: ' + e.message);
			});
	}

	function openPic(id) {
		$openImage = untaggedStopPictures[id];
	}

	function close() {
		uploadModal = false;
		$openImage = null;
		untaggedStopPictures = untaggedStopPictures;
	}

	function selectPicHandler(e) {
		$selectedStop = null;
		$selectedPicId = e.detail.id;
	}

	function selectStopHandler(e) {
		$selectedPicId = null;
		$selectedStop = $stops[e.detail.id];
	}
</script>

<svelte:head>
	<title>Intermodal - Editor - Imagens</title>
	<meta name="description" content="Catalogo de imagens" />
</svelte:head>

<div class="self-center w-11/12 my-4">
	<div class="tabs ml-4">
		<a
			class="tab tab-md xl:tab-lg tab-lifted"
			class:tab-active={$tab === tabs.map}
			on:click={() => {
				$tab = tabs.map;
			}}>Mapa</a
		>
		<a
			class="tab tab-md xl:tab-lg tab-lifted"
			class:tab-active={$tab === tabs.tagged}
			on:click={() => {
				$tab = tabs.tagged;
			}}>Catalogadas</a
		>
		<a
			class="tab tab-md xl:tab-lg tab-lifted"
			class:tab-active={$tab === tabs.untagged}
			on:click={() => {
				$tab = tabs.untagged;
			}}>Por catalogar</a
		>
		<a
			class="tab tab-md xl:tab-lg tab-lifted"
			class:tab-active={$tab === tabs.unpositioned}
			on:click={() => {
				$tab = tabs.unpositioned;
			}}>Por posicionar</a
		>
		<a
			class="tab tab-md xl:tab-lg tab-lifted"
			class:tab-active={$tab === tabs.upload}
			on:click={() => {
				$tab = tabs.upload;
			}}>Enviar</a
		>
	</div>
	<div class="card bg-base-100 shadow-sm border-1" class:card-compact={$tab === tabs.map}>
		{#if $tab === tabs.map}
			<div class="card-body">
				<MapImageViewer
					pictures={basePictures}
					{stops}
					on:selectStop={selectStopHandler}
					on:selectPic={selectPicHandler}
					compact={compactMap}
				/>
				{#if $selectedPicId}
					<PicInfo picId={selectedPicId} {stops} />
				{/if}
				{#if $selectedStop}
					<StopPicsInfo {selectedStop} {stops} />
				{/if}
			</div>
		{:else if $tab === tabs.tagged}
			<div class="card-body">
				<h2 class="card-title">Catalogadas</h2>
				<div class="flex flex-col items-center">
					{#if taggedGallery.pictures.length === 0}
						<span class="text-lg">Ainda não foram catalogadas imagens</span>
					{/if}
					<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-8">
						{#each taggedGallery.pictures as pic}
							<div class="p-2 flex justify-center items-center cursor-pointer">
								<img
									src={pic.url_medium}
									class="rounded-box transition-all hover:scale-105"
									on:click={() => {
										openPic(pic.id);
									}}
								/>
							</div>
						{/each}
					</div>
					<div class="btn btn-secondary w-full" on:click={() => loadMoreTaggedStops()}>
						Listar mais
					</div>
				</div>
			</div>
		{:else if $tab === tabs.untagged}
			<div class="card-body">
				<h2 class="card-title">Por catalogar</h2>
				<div class="flex flex-col items-center">
					{#if untaggedGallery.pictures.length === 0}
						<span class="text-lg">Não há imagens por catalogar</span>
					{/if}
					<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-8">
						{#each untaggedGallery.pictures as pic}
							<div class="p-2 flex justify-center items-center cursor-pointer">
								<img
									src={pic.url_medium}
									class="rounded-box transition-all hover:scale-105"
									on:click={() => {
										openPic(pic.id);
									}}
								/>
							</div>
						{/each}
					</div>
					<div class="btn btn-secondary w-full" on:click={() => loadMoreUntaggedStops()}>
						Listar mais
					</div>
				</div>
			</div>
		{:else if $tab === tabs.unpositioned}
			<div class="card-body">
				<h2 class="card-title">Por posicionar</h2>
				<div class="flex flex-col items-center">
					{#if unpositionedGallery.pictures.length === 0}
						<span class="text-lg">Não há imagens por posicionar</span>
					{/if}
					<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-8">
						{#each unpositionedGallery.pictures as pic}
							<div class="p-2 flex justify-center items-center cursor-pointer">
								<img
									src={pic.url_medium}
									class="rounded-box transition-all hover:scale-105"
									on:click={() => {
										openPic(pic.id);
									}}
								/>
							</div>
						{/each}
					</div>
					<div class="btn btn-secondary w-full" on:click={() => loadMoreUnpositionedStops()}>
						Listar mais
					</div>
				</div>
			</div>
		{:else if $tab === tabs.upload}
			<div class="card-body">
				<h2 class="card-title">Enviar imagens</h2>
				<ImageUploader />
			</div>
		{/if}
	</div>
</div>

{#if $openImage}
	<ImageEditor image={openImage} on:close={close} />
{/if}
