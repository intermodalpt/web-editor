<script>
	import { token } from '$lib/stores';
	import { version } from '$lib/settings';
	import { wipeCachedData, loadMissing } from '$lib/db';
	import Icon from '../lib/components/Icon.svelte';

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

<div class="flex flex-col gap-4 w-full max-w-5xl mt-4 self-center">
	{#if !$token}
		<div class="alert alert-info shadow-lg">
			<div class="flex">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					class="stroke-current flex-shrink-0 w-6 h-6"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/></svg
				>
				<span>Editar requer uma conta autenticada.</span>
			</div>
		</div>
	{/if}

	<div class="card card-compact bg-base-100 shadow-lg">
		<div class="card-body">
			<h1 class="card-title">Contribuir</h1>
			<div>
				Sê bem-vind@. Neste portal podes contribuir com informações em falta ou que, não estando em
				falta, acrescentam valor ao projeto.
			</div>

			{#if !$token}
				<h3 class="text-lg">Cria uma conta</h3>
				<div>
					Necessitas de uma conta para poder submeter informações.
					<a href="/login" class="link">Faz uma aqui</a>.
				</div>
			{/if}
			<h3 class="text-lg">O que podes editar</h3>
			<p>
				Enquanto convidado podes adicionar caraterísticas às paragens e fotografias do que
				observares.<br />
				Assim que submetas novos conteúdos os mesmos podem não ficar logo visíveis. Existe um processo
				de aprovação de modificações para prevenir vandalismo.
			</p>
			<p>Estamos a estudar a concessão de mais capacidades de edição a convidados.</p>
			<h3 class="text-lg">Condições</h3>
			<div>
				Consideram-se as submissões doadas. Naturalmente é necessário que se detenha direitos sobre
				o que se doa. (O nome de uma paragem não é sujeita a direitos de autor, uma fotografia é).
				Todas as contribuições serão disponibilizadas em formatos abertos e eventualmente exportadas
				para projectos como o OpenStreetMap.
			</div>
			<h3 class="text-lg">Avisa-nos dos problemas que encontres</h3>
			<p>
				Esta é uma solução em desenvolvimento. Avisa-nos de qualquer problema que encontres.<br />
				Muitos dos problemas que temos encontrado tem a ver com dados antigos. Caso tenhas um problema
				experimenta carregar no botão abaixo e tentar novamente.
			</p>
			<div>
				<button
					class="btn btn-neutral"
					on:click={wipeCache}
					disabled={cacheRebuilding}
				>
					{#if cacheRebuilding}
						<svg
							class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							/>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							/>
						</svg>
					{/if}
					Limpar dados
				</button>
			</div>
		</div>
	</div>
	<div class="flex justify-end">
		<span class="text-xs">V:{version}</span>
	</div>
</div>
