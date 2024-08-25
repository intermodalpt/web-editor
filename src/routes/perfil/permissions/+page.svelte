<script lang="ts">
	import Menu from '../Menu.svelte';
	import TokenInfo from './TokenInfo.svelte';
	import { changePassword, createManagementToken, getManagementTokens } from '$lib/api';

	export let data;
	const permissions = data.permissions;

	// --- Tokens

	let knownTokens: any[] | null = null;
	let newToken: any;

	let newTokenName: string = '';
	let isTokenCreating = false;

	async function handleCreateToken() {
		newTokenName = newTokenName.trim();

		isTokenCreating = true;

		await createManagementToken(newTokenName, {
			onSuccess: (token) => {
				toast('Token criado', 'success');
				newTokenName = '';

				if (knownTokens) {
					knownTokens.push(token);
				} else {
					newToken = token;
				}
			},
			onError: () => {
				toast('Erro ao criar o token.', 'error');
			},
			onAfter: () => {
				isTokenCreating = false;
			},
			toJson: true
		});
	}

	async function loadCurrentTokens() {
		await getManagementTokens({
			onSuccess: (tokens) => {
				knownTokens = tokens;
				newToken = null;
			},
			onError: () => {
				toast('Erro ao carregar os tokens.', 'error');
			},
			toJson: true
		});
	}
</script>

<Menu {data} page="perms" />

<div class="card-body">
	<div class="flex flex-col gap-4">
		{#each Object.entries(permissions) as [scope, perms]}
			{#if Object.keys(perms).length > 0}
				<div>
					<h3 class="text-lg">{scope}</h3>
					<div class="flex gap-4 ml-4 flex-wrap max-w-full">
						{#each Object.entries(perms) as [key, val]}
							<div class="flex items-start">
								<span>{key}</span>
								{#if val}
									<i class="bg-success p-1 rounded-full"></i>
								{:else}
									<i class="bg-error p-1 rounded-full"></i>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/each}
	</div>
</div>


<hr />
<div class="card-body">
	<h2 class="card-title">Autenticação programática</h2>
	{#if knownTokens}
		{#each knownTokens as token}
			<TokenInfo {token} />
		{/each}
	{:else}
		<div class="bg-base-200 h-32 w-full rounded-3xl flex justify-center">
			<div class="self-center">
				<span>Tokens ocultos</span>
				<button class="btn btn-neutral btn-outline btn-sm" on:click={loadCurrentTokens}
					>Mostrar</button
				>
			</div>
		</div>
		{#if newToken}
			<hr />
			<TokenInfo token={newToken} />
		{/if}
	{/if}
	<h2 class="text-lg">Novo autenticador</h2>
	<div class="flex gap-2">
		<label class="input input-bordered flex items-center gap-2 grow">
			Nome
			<input type="text" class="grow" bind:value={newTokenName} />
		</label>
		<button
			type="submit"
			class="btn btn-primary"
			disabled={isTokenCreating}
			on:click={handleCreateToken}
		>
			Criar
		</button>
	</div>
</div>
