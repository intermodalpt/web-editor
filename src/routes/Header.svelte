<script>
	import { derived } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { liveQuery } from 'dexie';
	import { logout } from '$lib/api';
	import { toast } from '$lib/stores';
	import { regionId, getRegions, setRegion, selectedRegion } from '$lib/db';
	import Icon from '$lib/components/Icon.svelte';

	export let username;

	let regionModal;

	const regions = liveQuery(() => getRegions());

	const sortedRegions = derived(regions, ($regions) => {
		return Object.values($regions || {}).sort((a, b) => a.name.localeCompare(b.name));
	});

	regions.subscribe((regions) => {
		if (Object.keys(regions || {}).length > 0 && !$regionId) {
			regionModal.showModal();
		}
	});

	async function handleLogout() {
		await logout({
			onSuccess: (res) => {
				toast('Boa viagem!');
				goto('/perfil', { invalidateAll: true });
			},
			onError: (res) => {
				toast(`Erro a sair`, 'error');
			}
		});
	}
</script>

<header class="flex justify-center bg-base-100 p-1">
	<div class="grow flex justify-between items-center max-w-[80em]">
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
			<button class="btn btn-xs btn-secondary btn-outline" on:click={() => regionModal.showModal()}>
				{$selectedRegion ? $selectedRegion.name : 'Sem região'}
			</button>
		</div>
		<nav class="hidden lg:block">
			<div class="tabs tabs-boxed mx-auto justify-around">
				<a href="/stops" class="tab" class:tab-active={$page.url.pathname.startsWith('/stops')}>
					Paragens
				</a>
				<a
					href="/operators"
					class="tab"
					class:tab-active={$page.url.pathname.startsWith('/operators')}
				>
					Operadores
				</a>
				<a href="/images" class="tab" class:tab-active={$page.url.pathname.startsWith('/images')}>
					Fotos
				</a>
				<a href="/contrib" class="tab" class:tab-active={$page.url.pathname.startsWith('/contrib')}>
					Contribuições
				</a>
				<a href="/stats" class="tab" class:tab-active={$page.url.pathname.startsWith('/stats')}>
					Estado
				</a>
				<a href="/osm" class="tab" class:tab-active={$page.url.pathname.startsWith('/osm')}>
					OSM
				</a>
			</div>
		</nav>
		<div>
			{#if username}
				<div class="bg-base-200 rounded-lg p-1 flex gap-2">
					<a class="btn btn-info btn-xs h-8 p-1 hidden sm:flex" href="/perfil">{username}</a>
					<a class="btn btn-info btn-xs h-8 w-8 p-1 sm:hidden" href="/perfil">
						<Icon name="user" class="fill-info-content" />
					</a>
					<button class="btn btn-error btn-xs h-8 w-8 p-1" on:click={handleLogout}>
						<Icon name="exit" class="fill-error-content" />
					</button>
				</div>
			{:else}
				<a href="/login" class="btn btn-primary btn-xs">Entrar</a>
			{/if}
		</div>
	</div>
</header>
<dialog bind:this={regionModal} class="modal">
	<div class="modal-box w-auto max-w-full">
		<h2 class="text-lg text-center mb-4">Escolha a região a editar</h2>
		<div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
			{#each $sortedRegions as region}
				<button
					class="btn btn-secondary"
					class:btn-ghost={$regionId != region.id}
					on:click={() => {
						setRegion(region.id);
						regionModal.close();
					}}
				>
					{region.name}
				</button>
			{/each}
		</div>
	</div>
</dialog>
