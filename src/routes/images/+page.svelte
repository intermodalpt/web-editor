<script>
	import { derived, writable } from 'svelte/store';
	import { liveQuery } from 'dexie';
	import { apiServer } from '$lib/settings.js';
	import { Gallery } from '$lib/images/utils.js';
	import { token } from '$lib/stores.js';
	import { fetchStops, getStops, loadMissing } from '$lib/db';
	import PicEditorWrapper from '$lib/editor/PicEditorWrapper.svelte';
	import ImageUploader from '$lib/images/ImageUploader.svelte';
	import MapImageViewer from '$lib/images/MapImageViewer.svelte';
	import StopPicsInfo from '$lib/images/StopPicsInfo.svelte';
	import PicInfo from '$lib/images/PicInfo.svelte';

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
		} else if (value === tabs.unpositioned) {
			if (unpositionedGallery.pictures.length === 0) {
				loadMoreUnpositionedStops();
			}
		}
	});

	let openPicId = writable(null);

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

	function openPicEditor(id) {
		$openPicId = id;
	}

	function closePicEditor() {
		$openPicId = null;
	}

	function selectPicHandler(e) {
		$selectedStop = null;
		$selectedPicId = e.detail.id;
	}

	function selectStopHandler(e) {
		$selectedPicId = null;
		$selectedStop = $stops[e.detail.id];
	}

	function handlePicSave(e) {
		let picture = e.detail.picture;

		fetch(`${apiServer}/v1/stop_pics/${picture.id}`, {
			headers: {
				Authorization: `Bearer ${$token}`
			}
		})
			.then((r) => r.json())
			.then((pic) => {
				let isTagged = pic.tagged;
				let isPositioned = pic.lon && pic.lat;

				if (isTagged) {
					untaggedGallery.dropPicture(picture.id);
				}

				if (isPositioned) {
					unpositionedGallery.dropPicture(picture.id);
				}

				if (isTagged && isPositioned) {
					taggedGallery.mergePictures([pic]);
					taggedGallery = taggedGallery;
				} else if (isTagged && !isPositioned) {
					unpositionedGallery.mergePictures(pic);
					unpositionedGallery = unpositionedGallery;
				} else if (!isTagged) {
					untaggedGallery.mergePictures(pic);
					untaggedGallery = untaggedGallery;
				}
				closePicEditor();
			})
			.catch((e) => {
				console.error(e);
				alert('Unable to refresh picture ' + picture.id + ' due to: ' + e.message);
			});
	}

	function handlePicDelete(e) {
		let picId = e.detail.id;

		taggedGallery.dropPicture(picId);
		untaggedGallery.dropPicture(picId);
		unpositionedGallery.dropPicture(picId);
		taggedGallery = taggedGallery;
		unpositionedGallery = unpositionedGallery;
		untaggedGallery = untaggedGallery;
	}
</script>

<svelte:head>
	<title>Intermodal - Editor - Imagens</title>
	<meta name="description" content="Catalogo de imagens" />
</svelte:head>

<div class="self-center sm:w-11/12 my-4">
	<div class="tabs ml-4">
		<span
			class="tab tab-bordered lg:tab-lifted"
			class:tab-active={$tab === tabs.map}
			on:click={() => ($tab = tabs.map)}
			on:keypress={() => ($tab = tabs.map)}>Mapa</span
		>
		<span
			class="tab tab-bordered lg:tab-lifted"
			class:tab-active={$tab === tabs.tagged}
			on:click={() => ($tab = tabs.tagged)}
			on:keypress={() => ($tab = tabs.tagged)}>Catalogadas</span
		>
		<span
			class="tab tab-bordered lg:tab-lifted"
			class:tab-active={$tab === tabs.untagged}
			on:click={() => ($tab = tabs.untagged)}
			on:keypress={() => ($tab = tabs.untagged)}>Por catalogar</span
		>
		{#if $token}
			<span
				class="tab tab-bordered lg:tab-lifted"
				class:tab-active={$tab === tabs.unpositioned}
				on:click={() => ($tab = tabs.unpositioned)}
				on:keypress={() => ($tab = tabs.unpositioned)}>Por posicionar</span
			>
		{/if}
		<span
			class="tab tab-bordered lg:tab-lifted"
			class:tab-active={$tab === tabs.upload}
			on:click={() => ($tab = tabs.upload)}
			on:keypress={() => ($tab = tabs.upload)}>Enviar</span
		>
	</div>
	<div
		class="card bg-base-100 shadow-sm border-1 card-compact"
		class:!card-compact={$tab === tabs.map}
	>
		{#if $tab === tabs.map}
			<div class="card-body">
				<MapImageViewer
					pictures={basePictures}
					{stops}
					on:selectStop={selectStopHandler}
					on:selectPic={selectPicHandler}
					compact={compactMap}
				/>
				<div class="md:px-2 pb-2">
					{#if $selectedPicId}
						<PicInfo
							picId={selectedPicId}
							{stops}
							on:edit-pic={(e) => {
								openPicEditor(e.detail.id);
							}}
							on:select-stop={(e) => {
								selectStopHandler(e);
								// TODO center
							}}
						/>
					{/if}
					{#if $selectedStop}
						<StopPicsInfo
							{selectedStop}
							{stops}
							on:select-pic={(e) => {
								selectPicHandler(e);
								// TODO center
							}}
							on:select-stop={(e) => {
								// TODO center
							}}
						/>
					{/if}
				</div>
			</div>
		{:else if $tab === tabs.tagged}
			<div class="card-body">
				<h2 class="card-title">Catalogadas</h2>
				<div class="flex flex-col items-center">
					{#if taggedGallery.pictures.length === 0}
						<span class="text-lg">Ainda não foram catalogadas imagens</span>
					{/if}
					<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-5">
						{#each taggedGallery.pictures as pic}
							<div class="p-2 flex justify-center items-center cursor-pointer">
								<img
									src={pic.url_medium}
									class="rounded-box transition-all hover:scale-125"
									alt="Tagged"
									on:click={() => {
										openPicEditor(pic.id);
									}}
									on:keypress={() => {
										openPicEditor(pic.id);
									}}
								/>
							</div>
						{/each}
					</div>
					<div
						class="btn btn-secondary w-full"
						on:click={() => loadMoreTaggedStops()}
						on:keypress={() => loadMoreTaggedStops()}
					>
						Listar mais
					</div>
				</div>
			</div>
		{:else if $tab === tabs.untagged}
			<div class="card-body">
				<h2 class="card-title">Por catalogar</h2>
				<div class="flex flex-col items-center">
					{#if untaggedGallery.pictures.length === 0}
						<span class="text-lg">Sem imagens por catalogar</span>
					{/if}
					<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-5">
						{#each untaggedGallery.pictures as pic}
							<div class="p-2 flex justify-center items-center cursor-pointer">
								<img
									src={pic.url_medium}
									class="rounded-box transition-all hover:scale-125"
									alt="Untagged"
									on:click={() => openPicEditor(pic.id)}
									on:keypress={() => openPicEditor(pic.id)}
								/>
							</div>
						{/each}
					</div>
					<div
						class="btn btn-secondary w-full"
						on:click={() => loadMoreUntaggedStops()}
						on:keypress={() => loadMoreUntaggedStops()}
					>
						Listar mais
					</div>
				</div>
			</div>
		{:else if $tab === tabs.unpositioned}
			<div class="card-body">
				<h2 class="card-title">Por posicionar</h2>
				<div class="flex flex-col items-center">
					{#if unpositionedGallery.pictures.length === 0}
						<span class="text-lg">Sem imagens por posicionar</span>
					{/if}
					<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-5">
						{#each unpositionedGallery.pictures as pic}
							<div class="p-2 flex justify-center items-center cursor-pointer">
								<img
									src={pic.url_medium}
									class="rounded-box transition-all hover:scale-105"
									alt="Unpositioned"
									on:click={() => openPicEditor(pic.id)}
									on:keypress={() => openPicEditor(pic.id)}
								/>
							</div>
						{/each}
					</div>
					<div
						class="btn btn-secondary w-full"
						on:click={() => loadMoreUnpositionedStops()}
						on:keypress={() => loadMoreUnpositionedStops()}
					>
						Listar mais
					</div>
				</div>
			</div>
		{:else if $tab === tabs.upload}
			<div class="card-body">
				<h2 class="card-title">Enviar imagens</h2>
				{#if $token}
					<ImageUploader />
				{:else}
					<p class="text-lg">Precisa de estar autenticado para enviar imagens</p>
				{/if}
			</div>
		{/if}
	</div>
</div>

{#if $openPicId}
	<PicEditorWrapper
		selectedPicId={openPicId}
		{stops}
		on:save={handlePicSave}
		on:delete={handlePicDelete}
		on:close={closePicEditor}
	/>
{/if}
