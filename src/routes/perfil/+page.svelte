<script>
	import { decodedToken } from '$lib/stores.js';
	import { getStops } from '$lib/db';
	import { writable } from 'svelte/store';
	import ChangeViewer from '$lib/changes/ChangeViewer.svelte';

	/** @type {import('./$types').PageData} */
	export let data;

	const stops = writable({});

	getStops().then((res) => {
		stops.set(res);
	});
</script>

<svelte:head>
	<title>Perfil</title>
	<meta name="description" content="Perfil" />
</svelte:head>

<div class="flex flex-col gap-4 py-4">
	<div class="card card-compact self-center bg-base-100 shadow-sm w-full max-w-[900px]">
		<div class="card-body">
			<h2 class="card-title">
				{$decodedToken.uname}<span class="text-xs">(#{$decodedToken.uid})</span>
			</h2>
			<table class="table table-compact">
				<thead><tr><td>Permissões</td><td /></tr></thead>
				<tbody>
					<tr>
						<td>Edição de paragens</td>
						{#if $decodedToken.permissions.is_admin}
							<td class="text-success font-bold">Sim</td>
						{:else}
							<td class="text-warning font-bold">Moderado</td>
						{/if}
					</tr>
					<tr>
						<td>Colocação de fotografias</td>
						<td class="text-success font-bold">Sim</td>
					</tr>
					<tr>
						<td>Editar partidas</td>
						{#if $decodedToken.permissions.is_admin || $decodedToken.permissions.can_edit_departures}
							<td class="text-success font-bold">Sim</td>
						{:else}
							<td class="text-error font-bold">Não</td>
						{/if}
					</tr>
					<tr>
						<td>Ver perfis de outras pessoas</td>
						{#if $decodedToken.permissions.is_admin}
							<td class="text-success font-bold">Sim</td>
						{:else}
							<td class="text-error font-bold">Não</td>
						{/if}
					</tr>
					{#if $decodedToken.permissions.is_admin}
						<tr>
							<td>Administrador</td>
							<td class="text-success font-bold">Sim</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<div class="card card-compact self-center bg-base-100 shadow-sm w-full max-w-[900px]">
		<div class="card-body">
			<h2 class="card-title">Alterações pendentes</h2>
			{#await data.undecidedContributions}
				A carregar
			{:then undecidedContributions}
				{#if undecidedContributions.length === 0}
					Sem contribuições pendentes.
				{/if}
				<ul>
					{#each undecidedContributions as contribution}
						<li>
							<h2 class="card-title text-lg">
								#{contribution.id}
								{new Date(contribution.submission_date).toString().split(' GMT')[0]}
							</h2>
							<ChangeViewer change={contribution.change} {stops} />
							{#if contribution.comment}
								<h4 class="font-bold">Comentário:</h4>
								<textarea disable class="w-full">{contribution.comment}</textarea>
							{/if}
						</li>
					{/each}
				</ul>
			{:catch error}
				Erro a carregar a informação
			{/await}
		</div>
	</div>
	<div class="card card-compact self-center bg-base-100 shadow-sm w-full max-w-[900px]">
		<div class="card-body">
			<h2 class="card-title">Contribuições aceites</h2>
			{#await data.decidedContributions}
				A carregar
			{:then decidedContributions}
				{#if decidedContributions.length === 0}
					Sem contribuições aceites.
				{/if}
				<ul>
					{#each decidedContributions as contribution}
						<li>
							<h2 class="card-title text-lg">
								#{contribution.id}
								{new Date(contribution.submission_date).toString().split(' GMT')[0]}
							</h2>
							<ChangeViewer change={contribution.change} {stops} />
							{#if contribution.comment}
								<h4 class="font-bold">Comentário:</h4>
								<textarea disable class="w-full">{contribution.comment}</textarea>
							{/if}
						</li>
					{/each}
				</ul>
			{:catch error}
				Erro a carregar a informação
			{/await}
		</div>
	</div>
</div>
