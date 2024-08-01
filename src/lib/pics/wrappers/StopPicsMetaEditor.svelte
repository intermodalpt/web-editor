<script>
	import { createEventDispatcher } from 'svelte';
	import { writable, derived } from 'svelte/store';
	import { apiServer } from '$lib/settings';
	import { isAuthenticated, permissions, uid } from '$lib/stores';
	import PicMetaEditor from '$lib/pics/PicMetaEditor.svelte';
	import PicUploader from '$lib/pics/PicUploader.svelte';

	const POSITION_REQUIRED = false;

	export let stops;

	export let stop;

	const dispatch = createEventDispatcher();

	let sendingPictures = false;
	let selectedImageId = null;

	let currentImageHasChanges = false;

	const stopPicturesNonce = writable(Date.now());
	const editedStopPictures = derived(
		[stop, stopPicturesNonce],
		([$stop, $stopPicturesNonce], set) => {
			if (!$stop) {
				return [];
			}

			let req = $isAuthenticated
				? fetch(`${apiServer}/v1/stops/${$stop.id}/pictures/all`, { credentials: 'include' })
				: fetch(`${apiServer}/v1/stops/${$stop.id}/pictures`);

			req
				.then((r) => r.json())
				.then((pictureList) => {
					pictureList = pictureList.map((pic) => {
						const position = !(pic.lon == null || pic.lat == null);
						const visibility = pic.tagged;
						const quality = pic.tagged;
						const stops = pic.stops != null && pic.stops.length > 0;
						const total = !(POSITION_REQUIRED && !position) && visibility && quality && stops;
						const fixable =
							!total &&
							((pic.uploader === $uid && $permissions?.stopPics?.modifyOwn) ||
								$permissions?.stopPics?.modifyOthers);

						pic.metaCompleteness = {
							position: position,
							visibility: visibility,
							quality: quality,
							stops: stops,
							total: total,
							fixable: fixable
						};
						pic.modified = false;

						return pic;
					});
					if (selectedImageId && pictureList.find((pic) => pic.id === selectedImageId) == null) {
						selectedImageId = null;
						currentImageHasChanges = false;
					}
					set(pictureList);
				});
		}
	);

	function closeEditor() {
		if ($editedStopPictures?.some((pic) => pic.modified)) {
			if (!confirm('Tem alterações pendentes. Se sair, estas poderão ser perdidas.')) {
				return;
			}
		}
		dispatch('close');
	}

	function gotoPicture(picture) {
		if (currentImageHasChanges) {
			if (!confirm('Descartar alterações à imagem atual?')) {
				return;
			}
		}

		currentImageHasChanges = false;
		selectedImageId = picture.id;
	}
</script>

<div
	class="fixed top-0 bottom-0 left-0 right-0 z-20 grid grid-cols-1 gap-1 bg-base-300 grid-rows-[auto_1fr]"
>
	<div class="flex justify-between bg-base-100 p-1 shadow-sm">
		<span class="px-2 font-semibold text-lg">{$stop?.name}</span>
		<div class="flex gap-3">
			<button class="btn btn-secondary btn-sm" on:click={() => (sendingPictures = true)}
				>Enviar</button
			>
			<button class="btn btn-error btn-sm" on:click={closeEditor}>Fechar</button>
		</div>
	</div>
	<div
		class="p-2 grid gap-2 bg-base-300 grid-rows-[auto_1fr] md:grid-cols-[auto_1fr] overflow-y-scroll"
	>
		<!-- FIXME this h-24 is there to prevent the row from collapse when the layout is pressured -->
		<div class="md:h-full md:overflow-y-scroll w-full max-w-full overflow-x-hidden h-24">
			<div class="flex md:flex-col gap-2 w-full max-w-full overflow-x-scroll">
				{#each $editedStopPictures || [] as picture}
					<button class="relative" on:click={() => gotoPicture(picture)}>
						{#if picture.metaCompleteness.total || !picture.metaCompleteness.fixable}
							<span
								class="absolute bottom-0 right-0 text-success-content bg-success rounded-full w-8 h-8 text-center text-lg"
								>✓</span
							>
						{:else if !picture.metaCompleteness.total && picture.metaCompleteness.fixable}
							<span
								class="absolute bottom-0 right-0 text-warning-content bg-warning rounded-full w-8 h-8 text-center text-lg"
								>!</span
							>
						{:else}
							<span
								class="absolute bottom-0 right-0 bg-error text-error-content rounded-full w-8 h-8 text-center text-lg cursor-pointer"
								>X</span
							>
						{/if}
						<img
							src={picture.url_medium}
							alt="Miniatura"
							class="rounded-box transition-all h-24 md:h-auto md:w-40 max-w-xl border-primary cursor-pointer"
							class:border-b-4={selectedImageId === picture.id}
							on:click={() => gotoPicture(picture)}
						/>
					</button>
				{/each}
			</div>
		</div>
		<div
			class="bg-base-100 border-base-300 border-2 rounded-lg shadow-sm flex justify-center md:h-full md:overflow-y-scroll"
		>
			<div class="max-w-[100em] p-2">
				{#if selectedImageId}
					{#key selectedImageId}
						<PicMetaEditor
							imageId={selectedImageId}
							{stops}
							on:save={() => {
								currentImageHasChanges = false;
								$stopPicturesNonce = Date.now();
								dispatch('save');
							}}
							on:change={(e) => {
								currentImageHasChanges = e.detail.fromOriginal;
							}}
							on:delete={() => {
								currentImageHasChanges = false;
								dispatch('delete');
							}}
						/>
					{/key}
				{:else if $editedStopPictures && $editedStopPictures.length > 0}
					<span class="text-xl">Selecione uma fotografia a editar</span>
				{:else}
					<span class="text-xl">Envie uma fotografia para poder catalogar</span>
				{/if}
			</div>
		</div>
	</div>
</div>

<div class="modal" class:modal-open={sendingPictures}>
	<div class="modal-box w-11/12 max-w-3xl">
		<div class="card card-compact self-center">
			<div class="card-body">
				<div class="flex justify-between">
					<h2 class="card-title">Enviar imagens</h2>
					<button class="link link-error" on:click={() => (sendingPictures = false)}>Voltar</button>
				</div>
				<PicUploader
					stopId={$stop?.id}
					on:new-pic={() => ($stopPicturesNonce = Date.now())}
					on:upload-end={() => {
						dispatch('upload');
					}}
				/>
			</div>
		</div>
	</div>
</div>
