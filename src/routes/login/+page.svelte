<script>
	import { goto } from '$app/navigation';
	import { apiServer } from '$lib/settings.js';
	import { token } from '$lib/stores.js';

	let loginUser = null;
	let loginPassword = null;

	let registrationUser = null;
	let registrationEmail = null;
	let registrationPassword = null;
	let registrationPasswordConfirmation = null;

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
				localStorage.setItem('token', tokenVal);
				return goto('/perfil');
			});
	}

	function register() {
		if (registrationPassword !== registrationPasswordConfirmation) {
			alert('Passwords do not match');
			return;
		}

		if (registrationPassword.length < 8) {
			alert('Password must be at least 8 characters');
			return;
		}

		// Check if the email format is valid
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registrationEmail)) {
			alert('Invalid email');
			return;
		}

		fetch(`${apiServer}/v1/auth/register`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				username: registrationUser,
				password: registrationPassword,
				email: registrationEmail
			})
		}).then((r) => {
			if (r.ok) {
				alert('Registo com sucesso.');
				loginUser = registrationUser;
				loginPassword = registrationPassword;
				registrationUser = null;
				registrationEmail = null;
				registrationPassword = null;
				registrationPasswordConfirmation = null;
				login();
			} else {
				r.text()
					.then((error) => {
						alert(`Registo falhou:\n${error}`);
					})
					.catch(() => {
						alert('Registo falhou.');
					});
			}
		});
	}
</script>

<svelte:head>
	<title>Autenticação</title>
	<meta name="description" content="Autenticação" />
</svelte:head>

<div class="flex flex-col gap-4 py-4 self-center">
	<div class="card card-compact bg-base-100 shadow-md">
		<form class="card-body" on:submit|preventDefault={login}>
			<h2 class="card-title">Entrar com conta</h2>
			<div class="flex flex-wrap gap-4">
				<div class="form-control">
					<label class="input-group input-group-md">
						<span>Utilizador</span>
						<input
							id="loginUser"
							type="text"
							placeholder="HenriqueFerreira95"
							class="input input-bordered input-md"
							bind:value={loginUser}
							on:keydown={(e) => {
								if (e.key === 'Enter') {
									login();
								}
							}}
						/>
					</label>
				</div>
				<div class="form-control">
					<label class="input-group input-group-md">
						<span>Password</span>
						<input
							id="loginPassword"
							type="password"
							class="input input-bordered input-md"
							bind:value={loginPassword}
							on:keydown={(e) => {
								if (e.key === 'Enter') {
									login();
								}
							}}
						/>
					</label>
				</div>
			</div>
			<div class="card-actions justify-end">
				<button class="btn btn-primary" on:mouseup={login}>Entrar</button>
			</div>
		</form>
	</div>
	<div class="card card-compact bg-base-100 shadow-md">
		<form class="card-body" on:submit|preventDefault={register}>
			<h2 class="card-title">Registar conta</h2>
			<div class="flex flex-col gap-2">
				<div class="form-control">
					<label class="input-group input-group-md">
						<span class="w-24">Utilizador</span>
						<input
							type="text"
							placeholder="HenriqueFerreira95"
							class="input input-bordered input-md"
							bind:value={registrationUser}
						/>
					</label>
				</div>
				<div class="form-control">
					<label class="input-group input-group-md">
						<span class="w-24">E-mail</span>
						<input
							type="text"
							placeholder="henrique@mail.com"
							class="input input-bordered input-md"
							bind:value={registrationEmail}
						/>
					</label>
				</div>
			</div>
			<div class="flex flex-wrap gap-4">
				<div class="form-control">
					<label class="input-group input-group-md">
						<span class="w-24">Password</span>
						<input
							type="password"
							class="input input-bordered input-md"
							bind:value={registrationPassword}
						/>
					</label>
				</div>
				<div class="form-control">
					<label class="input-group input-group-md">
						<span>Confirmação</span>
						<input
							type="password"
							class="input input-bordered input-md"
							bind:value={registrationPasswordConfirmation}
						/>
					</label>
				</div>
			</div>
			<div class="card-actions justify-end">
				<button class="btn btn-primary">Registar</button>
			</div>
		</form>
	</div>
	<div class="card card-compact bg-base-100 shadow-md">
		<div class="card-body">
			<h2 class="card-title">Esqueci-me da minha conta</h2>
			<span>Regista outra com o mesmo email ou fala connosco</span>
		</div>
	</div>
</div>
