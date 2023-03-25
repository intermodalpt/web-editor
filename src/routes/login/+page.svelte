<script>
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
					alert('Login failed');
					return;
				}
			})
			.then((tokenVal) => {
				$token = tokenVal;
				localStorage.setItem('token', tokenVal);
				console.log(tokenVal);
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
			// Tell the user whether the request suceeded or not
			if (r.status === 200) {
				alert('Registration successful. Try to login with it');
				// TODO auto login
				registrationUser = null;
				registrationEmail = null;
				registrationPassword = null;
				registrationPasswordConfirmation = null;
			} else {
				alert('Registration failed');
			}
		});
	}
</script>

<svelte:head>
	<title>Autenticação</title>
	<meta name="description" content="Autenticação" />
</svelte:head>

<div class="flex flex-col gap-4 py-4 self-center max-w-[900px]">
	<div class="card card-compact bg-base-100 shadow-xl">
		<div class="card-body">
			<h2 class="card-title">Entrar com conta</h2>

			<div class="flex gap-4">
				<div class="form-control">
					<label class="input-group input-group-md">
						<span>Username</span>
						<input
							id="loginUser"
							type="text"
							placeholder="HenriqueCimento123"
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
		</div>
	</div>
	<div class="card card-compact bg-base-100 shadow-xl">
		<div class="card-body">
			<h2 class="card-title">Registar conta</h2>
			<div class="flex flex-col gap-2">
				<div class="form-control">
					<label class="input-group input-group-md">
						<span class="w-24">Username</span>
						<input
							type="text"
							placeholder="HenriqueCimento123"
							class="input input-bordered input-md"
							bind:value={registrationUser}
						/>
					</label>
				</div>
				<div class="form-control">
					<label class="input-group input-group-md">
						<span class="w-24">Email</span>
						<input
							type="text"
							placeholder="henrique@xmail.com"
							class="input input-bordered input-md"
							bind:value={registrationEmail}
						/>
					</label>
				</div>
			</div>
			<div class="flex gap-4">
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
				<button class="btn btn-primary" on:mouseup={register}>Registar</button>
			</div>
		</div>
	</div>
	<div class="card card-compact bg-base-100 shadow-xl">
		<div class="card-body">
			<h2 class="card-title">Esqueci-me da minha conta</h2>
			<span>Regista outra com o mesmo email ou fala connosco</span>
		</div>
	</div>
</div>
