<script type="ts">
	import '../app.css';
	import { page, navigating } from '$app/stores';
	import { showDebugInfo } from '$lib/settings';
	import { toasts, selectedRegion } from '$lib/stores';
	import Header from './Header.svelte';
	import RegionPicker from '$lib/components/RegionPicker.svelte';
	import DbLoadingInfo from '$lib/components/DbLoadingInfo.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import {
		getRegionImagesUrl,
		getRegionIssuesUrl,
		getRegionStatsUrl,
		getRegionStopsUrl,
		getRegionTodoUrl,
		REGIONS_URL
	} from '$lib/urls';

	export let data;

	let regionModal;

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
	<div class="drawer lg:drawer-open border-t-[1px]">
		<input id="mobile-drawer" type="checkbox" class="drawer-toggle" />
		<div class="drawer-content h-full">
			<main class="flex flex-col h-full overflow-auto bg-slate-200">
				<slot />
			</main>
		</div>
		<div class="drawer-side z-[10000] h-full border-slate-300 shadow-sm">
			<label for="mobile-drawer" class="drawer-overlay" />
			<div class="h-full w-fit flex flex-col justify-between bg-white">
				<ul
					class="menu bg-slate-50 border-b-[1px] border-base-300"
					class:min-w-56={!minimized}
					class:max-w-64={!minimized}
				>
					{#if $selectedRegion}
						{#if minimized}
							<li>
								<a
									href={getRegionStopsUrl($selectedRegion)}
									class="place-content-center"
									class:active={$page.url.pathname == getRegionStopsUrl($selectedRegion)}
								>
									<Icon name="shelter" class="h-4 fill-current" />
								</a>
							</li>
							<li>
								<a
									href={getRegionImagesUrl($selectedRegion)}
									class="place-content-center"
									class:active={$page.url.pathname == getRegionImagesUrl($selectedRegion)}
								>
									<Icon name="camera" class="h-4 fill-current" />
								</a>
							</li>
							<li>
								<a
									href={getRegionTodoUrl($selectedRegion)}
									class="place-content-center"
									class:active={($page.url.pathname = getRegionTodoUrl($selectedRegion))}
								>
									<Icon name="checklist" class="h-4 fill-current" />
								</a>
							</li>
							<li>
								<a
									href={getRegionIssuesUrl($selectedRegion)}
									class="place-content-center"
									class:active={$page.url.pathname == getRegionIssuesUrl($selectedRegion)}
								>
									<Icon name="issue" class="h-4 fill-current" />
								</a>
							</li>
							<li>
								<a
									href={getRegionStatsUrl($selectedRegion)}
									class="place-content-center"
									class:active={$page.url.pathname == getRegionStatsUrl($selectedRegion)}
								>
									<Icon name="chart" class="h-4 fill-current" />
								</a>
							</li>
							<li>
								<a
									href={REGIONS_URL}
									class="place-content-center"
									class:active={$page.url.pathname == REGIONS_URL}
								>
									<Icon name="location" class="h-4 fill-current" />
								</a>
							</li>
						{:else}
							<li>
								<details open>
									<summary>{$selectedRegion?.name}</summary>
									<ul>
										<li>
											<a
												href={getRegionStopsUrl($selectedRegion)}
												class:active={$page.url.pathname == getRegionStopsUrl($selectedRegion)}
											>
												<Icon name="shelter" class="h-4 fill-current" />
												<span>Paragens</span>
											</a>
										</li>
										<li>
											<a
												href={getRegionImagesUrl($selectedRegion)}
												class:active={$page.url.pathname == getRegionImagesUrl($selectedRegion)}
											>
												<Icon name="camera" class="h-4 fill-current" />
												<span>Imagens</span>
											</a>
										</li>
										<li>
											<a
												href={getRegionTodoUrl($selectedRegion)}
												class:active={($page.url.pathname == getRegionTodoUrl($selectedRegion))}
											>
												<Icon name="checklist" class="h-4 fill-current" />
												<span>Tarefas</span>
											</a>
										</li>
										<li>
											<a
												href={getRegionIssuesUrl($selectedRegion)}
												class:active={$page.url.pathname == getRegionIssuesUrl($selectedRegion)}
											>
												<Icon name="issue" class="h-4 fill-current" />
												<span>Problemas</span>
											</a>
										</li>
										<li>
											<a
												href={getRegionStatsUrl($selectedRegion)}
												class:active={$page.url.pathname == getRegionStatsUrl($selectedRegion)}
											>
												<Icon name="chart" class="h-4 fill-current" />
												<span>Estado</span>
											</a>
										</li>
										<li>
											<a href={REGIONS_URL} class:active={$page.url.pathname == REGIONS_URL}>
												<Icon name="location" class="h-4 fill-current" />
												<span>Outras regiões</span>
											</a>
										</li>
									</ul>
								</details>
							</li>
						{/if}
					{:else}
						<li>
							<a
								href="/regions"
								class:active={$page.url.pathname.startsWith('/regions')}
								class:place-content-center={minimized}
							>
								<Icon name="location" class="h-4 fill-current" />
								<span class:hidden={minimized}>Regiões</span>
							</a>
						</li>
					{/if}
					<li>
						<a
							href="/operators"
							class:active={$page.url.pathname.startsWith('/operators')}
							class:place-content-center={minimized}
						>
							<Icon name="bus" class="h-4 fill-current" />
							<span class:hidden={minimized}>Operadores</span>
						</a>
					</li>
					<li>
						<a
							href="/news"
							class:active={$page.url.pathname.startsWith('/news')}
							class:place-content-center={minimized}
						>
							<Icon name="news" class="h-4 fill-current" />
							<span class:hidden={minimized}>Noticias</span>
						</a>
					</li>

					{#if minimized}
						<li>
							<a
								href="/osm"
								class="place-content-center"
								class:active={$page.url.pathname.startsWith('/osm')}
							>
								<Icon name="map" class="h-4 fill-current" />
							</a>
						</li>
						<li>
							<a
								href="/contrib"
								class="place-content-center"
								class:active={$page.url.pathname.startsWith('/contrib')}
							>
								<Icon name="timeline" class="h-4 fill-current" />
							</a>
						</li>
					{:else}
						<li>
							<details open>
								<summary>
									<Icon name="magnifying-glass" class="h-4 fill-current" />
									<span>Validação</span>
								</summary>
								<ul>
									<li>
										<a href="/osm" class:active={$page.url.pathname.startsWith('/osm')}>
											<Icon name="map" class="h-4 fill-current" />
											<span>OpenStreetMap</span>
										</a>
									</li>
									<li>
										<a href="/contrib" class:active={$page.url.pathname.startsWith('/contrib')}>
											<Icon name="timeline" class="h-4 fill-current" />
											<span>Contribuições</span>
										</a>
									</li>
								</ul>
							</details>
						</li>
					{/if}
				</ul>
				<div>
					<button
						class="flex flex-col bg-slate-50 hover:bg-slate-100 p-4 w-full border-y-[1px] border-base-300"
						on:click={() => regionModal.showModal()}
					>
						<div class="flex gap-2" class:justify-center={minimized}>
							<Icon name="globe" class="w-6" />
							{#if !minimized}
								<span>Região</span>
							{/if}
						</div>
						{#if !minimized}
							{#if $selectedRegion}
								<span class="font-bold text-left">{$selectedRegion?.name}</span>
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
			<span class="ml-2 text-left">{$selectedRegion?.name}</span>
			<h2 class="text-lg font-bold mt-2">Alterar região</h2>
		{:else}
			<h2 class="text-lg font-bold text-center">Escolha a sua região</h2>
		{/if}
		<RegionPicker
			setsUserRegion={true}
			requestsConfirmation={true}
			compact={true}
			on:select={() => {
				regionModal.close();
			}}
		/>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>Fechar</button>
	</form>
</dialog>
