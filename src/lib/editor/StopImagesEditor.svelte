<script>
	import { createEventDispatcher, tick } from 'svelte';
	import { writable, derived } from 'svelte/store';
	import { apiServer } from '$lib/settings.js';
	import { token, decodedToken } from '$lib/stores.js';
	import ImageEditor from '$lib/editor/ImageEditor2.svelte';

	const POSITION_REQUIRED = false;

	export let stops;

	export let stop;
	export let stopPictures;
	export let newPictures;

	const dispatch = createEventDispatcher();

	// Uploader vars
	let files = [];
	let uploading = false;
	let uploadDone = false;
	let uploadCount = 0;
	let sendingPictures = false;
	const selectedImageId = writable(null);

	let currentImageHasChanges = false;

	const editedStopPictures = derived(stopPictures, ($stopPictures) => {
		if ($stopPictures == null) return [];
		return $stopPictures.map((pic) => {
			const position = !(pic.lon == null || pic.lat == null);
			const visibility = pic.tagged;
			const quality = pic.tagged;
			const stops = pic.stops != null && pic.stops.length > 0;
			const total = !(POSITION_REQUIRED && !position) && visibility && quality && stops;
			const fixable =
				!total &&
				(pic.uploader === $decodedToken?.permissions?.uid || $decodedToken?.permissions?.is_admin);

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
	});

	function resetUploader() {
		files = [];
		uploading = false;
		uploadDone = false;
		uploadCount = 0;
	}

	async function upload() {
		uploadCount = 0;
		uploading = true;
		for (let x = 0; x < files.length; x++) {
			const formData = new FormData();
			formData.append('images[]', files[x]);
			let res = await fetch(`${apiServer}/v1/stop_pics/linked/${$stop.id}`, {
				method: 'POST',
				body: formData,
				headers: {
					authorization: `Bearer ${$token}`
				}
			})
				.then((res) => res.json())
				.then((pic) => {
					uploadCount += 1;

					pic.metaCompleteness = {
						position: false,
						visibility: false,
						quality: false,
						stops: true,
						total: false,
						fixable: true
					};
					$newPictures.push(pic);
					return true;
				})
				.catch((e) => {
					alert('Uma imagem falhou no seu upload');
					uploading = false;
				});
			if (!res) {
				break;
			}
		}
		$newPictures = $newPictures;
		uploading = false;
		uploadDone = true;
	}

	function closeEditor() {
		if (
			$editedStopPictures.some((pic) => pic.modified) ||
			$newPictures.some((pic) => !pic.metaCompleteness.total)
		) {
			if (!confirm('Tem alterações pendentes. Se sair, estas poderão ser perdidas.')) {
				return;
			}
		}
		dispatch('save');
	}

	async function gotoPicture(picture) {
		if (currentImageHasChanges) {
			if (!confirm('Descartar alterações à imagem atual?')) {
				return;
			}
		}

		currentImageHasChanges = false;
		$selectedImageId = picture.id;
	}
</script>

<div
	class="fixed top-0 bottom-0 left-0 right-0 p-2 bg-white z-20 grid grid-cols-1 overflow-y-scroll gap-2 bg-base-300"
	style="grid-template-rows: auto auto 1fr;"
>
	<div class="flex gap-3 justify-end">
		<input
			type="button"
			class="btn btn-secondary btn-sm"
			value="Enviar"
			on:click={() => (sendingPictures = true)}
		/>
		<input type="button" class="btn btn-error btn-sm" value="Fechar" on:click={closeEditor} />
	</div>
	<!-- FIXME this min-h is an hack to prevent things from collapsing when the layout is pressured -->
	<div class="flex gap-2 overflow-x-scroll min-h-[80px] lg:min-h-[120px]">
		{#each $editedStopPictures as picture}
			<div class="relative">
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
					class="rounded-box transition-all h-24 lg:h-32 max-w-xl border-primary cursor-pointer"
					class:border-b-4={$selectedImageId === picture.id}
					on:click={async () => await gotoPicture(picture)}
				/>
			</div>
		{/each}
		{#each $newPictures as picture}
			<div class="relative">
				{#if picture.metaCompleteness.total}
					<span
						class="absolute bottom-0 right-0 text-success-content bg-success rounded-full w-8 h-8 text-center text-lg"
						>✓</span
					>
				{:else}
					<span
						class="absolute bottom-0 right-0 bg-error text-error-content rounded-full w-8 h-8 text-center text-lg cursor-pointer"
						>X</span
					>
				{/if}
				<img
					src={picture.url_medium}
					class="rounded-box transition-all h-24 lg:h-32 max-w-xl border-primary cursor-pointer"
					class:border-b-4={$selectedImageId === picture.id}
					on:click={async () => await gotoPicture(picture)}
				/>
			</div>
		{/each}
	</div>
	<div class="bg-base-100 border-base-300 border-2 rounded-md shadow-sm flex justify-center">
		<div class="max-w-[100em] p-2">
			{#if $selectedImageId}
				<ImageEditor
					imageId={selectedImageId}
					{stops}
					on:save={() => {
						// HACK - this is a hack to force the stop pics to update
						$stop.modTimestamp = new Date();
						$stop = $stop;
						currentImageHasChanges = false;
						dispatch('save');
					}}
					on:change={(e) => {
						currentImageHasChanges = e.detail.fromOriginal;
					}}
					on:delete={() => {
						// HACK - this is a hack to force the stop pics to update
						// $stop.modTimestamp = new Date();
						// $stop = $stop;
						currentImageHasChanges = false;
					}}
				/>
			{:else if $newPictures.length > 0 || $stopPictures.length > 0}
				<span class="text-xl">Selecione uma fotografia a editar</span>
			{:else}
				<span class="text-xl">Envie uma fotografia para poder catalogar</span>
			{/if}
		</div>
	</div>
</div>

<div class="modal" class:modal-open={sendingPictures}>
	<div class="modal-box w-11/12 max-w-3xl">
		<div class="card card-compact self-center">
			<div class="card-body">
				<div class="flex justify-between">
					<h2 class="card-title">Enviar imagens</h2>
					<span
						class="link link-error"
						on:click={() => {
							resetUploader();
							sendingPictures = false;
						}}>Voltar</span
					>
				</div>
				{#if uploading}
					<span>Envio em progresso</span><br />
					<div class="font-bold">A enviar {uploadCount} de {files.length}</div>
				{:else}
					<div class="flex flex-col gap-1">
						{#if files && files[0]}
							<h3 class="text-md">
								{#if files.length > 1}
									Fotografias escolhidas
								{:else}
									Fotografia escolhida
								{/if}
							</h3>
							{#each files as file, i}
								<div class="flex flex-row justify-between items-center">
									<div class="font-bold">{file.name}</div>
								</div>
							{/each}
						{:else}
							<div class="text-base-content text-bold opacity-50 p-2">
								Escolha a fotografia que quer enviar
							</div>
						{/if}
					</div>
					{#if uploadDone && uploadCount > 0}
						<div class="btn float-right mt-3 btn-secondary" on:click={resetUploader}>
							Enviar mais imagens
						</div>
						<div
							class="btn float-right mt-3 btn-neutral"
							on:click={() => {
								resetUploader();
								sendingPictures = false;
							}}
						>
							Voltar
						</div>
					{:else}
						<div class="flex flex-wrap gap-2">
							<label for="dropzone-file" class="grow mt-3 btn btn-primary">
								{#if files && files[0]}
									📷 Alterar fotografia
								{:else}
									📷 Tirar fotografia
								{/if}
								<input
									bind:files
									multiple
									capture="environment"
									accept="image/*"
									id="dropzone-file"
									type="file"
									class="hidden"
								/>
							</label>
							<label for="dropzone-file-2" class="grow mt-3 btn btn-primary">
								📁 Escolher da galeria
								<input
									bind:files
									multiple
									accept="image/*"
									id="dropzone-file-2"
									type="file"
									class="hidden"
								/>
							</label>
						</div>
						<div
							class="btn float-right mt-3 btn-secondary {files && files[0] ? '' : 'btn-disabled'}"
							on:click={upload}
						>
							Submeter
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>
</div>
