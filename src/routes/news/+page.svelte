<script>
	import { tick } from 'svelte';
	import { token } from '$lib/stores.js';
	import { writable, derived } from 'svelte/store';
	import { liveQuery } from 'dexie';
	import { apiServer } from '$lib/settings.js';
	import { decodedToken } from '$lib/stores.js';
	import { getOperators, fetchOperators, getRegions, fetchRegions, loadMissing } from '$lib/db';
	import Icon from '$lib/components/Icon.svelte';
	import Paginator from '$lib/components/Paginator.svelte';
	import NewsItem from './NewsItem.svelte';
	import ExternalNewsItem from './ExternalNewsItem.svelte';
	import ExternalNewsItemEditor from './ExternalNewsItemEditor.svelte';

	const isAdmin = $decodedToken?.permissions?.is_admin || false;
	const operators = liveQuery(() => getOperators());
	const regions = liveQuery(() => getRegions());

	const mapTabs = {
		pendingExt: 0,
		allExt: 1,
		allInt: 2
	};

	const tab = writable(mapTabs.pendingExt);
	let editDialog;
	let editItemId;

	const operatorFilter = writable(null);

	let pendingExternalLoaded = false;
	let allExternalLoaded = false;
	let allInternalLoaded = false;

	const pendingExternalPage = writable(0);
	const allExternalPage = writable(0);
	const allInternalPage = writable(0);

	// Singin', "This'll be the day that I die
	// This'll be the day that I die,"
	// -
	const forceDerivedStoresToUpdate = writable(0);

	let pendingExternalTotal = 0;
	let allExternalTotal = 0;
	let allInternalTotal = 0;

	const pendingExternalNews = derived(
		[pendingExternalPage, operatorFilter, forceDerivedStoresToUpdate],
		async ([$page, $OperatorFilter], set) => {
			pendingExternalLoaded = false;
			const fetchParams = {
				headers: {
					authorization: `Bearer ${$token}`
				}
			};

			const res = await ($OperatorFilter
				? fetch(
						`${apiServer}/v1/operators/${$operatorFilter}/external_news/pending?p=${$page}`,
						fetchParams
					)
				: fetch(`${apiServer}/v1/news/external/pending?p=${$page}`, fetchParams));
			const data = await res.json();
			pendingExternalTotal = data.total;
			set(data.items);
			pendingExternalLoaded = true;
		}
	);

	const allExternalNews = derived(
		[pendingExternalPage, operatorFilter, forceDerivedStoresToUpdate],
		async ([$page, $OperatorFilter], set) => {
			allExternalLoaded = false;
			const fetchParams = {
				headers: {
					authorization: `Bearer ${$token}`
				}
			};

			const res = await ($OperatorFilter
				? fetch(
						`${apiServer}/v1/operators/${$operatorFilter}/external_news?p=${$page}`,
						fetchParams
					)
				: fetch(`${apiServer}/v1/news/external?p=${$page}`, fetchParams));
			const data = await res.json();
			allExternalTotal = data.total;
			set(data.items);
			allExternalLoaded = true;
		}
	);

	const allInternalNews = derived(
		[allInternalPage, operatorFilter, forceDerivedStoresToUpdate],
		async ([$page, $OperatorFilter], set) => {
			allInternalLoaded = false;
			const fetchParams = {
				headers: {
					authorization: `Bearer ${$token}`
				}
			};

			const res = await ($OperatorFilter
				? fetch(`${apiServer}/v1/operators/${$operatorFilter}/news?p=${$page}`, fetchParams)
				: fetch(`${apiServer}/v1/news?p=${$page}`, fetchParams));
			const data = await res.json();
			allInternalTotal = data.total;
			set(data.items);
			allInternalLoaded = true;
		}
	);

	function refreshData() {
		console.log('refreshing data');
		// Force a data refresh
		// This should work...
		$pendingExternalPage = $pendingExternalPage;
		$allExternalPage = $allExternalPage;
		$allInternalPage = $allInternalPage;
		// It doesn't. Let's drown a kitten
		$forceDerivedStoresToUpdate = $forceDerivedStoresToUpdate + 1;
	}

	async function loadData() {
		await Promise.all([fetchOperators(), fetchRegions()]);
	}

	loadData().then(async () => {
		console.log('data loaded');
		await loadMissing();
	});
</script>

<svelte:head>
	<title>Noticias</title>
	<meta name="description" content="Noticias" />
</svelte:head>

<div class="self-center max-w-[80em] w-full my-4">
	<div class="tabs ml-4">
		<button
			class="tab tab-md lg:tab-lg tab-lifted"
			class:tab-active={$tab === mapTabs.pendingExt}
			on:click={() => {
				$tab = mapTabs.pendingExt;
			}}>Externas pendentes</button
		>
		<button
			class="tab tab-md lg:tab-lg tab-lifted"
			class:tab-active={$tab === mapTabs.allExt}
			on:click={() => {
				$tab = mapTabs.allExt;
			}}>Externas</button
		>
		<button
			class="tab tab-md lg:tab-lg tab-lifted"
			class:tab-active={$tab === mapTabs.allInt}
			on:click={() => {
				$tab = mapTabs.allInt;
			}}>Internas</button
		>
	</div>
	<div class="card card-compact 2xl:card-normal bg-base-100 shadow-sm self-start">
		<div class="card-body">
			{#if $tab === mapTabs.pendingExt}
				<div class="flex flex-wrap gap-2 justify-between">
					<h2 class="card-title">Conteúdos pendentes</h2>
					<Paginator
						bind:page={$pendingExternalPage}
						bind:itemCount={pendingExternalTotal}
						on:goto={(e) => {
							$pendingExternalPage = e.detail.page;
						}}
					/>
					{#if $operators}
						<div class="input-group w-fit">
							<span class="bg-base-200 label-text">Filtros</span>
							<span class="label-text">Operador</span>
							<select bind:value={$operatorFilter} class="input h-full input-bordered">
								<option selected value>-------</option>
								{#each Object.values($operators ?? {}) as operator}
									<option value={operator.id}>{operator.name}</option>
								{/each}
							</select>
						</div>
					{/if}
				</div>
				{#if pendingExternalLoaded}
					<div class="flex flex-col gap-2">
						{#each $pendingExternalNews as item (item.id)}
							<button
								class="p-2 border-2 rounded-lg cursor-pointer bg-base-100 hover:bg-base-200"
								on:click={async () => {
									editItemId = item.id;
									await tick();
									editDialog.showModal();
								}}
							>
								<ExternalNewsItem {item} {operators} {regions} />
							</button>
						{/each}
					</div>
				{:else}
					<div class="w-full flex justify-center">
						<span class="loading loading-dots loading-lg" />
					</div>
				{/if}
			{:else if $tab === mapTabs.allExt}
				<div class="flex flex-wrap gap-2 justify-between">
					<h2 class="card-title">Noticias externas</h2>
					<Paginator
						bind:page={$allExternalPage}
						bind:itemCount={allExternalTotal}
						on:goto={(e) => {
							$allExternalPage = e.detail.page;
						}}
					/>
					{#if $operators}
						<div class="input-group w-fit">
							<span class="bg-base-200 label-text">Filtros</span>
							<span class="label-text">Operador</span>
							<select bind:value={$operatorFilter} class="input h-full input-bordered">
								<option selected value>-------</option>
								{#each Object.values($operators ?? {}) as operator}
									<option value={operator.id}>{operator.name}</option>
								{/each}
							</select>
						</div>
					{/if}
				</div>
				{#if allExternalLoaded}
					<div class="flex flex-col gap-2">
						{#each $allExternalNews as item (item.id)}
							<button
								class="p-2 border-2 rounded-lg cursor-pointer bg-base-100 hover:bg-base-200"
								on:click={async () => {
									editItemId = item.id;
									await tick();
									editDialog.showModal();
								}}
							>
								<ExternalNewsItem {item} {operators} {regions} />
							</button>
						{/each}
					</div>
				{:else}
					<div class="w-full flex justify-center">
						<span class="loading loading-dots loading-lg" />
					</div>
				{/if}
			{:else if $tab === mapTabs.allInt}
				<div class="flex flex-wrap gap-2 justify-between">
					<h2 class="card-title">Noticias internas</h2>
					<Paginator
						bind:page={$allInternalPage}
						bind:itemCount={allInternalTotal}
						on:goto={(e) => {
							$allInternalPage = e.detail.page;
						}}
					/>
					{#if $operators}
						<div class="input-group w-fit">
							<span class="bg-base-200 label-text">Filtros</span>
							<span class="label-text">Operador</span>
							<select bind:value={$operatorFilter} class="input h-full input-bordered">
								<option selected value>-------</option>
								{#each Object.values($operators ?? {}) as operator}
									<option value={operator.id}>{operator.name}</option>
								{/each}
							</select>
						</div>
					{/if}
				</div>
				{#if allInternalLoaded}
					<div class="flex flex-col gap-2">
						{#each $allInternalNews as item (item.id)}
							<button
								class="p-2 border-2 rounded-lg cursor-pointer bg-base-100 hover:bg-base-200"
								on:click={async () => {
									editItemId = item.id;
									await tick();
									editDialog.showModal();
								}}
							>
								<NewsItem {item} {operators} {regions} />
							</button>
						{/each}
					</div>
				{:else}
					<div class="w-full flex justify-center">
						<span class="loading loading-dots loading-lg" />
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>

{#if editItemId}
	<dialog bind:this={editDialog} class="modal modal-bottom sm:modal-middle">
		<div class="modal-box relative z-30 sm:max-w-5xl">
			<div>
				<form method="dialog">
					<button class="btn btn-sm btn-circle btn-error absolute right-2 top-2">
						<Icon name="close" class="h-4 stroke-current" />
					</button>
				</form>
				{#key editItemId}
					<ExternalNewsItemEditor
						id={editItemId}
						{operators}
						{regions}
						canEdit={isAdmin}
						on:save={() => {
							editDialog.close();
							refreshData();
						}}
						on:delete={() => {
							editDialog.close();
							refreshData();
						}}
					/>
				{/key}
			</div>
		</div>
		<form method="dialog" class="modal-backdrop">
			<button></button>
		</form>
	</dialog>
{/if}
