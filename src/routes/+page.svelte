<script>
	import StopCheckbox from '$lib/editor/StopCheckbox.svelte';
	import { readable } from 'svelte/store';
	import { token } from '$lib/stores.js';
</script>

<svelte:head>
	<title>Intermodal - Editor</title>
	<meta name="description" content="Editor de dados do Intermodal" />
</svelte:head>

<div class="flex flex-col gap-4 w-full max-w-5xl mt-4 self-center">
	{#if !$token}
		<div class="alert alert-info shadow-lg">
			<div>
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
				Sê bem-vind@. Neste portal podes contibuir com informações em falta ou que, não estando em
				falta, acrescentam valor ao projeto.
			</div>
			<h3 class="text-lg">1 - Cria uma conta</h3>

			{#if $token}
				<div>Já tens uma conta, parabéns :)</div>
			{:else}
				<div>
					Necessitas de uma conta para poder submeter informações.
					<a href="/login" class="link">Faz uma aqui</a>.
				</div>
			{/if}
			<h3 class="text-lg">2 - O que podes editar</h3>
			<p>
				Enquanto convidado podes adicionar carateristicas às paragens e fotografias do que
				observares.<br />
				Assim que submetas novos conteúdos os mesmos podem não ficar logo visíveis. Existe um processo
				de aprovação de modificações para prevenir vandalismo.
			</p>
			<p>Estamos a estudar a concessão de mais capacidades de edição a convidados.</p>

			<h3 class="text-lg">3 - O que significam os valores</h3>
			<p>
				<StopCheckbox
					text="Carateristica verdadeira"
					description="Sabe-se que o valor é verdadeiro"
					state={readable(true)}
				/>
				<StopCheckbox
					text="Carateristica falsa"
					description="Sabe-se que o valor é falso"
					state={readable(false)}
				/>
				<StopCheckbox
					text="Carateristica desconhecida"
					description="Não se sabe o valor"
					state={readable(null)}
				/>
			</p>
			<h3 class="text-lg">4 - Condições</h3>
			<div>
				Consideram-se as submissões doadas. Naturalmente é necessário que se detenha direitos sobre
				o que se doa. (O nome de uma paragem não é sujeita a direitos de autor, uma fotografia é).
				Todas as contribuições serão disponibilizadas em formatos abertos.
			</div>
			<div class="card-actions justify-end">
				{#if !$token}
					<a class="btn btn-primary" href="/auth">Entrar</a>
				{/if}
			</div>
		</div>
	</div>
</div>
