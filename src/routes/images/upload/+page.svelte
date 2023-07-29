<script>
	import ImageUploader from '$lib/images/ImageUploader.svelte';
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
		<ImageUploader />
	</div>
</div>