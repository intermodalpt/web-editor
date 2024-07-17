<script>
	import { apiServer } from '$lib/settings';
	import { token } from '$lib/stores';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let stopId;

	const captureSupported = document.createElement('input').capture != undefined;

	let files = [];

	let uploadQueue = [];
	let pendingUploadCount = 0;

	$: updatePendingFiles(files);

	function updatePendingFiles(files) {
		let newFiles = [];

		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			if (
				uploadQueue.some(
					(uploaded) =>
						uploaded.file.lastModified === file.lastModified &&
						uploaded.file.name === file.name &&
						uploaded.file.size === file.size
				)
			) {
				continue;
			}

			newFiles.push({
				file,
				isUploaded: false,
				isUploading: false,
				isConflict: false,
				isError: false
			});
		}

		uploadQueue = [...uploadQueue, ...newFiles];
		updatePendingCount();
	}

	function updatePendingCount() {
		pendingUploadCount = uploadQueue.filter(
			(entry) => !(entry.isUploaded || entry.isConflict)
		).length;
	}

	let uploading = false;

	async function upload() {
		uploading = true;
		dispatch('upload-begin');

		for (const entry of uploadQueue) {
			if (entry.isUploaded) continue;

			entry.isUploading = true;

			const formData = new FormData();
			formData.append('images[]', entry.file);
			const url = stopId
				? `${apiServer}/v1/stop_pics/linked/${stopId}`
				: `${apiServer}/v1/stop_pics/dangling`;

			try {
				let res = await fetch(url, {
					method: 'POST',
					body: formData,
					headers: {
						authorization: `Bearer ${$token}`
					}
				});

				entry.isUploading = false;

				// HTTP 200 means successful upload
				// HTTP 409 means successful upload and conflict
				// Every other http 4xx or 5xx means error
				if (res) {
					entry.isUploaded = res.status === 200 || res.status === 409;
					entry.isConflict = res.status === 409;
					entry.isError = res.status >= 400 && res.status < 600 && res.status !== 409;
				}

				const json = await res.json();
				if (json.message) {
					entry.error = json.message;
				}

				if (entry.isUploaded && !entry.isConflict && !entry.isError) {
					dispatch('new-pic', { pic: json });
				}
			} catch (e) {
				entry.isUploading = false;
				console.error('Error parsing response', e);
			}

			// Force update
			uploadQueue = uploadQueue;
		}

		dispatch('upload-end');

		uploading = false;
		updatePendingCount();
	}
</script>

<div class="flex flex-col gap-1">
	{#if uploadQueue.length > 0}
		{#each uploadQueue as entry, i}
			<div class="w-full border-2 rounded-md p-2 relative flex gap-2">
				{#if entry.isUploading}
					<span class="loading loading-spinner loading-xs" />
				{:else}
					<div
						class="w-4 rounded-md border-2"
						class:bg-success={entry.isUploaded && !entry.isConflict && !entry.isError}
						class:bg-warning={entry.isUploaded && entry.isConflict && !entry.isError}
						class:bg-error={entry.isUploaded && !entry.isConflict && entry.isError}
					/>
				{/if}
				<div class="grow flex flex-col">
					<div class="font-semibold">
						{entry.file.name}
					</div>
					{#if entry.isError}
						<div>
							Erro ao enviar: {entry.error}
						</div>
					{/if}
				</div>
				{#if !uploading && !entry.isUploaded}
					<div
						class="btn btn-error btn-circle btn-xs"
						on:click={() => {
							uploadQueue = uploadQueue.filter((_, index) => index !== i);
							updatePendingCount();
						}}
					>
						✕
					</div>
				{/if}
			</div>
		{/each}
	{:else}
		<div class="text-base-content text-bold opacity-50 p-2">
			Escolha alguns ficheiros para começar
		</div>
	{/if}
</div>

<div class="flex flex-wrap gap-2">
	<label for="dropzone-file" class="grow mt-3 btn btn-primary" class:hidden={!captureSupported}>
		📷 Tirar uma fotografia
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
		📁 Adicionar da galeria
		<input bind:files multiple accept="image/*" id="dropzone-file-2" type="file" class="hidden" />
	</label>
</div>
<button
	class="btn float-right mt-3 btn-primary"
	class:btn-disabled={uploading || pendingUploadCount === 0}
	on:click={upload}
>
	{#if uploading}
		<span class="loading loading-spinner loading-xs" /> A enviar
	{:else}
		Enviar
	{/if}
</button>
