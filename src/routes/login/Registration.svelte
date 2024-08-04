<script>
	import { goto } from '$app/navigation';
	import { isValidEmail } from '$lib/utils';
	import { checkUsername, getCaptcha, register as registerCall } from '$lib/api';
	import { toast } from '$lib/stores';
	import Icon from '$lib/components/Icon.svelte';
	import Survey from '$lib/components/Survey.svelte';

	let step = 0;

	let username = null;
	let email = null;
	let password = null;
	let passwordConfirmation = null;

	let usernameTouched = false;
	let usernameAvailable = null;
	let checkingUsername = false;
	$: checkUsernameAvailability(username);

	let emailTouched = false;
	$: isValidEmailFormat = isValidEmail(email ?? '');
	$: {
		if ((email ?? '').length > 0) emailTouched = true;
	}

	let passwordTouched = false;
	let passwordConfirmationTouched = false;
	$: {
		if ((password ?? '').length > 0) passwordTouched = true;
		if ((passwordConfirmation ?? '').length > 0) passwordConfirmationTouched = true;
	}
	$: isValidPassword = password && password.length >= 7;

	let surveyData;

	let copyrightAck = false;
	let privacyAck = false;
	let termsAck = false;

	$: consent = {
		copyright: copyrightAck,
		terms: termsAck,
		privacy: termsAck,
		privacySimplified: privacyAck
	};

	$: registration = {
		username,
		email,
		password,
		survey: surveyData,
		consent,
		captcha: {
			uuid: captcha?.uuid,
			answer: captchaConfirmation
		}
	};

	let captcha;
	let captchaConfirmation;
	let captchaConfirmationTouched = false;
	$: {
		if (captchaConfirmation) captchaConfirmationTouched = true;
	}

	let isProcessing = false;

	async function reloadCaptcha() {
		await getCaptcha({
			onSuccess: async (res) => {
				const json = res.json();
				captcha = json;
			},
			onError: () => {
				toast('Erro ao obter captcha', 'error');
			}
		});
	}

	async function nextStep() {
		if (step == 1) {
			if (!usernameTouched) {
				usernameTouched = true;
				usernameAvailable = false;
				toast('Nome de utilizador vazio', 'error');
				return;
			}

			if (!usernameAvailable) {
				toast('O nome de utilizador não está disponível', 'error');
				return;
			}

			if (!emailTouched) {
				emailTouched = true;
				isValidEmailFormat = false;
				toast('Email vazio', 'error');
				return;
			}

			if (!isValidEmailFormat) {
				toast('O formato do email não é válido', 'error');
				return;
			}

			if (!passwordTouched) {
				passwordTouched = true;
				toast('Password vazia', 'error');
				return;
			}

			if (!isValidPassword) {
				toast('A password deve ter pelo menos 7 caracteres', 'error');
				return;
			}

			if (password !== passwordConfirmation) {
				passwordConfirmationTouched = true;
				toast('A password não coincide com a confirmação', 'error');
				return;
			}
		} else if (step == 3) {
			if (!privacyAck || !copyrightAck || !termsAck) {
				toast('Deve de aceitar os compromissos', 'error');
				return;
			}

			if (!captchaConfirmation) {
				toast('Deve de preencher o captcha', 'error');
				return;
			}

			await register();
			return;
		}

		if (step === 2 && !captcha) {
			await reloadCaptcha();
		}
		step++;
	}

	function previousStep() {
		step--;
	}

	async function register() {
		isProcessing = true;
		await registerCall(registration, {
			onSuccess: () => {
				toast('Registo com sucesso', 'success');
				goto('/perfil');
			},
			onError: async (e) => {
				await reloadCaptcha();
				toast(`Registo falhou`, 'error');
			},
			onAfter: () => {
				isProcessing = false;
			}
		});
	}

	async function checkUsernameAvailability(testedUsername) {
		if (!testedUsername) {
			usernameAvailable = false;
			checkingUsername = false;
			return;
		}

		if (!usernameTouched && testedUsername.length > 0) {
			usernameTouched = true;
		}

		checkingUsername = true;

		await checkUsername(testedUsername, {
			onSuccess: async (res) => {
				let resJson = await res.json();

				if (username != testedUsername) {
					return;
				}
				checkingUsername = false;
				usernameAvailable = resJson === 'available';
			},
			onError: () => {
				toast('Erro a verificar disponibilidade do utilizador', 'error');
			}
		});
	}
</script>

{#if step === 0}
	<h2 class="text-lg">Registo</h2>
	<p>
		Vamos pedir algumas informações sobre si. Umas essênciais, outras suplementares para nos ajudar
		a saber quem temos na comunidade. Nas suplementares, preenche consoante se sinta confortável.
	</p>
	<p>Nenhum dos seus dados pessoais será partilhado ou utilizado para comunicação em massa.</p>
{:else if step === 1}
	<h2 class="text-lg">Escolha as suas credenciais</h2>
	<label
		id="registrationUsername"
		class="input input-bordered flex items-center gap-2 grow"
		class:input-error={usernameTouched && !usernameAvailable && !checkingUsername}
	>
		Utilizador
		<input type="text" class="grow" placeholder="exemplo: j.silva123" bind:value={username} />
	</label>
	<label
		id="registrationEmail"
		class="input input-bordered flex items-center gap-2 grow"
		class:input-error={emailTouched && !isValidEmailFormat}
	>
		Email
		<input type="text" class="grow" placeholder="exemplo: j.silva123@mail.com" bind:value={email} />
	</label>
	<label
		class="input input-bordered flex items-center gap-2 grow"
		class:input-error={passwordTouched && !isValidPassword}
	>
		Password
		<input id="registrationPassword" type="password" class="grow" bind:value={password} />
	</label>
	<label
		class="input input-bordered flex items-center gap-2 grow"
		class:input-error={passwordTouched &&
			passwordConfirmationTouched &&
			password != passwordConfirmation}
	>
		Confirmação
		<input
			type="password"
			class="grow"
			placeholder="Repita a password"
			bind:value={passwordConfirmation}
		/>
	</label>
{:else if step === 2}
	<h2 class="text-lg">Demografia</h2>
	<span class="text-xs">
		Todos os campos nesta página são <b>opcionais</b> e não serão partilhados.<br />
		Servem para nos ajudar a perceber quem temos na comunidade.
	</span>
	<Survey bind:data={registration.survey} />
{:else if step === 3}
	<h2 class="text-lg">Compromissos</h2>
	<label class="flex items-start gap-2">
		<input
			bind:checked={privacyAck}
			type="checkbox"
			class="checkbox"
			class:checkbox-error={!privacyAck}
			class:checkbox-success={privacyAck}
		/>
		<div class="flex flex-col">
			<p>
				Entendo que as minhas informações pessoais servem para uma melhor perceção da comunidade.<br
				/>
				Confirmo que são verdadeiras e entendo que:
			</p>
			<ul class="ml-3 list-disc">
				<li><b>Não</b> serão partilhadas com terceiros.</li>
				<li><b>Não</b> serão utilizadas para efeitos comerciais.</li>
				<li>Serão apagadas a pedido.</li>
			</ul>
			<span></span>
		</div>
	</label>
	<label class="flex items-start gap-2">
		<input
			bind:checked={copyrightAck}
			type="checkbox"
			class="checkbox"
			class:checkbox-error={!copyrightAck}
			class:checkbox-success={copyrightAck}
		/>
		Não submeterei conteúdo que não me pertence e considero os conteúdos submetidos como doados.
	</label>
	<label class="flex items-start gap-2">
		<input
			bind:checked={termsAck}
			type="checkbox"
			class="checkbox"
			class:checkbox-error={!termsAck}
			class:checkbox-success={termsAck}
		/>
		<span>
			Li e concordo com as páginas
			<a class="link link-primary" href="/termos-de-servico" target="_blank">termos de serviço</a> e
			<a class="link link-primary" href="/politica-de-privacidade" target="_blank"
				>política de privacidade</a
			>, as quais detalham um pouco melhor estes compromissos.
		</span>
	</label>

	<h2 class="text-lg">Verificação</h2>
	<span class="text-xs">Preencha o seguinte valor:</span>
	<div class="bg-base-100 border-2 rounded-xl w-fit">
		<div class="flex">
			{#if captcha}
				<img
					src="data:image/png;base64,{captcha.png}"
					alt="Código de verificação"
					width="250"
					height="60"
				/>
			{:else}
				<span class="bg-base-200 w-[250px] h-[60px]"></span>
			{/if}
			<button class="btn btn-outline w-12 h-[60px]" on:click={reloadCaptcha}>
				<Icon name="reload" class="w-4 h-4" />
			</button>
		</div>
		<input
			type="text"
			bind:value={captchaConfirmation}
			class="input input-bordered w-full input-md"
			class:input-error={captchaConfirmationTouched && captchaConfirmation.length != 5}
			placeholder="Texto acima"
		/>
	</div>

	<textarea class="w-full h-96">
		{JSON.stringify(registration, null, 2)}
	</textarea>
{/if}

<div class="card-actions justify-between">
	<span class:hidden={step != 0}></span>
	<button class="btn btn-outline" class:hidden={step == 0} on:click={previousStep}>Voltar</button>
	<div class="flex gap-1 items-center">
		{#if isProcessing}
			<Icon name="spinner" class="animate-spin -ml-1 mr-3 h-6 w-6" />
		{/if}
		<button class="btn btn-primary" on:click={nextStep} disabled={isProcessing}>Seguinte</button>
	</div>
</div>
