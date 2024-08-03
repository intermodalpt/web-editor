<script type="ts">
	import '../app.css';
	import { writable } from 'svelte/store';
	import { page, navigating } from '$app/stores';
	import { showDebugInfo } from '$lib/settings';
	import { toasts } from '$lib/stores';
	import Header from './Header.svelte';
	import RegionPicker from '$lib/components/RegionPicker.svelte';
	import DbLoadingInfo from '$lib/components/DbLoadingInfo.svelte';
	import Icon from '$lib/components/Icon.svelte';

	export let data;

	let regionModal;
	let selectedRegion = writable(null);
</script>

{#if $navigating}
	<div
		class="fixed inset-0 bg-white backdrop-blur-sm bg-opacity-20 z-40 flex items-end justify-end p-8"
	>
		<span class="loading loading-spinner text-primary loading-lg" />
	</div>
{/if}

<div class="h-full grid" style="grid-template-rows: auto 1fr;">
	<Header username={data.uname} />
	<div class="drawer lg:drawer-open border-t-[1px] border-slate-300">
		<input id="mobile-drawer" type="checkbox" class="drawer-toggle" />
		<div class="drawer-content h-full bg-slate-100">
			<main class="flex flex-col overflow-y-auto h-full">
				<slot />
			</main>
		</div>
		<div class="drawer-side z-[10000] h-full border-slate-300 shadow-sm">
			<label for="mobile-drawer" class="drawer-overlay" />
			<div class="h-full w-fit flex flex-col justify-between bg-white">
				<ul class="menu bg-base-200 w-56">
					<li>
						<a href="/regions" class:active={$page.url.pathname.startsWith('/regions')}>Regiões</a>
					</li>
					<li>
						<details open>
							<summary>nome-da-região</summary>
							<ul>
								<li>
									<a href="/stops" class:active={$page.url.pathname.startsWith('/stops')}>
										Paragens
									</a>
								</li>
								<li>
									<a href="/images" class:active={$page.url.pathname.startsWith('/images')}>
										Imagens
									</a>
								</li>
								<li>
									<a href="/todo" class:active={$page.url.pathname.startsWith('/todo')}>
										Tarefas
									</a>
								</li>
								<li>
									<a href="/stats" class:active={$page.url.pathname.startsWith('/stats')}>
										Estado
									</a>
								</li>
							</ul>
						</details>
					</li>
					<li>
						<a href="/operators" class:active={$page.url.pathname.startsWith('/operators')}>
							Operadores
						</a>
					</li>
					<li>
						<a href="/news" class:active={$page.url.pathname.startsWith('/news')}> Noticias</a>
					</li>
					<li>
						<a href="/issues" class:active={$page.url.pathname.startsWith('/issues')}> Problemas</a>
					</li>
					<li>
						<details open>
							<summary>Validação</summary>
							<ul>
								<li>
									<a href="/osm" class:active={$page.url.pathname.startsWith('/osm')}>
										OpenStreetMap
									</a>
								</li>
								<li>
									<a href="/contrib" class:active={$page.url.pathname.startsWith('/contrib')}>
										Contribuições
									</a>
								</li>
							</ul>
						</details>
					</li>
				</ul>
				<div>
					<button
						class="flex flex-col bg-slate-50 hover:bg-slate-100 p-4 w-full border-y-[1px] border-slate-300"
						on:click={() => regionModal.showModal()}
					>
						<div class="flex gap-2">
							<Icon name="globe" class="w-6" />
							<span>Região</span>
						</div>
						{#if $selectedRegion}
							<span class="font-bold">{$selectedRegion?.name}</span>
						{:else}
							<span class="font-bold">Sem região escolhida</span>
						{/if}
					</button>
					<button class="w-full h-12">Colapsar</button>
				</div>
			</div>
		</div>
	</div>
</div>

<div class="toast toast-end z-50">
	{#each $toasts as toast}
		<div class="alert alert-{toast.type}">
			<span>{toast.message}</span>
		</div>
	{/each}
</div>

{#if showDebugInfo}
	<DbLoadingInfo />
{/if}

<dialog bind:this={regionModal} class="modal modal-bottom sm:modal-middle">
	<div class="modal-box !max-w-[60em]">
		{#if $selectedRegion}
			<h2 class="text-lg font-bold">Região atual</h2>
			<span class="ml-2">{$selectedRegion?.name}</span>
			<h2 class="text-lg font-bold mt-2">Alterar região</h2>
		{:else}
			<h2 class="text-lg font-bold text-center">Escolha a sua região</h2>
		{/if}
		<RegionPicker setsUserRegion={true} requestsConfirmation={true} compact={true} />
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>Fechar</button>
	</form>
</dialog>
