<script>
	import { goto } from '$app/navigation';
	import { logout } from '$lib/api';
	import { toast } from '$lib/stores';
	import Icon from '$lib/components/Icon.svelte';

	export let username;

	let regionModal;

	async function handleLogout() {
		await logout({
			onSuccess: () => {
				toast('Boa viagem!');
				goto('/perfil', { invalidateAll: true });
			},
			onError: () => {
				toast(`Erro a sair`, 'error');
			}
		});
	}
</script>

<header class="flex justify-center bg-base-100 px-2 py-2">
	<div class="grow flex justify-between items-center">
		<div class="flex-none lg:hidden">
			<label for="mobile-drawer" class="btn btn-sm btn-square btn-ghost">
				<Icon name="hamburger" class="inline-block w-6 h-6 stroke-current" />
			</label>
		</div>
		<div class="flex gap-2 items-center">
			<a href="/" class="font-bold text-xl flex items-center gap-2">
				<img src="/logo.svg" alt="logo" class="h-8" />
				<span class="hidden sm:inline">Editor</span>
			</a>
		</div>
		<div>
			{#if username}
				<div class="bg-base-200 rounded-lg p-1 flex gap-2">
					<a class="btn btn-info btn-sm h-8 p-1 hidden sm:flex" href="/perfil">{username}</a>
					<a class="btn btn-info btn-sm h-8 w-8 p-1 sm:hidden" href="/perfil">
						<Icon name="user" class="fill-info-content" />
					</a>
					<button class="btn btn-error btn-sm h-8 w-8 p-1" on:click={handleLogout}>
						<Icon name="exit" class="fill-error-content" />
					</button>
				</div>
			{:else}
				<a href="/login" class="btn btn-primary btn-sm">Entrar</a>
			{/if}
		</div>
	</div>
</header>
