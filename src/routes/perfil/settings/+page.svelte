<script lang="ts">
	import { changePassword } from '$lib/api';
	import { toast } from '$lib/stores';
	import Icon from '$lib/components/Icon.svelte';
	import Menu from '../Menu.svelte';

	export let data;

	let password: string;
	let newPassword: string;
	let newPasswordConfirmation: string;
	let passwordTouched = false;
	let newPasswordTouched = false;
	let newPasswordConfirmationTouched = false;
	$: {
		if ((password ?? '').length > 0) passwordTouched = true;
		if ((newPassword ?? '').length > 0) newPasswordTouched = true;
		if ((newPasswordConfirmation ?? '').length > 0) newPasswordConfirmationTouched = true;
	}

	$: isValidNewPassword = newPassword && newPassword.length >= 7;
	let isPasswordChanging = false;

	async function handleChangePassword() {
		if (newPassword.length < 7) {
			toast('Palavra-chave atual demasiado curta.', 'error');
			return;
		}

		if (newPassword != newPasswordConfirmation) {
			toast('As palavras-chave não coincidem.', 'error');
			return;
		}

		if (newPassword == password) {
			toast('A nova palavra-chave é igual à atual.', 'error');
			return;
		}

		isPasswordChanging = true;

		await changePassword(newPassword, password, {
			onSuccess: () => {
				toast('Palavra-chave alterada com sucesso!');
				password = '';
				newPassword = '';
				newPasswordConfirmation = '';
				passwordTouched = false;
				newPasswordTouched = false;
				newPasswordConfirmationTouched = false;
			},
			onError: (res) => {
				if (res.status == 403) {
					toast('Palavra-chave atual incorreta.', 'error');
				} else {
					toast('Erro ao alterar a palavra-chave.', 'error');
				}
			},
			onAfter: () => {
				isPasswordChanging = false;
			}
		});
	}
</script>

<Menu {data} page="settings" />

<form class="card-body">
	<h2 class="card-title">Alteração de palavra-chave</h2>
	<label
		class="input input-bordered flex items-center gap-2 grow"
		class:input-error={newPasswordTouched && !isValidNewPassword}
	>
		Nova palavra-chave
		<input id="registrationPassword" type="password" class="grow" bind:value={newPassword} />
	</label>
	<label
		class="input input-bordered flex items-center gap-2 grow"
		class:input-error={newPasswordTouched &&
			newPasswordConfirmationTouched &&
			newPassword != newPasswordConfirmation}
	>
		Confirmação
		<input
			type="password"
			class="grow"
			placeholder="Repita a palavra-chave"
			bind:value={newPasswordConfirmation}
		/>
	</label>
	<label
		class="input input-bordered flex items-center gap-2 grow"
		class:input-error={passwordTouched && (password ?? '').length < 7}
	>
		Palavra-chave atual
		<input id="registrationPassword" type="password" class="grow" bind:value={password} />
	</label>
	<div class="flex justify-end">
		{#if isPasswordChanging}
			<Icon name="spinner" class="animate-spin -ml-1 mr-3 h-6 w-6" />
		{/if}
		<button
			type="submit"
			class="btn btn-primary"
			disabled={isPasswordChanging}
			on:click|preventDefault={handleChangePassword}
		>
			Alterar
		</button>
	</div>
</form>
