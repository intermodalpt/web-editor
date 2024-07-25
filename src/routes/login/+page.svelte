<script>
	import { goto } from '$app/navigation';
	import { apiServer } from '$lib/settings.js';
	import { token } from '$lib/stores.js';
	import Registration from './Registration.svelte';

	const tabs = {
		login: 0,
		registration: 1
	};
	let tab = tabs.registration;

	let loginUser = null;
	let loginPassword = null;

	function login() {
		fetch(`${apiServer}/v1/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				username: loginUser,
				password: loginPassword
			})
		})
			.then((r) => {
				if (r.ok) {
					return r.text();
				} else {
					r.text()
						.then((error) => {
							alert(`Fracasso no acesso:\n${error}`);
						})
						.catch(() => {
							alert('Fracasso no acesso.');
						});
				}
			})
			.then((tokenVal) => {
				$token = tokenVal;
				// TODO Set this in a store, not directly in localStorage
				localStorage.setItem('token', tokenVal);
				return goto('/perfil');
			});
	}

	function showRecovery() {
		alert('Recuperação de conta não implementada');
	}
</script>

<svelte:head>
	<title>Autenticação</title>
	<meta name="description" content="Autenticação" />
</svelte:head>

<div class="flex flex-col gap-4 py-4 self-center max-w-[50em] w-full">
	<div class="card card-compact bg-base-100 shadow-sm">
		<div class="card-body">
			<div role="tablist" class="tabs tabs-bordered tabs-xl mb-4">
				<a
					role="tab"
					class="tab tab-bordered"
					class:tab-active={tab == tabs.login}
					on:click={() => (tab = tabs.login)}>Conta existente</a
				>
				<a
					role="tab"
					class="tab tab-bordered"
					class:tab-active={tab == tabs.registration}
					on:click={() => (tab = tabs.registration)}>Registar</a
				>
			</div>

			{#if tab === tabs.login}
				<form class="flex flex-wrap gap-4" on:submit|preventDefault={login}>
					<div class="form-control grow">
						<label class="input-group input-group-md">
							<span>Utilizador</span>
							<input
								type="text"
								class="input input-bordered input-md w-full"
								bind:value={loginUser}
								on:keydown={(e) => {
									if (e.key === 'Enter') {
										login();
									}
								}}
							/>
						</label>
					</div>
					<div class="form-control grow">
						<label class="input-group input-group-md">
							<span>Password</span>
							<input
								type="password"
								class="input input-bordered input-md w-full"
								bind:value={loginPassword}
								on:keydown={(e) => {
									if (e.key === 'Enter') {
										login();
									}
								}}
							/>
						</label>
					</div>
				</form>
				<div class="card-actions justify-between items-end">
					<button class="link" on:click={showRecovery}>Recuperar conta</button>
					<button class="btn btn-primary" on:click={login}>Entrar</button>
				</div>
			{:else if tab === tabs.registration}
				<Registration />
			{/if}
		</div>
	</div>
</div>
