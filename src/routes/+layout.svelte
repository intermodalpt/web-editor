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

	let minimized = false;
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
				<ul class="menu bg-base-200" class:w-56={!minimized}>
					<li>
						<a href="/regions" class:active={$page.url.pathname.startsWith('/regions')}>
							<Icon name="location" class="h-4 fill-current" />
							<span class:hidden={minimized}>Regiões</span>
						</a>
					</li>
					<li>
						<details open>
							<summary>{minimized ? '' : 'nome-da-região'}</summary>
							<ul>
								<li>
									<a href="/stops" class:active={$page.url.pathname.startsWith('/stops')}>
										<Icon name="shelter" class="h-4 fill-current" />
										<span class:hidden={minimized}>Paragens</span>
									</a>
								</li>
								<li>
									<a href="/images" class:active={$page.url.pathname.startsWith('/images')}>
										<Icon name="camera" class="h-4 fill-current" />
										<span class:hidden={minimized}>Imagens</span>
									</a>
								</li>
								<li>
									<a href="/todo" class:active={$page.url.pathname.startsWith('/todo')}>
										<Icon name="checklist" class="h-4 fill-current" />
										<span class:hidden={minimized}>Tarefas</span>
									</a>
								</li>
								<li>
									<a href="/stats" class:active={$page.url.pathname.startsWith('/stats')}>
										<Icon name="chart" class="h-4 fill-current" />
										<span class:hidden={minimized}>Estado</span>
									</a>
								</li>
								<li>
									<a href="/regions" class:active={$page.url.pathname == '/regions'}>
										<Icon name="location" class="h-4 fill-current" />
										<span class:hidden={minimized}>Outras regiões</span>
									</a>
								</li>
							</ul>
						</details>
					</li>
					<li>
						<a href="/operators" class:active={$page.url.pathname.startsWith('/operators')}>
							<Icon name="bus" class="h-4 fill-current" />
							<span class:hidden={minimized}>Operadores</span>
						</a>
					</li>
					<li>
						<a href="/news" class:active={$page.url.pathname.startsWith('/news')}>
							<Icon name="news" class="h-4 fill-current" />
							<span class:hidden={minimized}>Noticias</span>
						</a>
					</li>
					<li>
						<a href="/issues" class:active={$page.url.pathname.startsWith('/issues')}>
							<Icon name="issue" class="h-4 fill-current" />
							<span class:hidden={minimized}>Problemas</span>
						</a>
					</li>
					<li>
						<details open>
							<summary>
								<Icon name="magnifying-glass" class="h-4 fill-current" />
								<span class:hidden={minimized}>Validação</span>
							</summary>
							<ul>
								<li>
									<a href="/osm" class:active={$page.url.pathname.startsWith('/osm')}>
										<Icon name="map" class="h-4 fill-current" />
										<span class:hidden={minimized}>OpenStreetMap</span>
									</a>
								</li>
								<li>
									<a href="/contrib" class:active={$page.url.pathname.startsWith('/contrib')}>
										<Icon name="timeline" class="h-4 fill-current" />
										<span class:hidden={minimized}>Contribuições</span>
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
							<span>{minimized ? '' : 'Região'}</span>
						</div>
						{#if !minimized}
							{#if $selectedRegion}
								<span class="font-bold">{$selectedRegion?.name}</span>
							{:else}
								<span class="font-bold">Sem região escolhida</span>
							{/if}
						{/if}
					</button>
					<button
						class="w-full h-12 flex gap-2 items-center justify-center"
						class:hidden={minimized}
						on:click={() => (minimized = true)}
					>
						<Icon name="left" class="h-4" />
						<span>Minimizar</span>
					</button>
					<button
						class="w-full h-12 flex gap-2 items-center justify-center"
						class:hidden={!minimized}
						on:click={() => (minimized = false)}
					>
						<Icon name="right" class="h-4" />
					</button>
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
