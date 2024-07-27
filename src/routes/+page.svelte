<script>
	import { isAuthenticated } from '$lib/stores';
	import { version, registrationsEnabled } from '$lib/settings';
	import { wipeCachedData, loadMissing } from '$lib/db';
	import Icon from '$lib/components/Icon.svelte';
	import gitlab from '$lib/icons/brands/gitlab.svg';
	import github from '$lib/icons/brands/github.svg';
	import mastodon from '$lib/icons/brands/mastodon.svg';

	let cacheRebuilding = false;

	async function wipeCache() {
		cacheRebuilding = true;
		wipeCachedData().then(async () => {
			cacheRebuilding = false;
			alert('Cache limpa');
			await loadMissing();
		});
	}
</script>

<svelte:head>
	<title>Intermodal - Editor</title>
	<meta name="description" content="Editor de dados do Intermodal" />
</svelte:head>

<div class="flex flex-col gap-4 w-[min(960px,100%)] mt-4 self-center">
	{#if !$isAuthenticated}
		<div class="alert alert-info shadow-md">
			<div class="flex">
				<Icon name="info" class="stroke-current flex-shrink-0 w-6 h-6" />
				<span>Editar requer uma conta autenticada.</span>
			</div>
		</div>
	{/if}
	{#if !registrationsEnabled}
		<div class="alert alert-warning shadow-sm">
			<div class="flex">
				<Icon name="info" class="stroke-current flex-shrink-0 w-6 h-6" />
				<span>Os registos encontram-se temporáriamente desativados.</span>
			</div>
		</div>
	{/if}

	<div class="card card-compact bg-base-100 shadow-sm">
		<div class="card-body">
			<h1 class="card-title">Sê bem vind@</h1>
			<div>Esta ferramenta permite a consulta aprofundada e alteração dos dados do Intermodal.</div>
			<h3 class="text-lg">Quem pode editar?</h3>
			<p>Qualquer um pode ajudar o projeto mas nem todas as informações são editáveis.</p>
			<p>
				Todas as contribuições serão disponibilizadas em formatos abertos e enviadas para projetos
				como o OpenStreetMap.
			</p>
			<h3 class="text-lg">Comunica!</h3>
			<p>
				Esta é uma solução em desenvolvimento. Fala connosco sobre o que queiras. Seja para reportar
				problemas ou sugerir soluções. Os nossos contactos estão na página principal do projeto.
			</p>
		</div>
	</div>
</div>
<span class="grow"></span>
<footer
	class="footer p-10 bg-base-300 text-base-content rounded-t-xl w-[min(960px,100%)] self-center"
>
	<!-- <nav>
		<h6 class="footer-title">Sub-projetos</h6>
		<a class="link link-hover" href="https://intermodal.pt/">Página principal</a>
		<a class="link link-hover" href="https://biblioteca.intermodal.pt/">Biblioteca</a>
		<a class="link link-hover" href="https://forum.intermodal.pt/">Forum</a>
	</nav> -->
	<nav>
		<h6 class="footer-title">Informações</h6>
		<a class="link link-hover" href="https://intermodal.pt/sobre">Sobre nós</a>
		<a class="link link-hover" href="/termos-de-servico">Termos de Serviço</a>
		<a class="link link-hover" href="/politica-de-privacidade">Politica de Privacidade</a>
	</nav>
	<nav>
		<h6 class="footer-title">Projetos amigos</h6>
		<a href="https://openstreetmap.org" target="_blank" class="link link-hover">OpenStreetMap</a>
		<a href="https://lisboaparapessoas.pt" target="_blank" class="link link-hover"
			>Lisboa Para Pessoas</a
		>
		<a href="https://ansol.org/" target="_blank" class="link link-hover">ANSOL</a>
	</nav>
	<nav class="md:justify-self-end justify-between self-stretch flex flex-col-reverse md:flex-col">
		<div>
			<span class="text-xs">V:{version}</span>
			<button
				class="btn btn-neutral btn-outline btn-xs"
				on:click={wipeCache}
				disabled={cacheRebuilding}
			>
				Limpar dados
				{#if cacheRebuilding}
					<Icon name="spinner" class="animate-spin -ml-1 mr-3 h-5 w-5" />
				{/if}
			</button>
		</div>
		<span class="grow"></span>
		<div class="grid grid-flow-col gap-4">
			<a href="https://ciberlandia.pt/@intermodal">
				<img src={mastodon} class="w-10 drop-shadow-sm" alt="Mastodon" />
			</a>
			<a href="https://gitlab.com/intermodalpt">
				<img src={gitlab} class="w-10 drop-shadow-sm" alt="Gitlab" />
			</a>
			<a href="https://github.com/intermodalpt">
				<img src={github} class="w-10 drop-shadow-sm" alt="Github" />
			</a>
		</div>
	</nav>
</footer>
