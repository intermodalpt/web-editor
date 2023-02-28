<script>
	import { apiServer } from '$lib/settings';
	import { token } from '$lib/stores';
	import { createEventDispatcher } from 'svelte';
	import { writable } from 'svelte/store';

	/** @type {import('./$types').PageData} */
	export let data;

	const dispatch = createEventDispatcher();

	let files = [];
	let uploading = false;
	let uploadCount = 0;

	async function upload() {
		uploading = true;
		for (let x = 0; x < files.length; x++) {
			const formData = new FormData();
			formData.append('images[]', files[x]);
			let res = await fetch(`${apiServer}/v1/stop_pics/dangling`, {
				method: 'POST',
				body: formData,
				headers: {
					authorization: `Bearer ${$token}`
				}
			})
				.then(() => {
					uploadCount += 1;
					return true;
				})
				.catch(() => {
					alert("Something wrong didn't go right");
					uploading = false;
					return false;
				});
			if (!res) {
				break;
			}
		}
		uploading = false;
	}
</script>

<svelte:head>
	<title>Intermodal - Enviar fotografias</title>
	<meta name="description" content="Envio de fotografias para o Intermodal" />
</svelte:head>

<div class="card bg-base-100 shadow-md w-full max-w-5xl mt-4 self-center">
	<div class="card-body">
		<div class="flex justify-between">
			<h2 class="card-title">Enviar imagens</h2>
			<a href="/images" class="link link-error">Voltar</a>
		</div>
		{#if uploading}
			<span>Envio em progresso</span><br />

			<div class="font-bold">A enviar {uploadCount} de {files.length}</div>
		{:else}
			<div class="flex flex-col gap-1 ">
				{#if files && files[0]}
					{#each files as file, i}
						<div class="flex flex-row justify-between items-center">
							<div class="font-bold">{file.name}</div>
						</div>
					{/each}
				{:else}
				<div class="text-base-content text-bold opacity-50 p-2">
					Escolha alguns ficheiros para começar
				</div>
				{/if}
			</div>

			<label for="dropzone-file" class="float-left mt-3 btn btn-primary">
				Escolher ficheiros
				<input bind:files multiple accept="image/*" id="dropzone-file" type="file" class="hidden" />
			</label>
			<div
				class="btn float-right mt-3 btn-secondary {files && files[0] ? '' : 'btn-disabled'}"
				on:click={upload}
			>
				Enviar
			</div>
		{/if}
	</div>
</div>
