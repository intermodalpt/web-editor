<script>
	import { goto } from '$app/navigation';
	import { login } from '$lib/api';
	import { toast } from '$lib/stores';
	import Registration from './Registration.svelte';

	const tabs = {
		login: 0,
		registration: 1
	};
	let tab = tabs.login;

	let loginUser = "root";
	let loginPassword = "password";



	let isLoading = false;

	// async function handleLogin() {
	// 	// await fetch(`https://api.iml.local/iml.local/Lax/true/true/3600`, {credentials: 'include'});
	// 	// await fetch(`https://api.iml.local/api.iml.local/Lax/true/true/3600`, {credentials: 'include'});
	// 	// await fetch(`https://api.iml.local/iml.local/Lax/false/false/3600`, {credentials: 'include'});
	// 	// await fetch(`https://api.iml.local/api.iml.local/Lax/false/false/3600`, {credentials: 'include'});
	// 	fetch(`https://api.iml.local/v1/auth/login`, {
	// 		method: 'POST',
	// 		headers: { 'Content-Type': 'application/json' },
	// 		body: JSON.stringify({
	// 			username: loginUser,
	// 			password: loginPassword
	// 		}),
	// 		credentials: 'include'
	// 	})
	// 		.then((r) => {
	// 			if (r.ok) {
	// 				return r.text();
	// 			} else {
	// 				r.text()
	// 					.then((error) => {
	// 						alert(`Fracasso no acesso:\n${error}`);
	// 					})
	// 					.catch(() => {
	// 						alert('Fracasso no acesso.');
	// 					});
	// 			}
	// 		})
	// 		.then((tokenVal) => {
	// 			toast('Autenticado com sucesso');
	// 			// goto('/perfil', { invalidateAll: true });
	// 		});
	// }




	async function handleLogin() {
		if (isLoading) return;

		isLoading = true;
		await login(loginUser, loginPassword, {
			onSuccess: (res) => {
				toast('Autenticado com sucesso');
				goto('/perfil', { invalidateAll: true });
			},
			onError: (res) => {
				r.text()
					.then((error) => {
						toast(`Fracasso no acesso:\n${error}`, 'error');
					})
					.catch(() => {
						toast('Fracasso no acesso.', 'error');
					});
			},
			onAfter: () => {
				isLoading = false;
			}
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
				<button
					role="tab"
					class="tab"
					class:tab-active={tab == tabs.login}
					on:click={() => (tab = tabs.login)}
					>Conta existente
				</button>
				<button
					role="tab"
					class="tab"
					class:tab-active={tab == tabs.registration}
					on:click={() => (tab = tabs.registration)}>Registar</button
				>
			</div>

			{#if tab === tabs.login}
				<form class="flex flex-wrap gap-4" on:submit|preventDefault={handleLogin}>
					<div class="form-control grow">
						<label class="input-group input-group-md">
							<span>Utilizador</span>
							<input
								type="text"
								class="input input-bordered input-md w-full"
								bind:value={loginUser}
								on:keydown={(e) => {
									if (e.key === 'Enter') {
										handleLogin();
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
										handleLogin();
									}
								}}
							/>
						</label>
					</div>
				</form>
				<div class="card-actions justify-between items-end">
					<button class="link" on:click={showRecovery}>Recuperar conta</button>

					<div class="flex items-center gap-2">
						{#if isLoading}
							<span class="loading loading-spinner loading-md" />
						{/if}
						<button class="btn btn-primary" on:click={handleLogin} disabled={isLoading}>
							Entrar
						</button>
					</div>
				</div>
			{:else if tab === tabs.registration}
				<Registration />
			{/if}
		</div>
	</div>
</div>
