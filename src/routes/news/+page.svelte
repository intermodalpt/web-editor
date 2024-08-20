<script>
	import { onMount, tick } from 'svelte';
	import { writable, derived } from 'svelte/store';
	import { apiServer } from '$lib/settings';
	import { permissions, toast } from '$lib/stores';
	import Icon from '$lib/components/Icon.svelte';
	import Paginator from '$lib/components/Paginator.svelte';
	import BooleanToggle from '$lib/components/BooleanToggle.svelte';
	import NewsItem from '$lib/news/row/NewsItem.svelte';
	import ExternalNewsItem from '$lib/news/row/ExternalNewsItem.svelte';
	import NewsItemViewer from '$lib/news/viewer/NewsItem.svelte';
	import NewsItemEditor from '$lib/news/editor/NewsItem.svelte';
	import ExternalNewsItemEditor from '$lib/news/editor/ExternalNewsItem.svelte';
	import NewsItemLoader from '$lib/news/viewer/NewsItemLoader.svelte';
	import ExternalNewsItemLoader from '$lib/news/viewer/ExternalNewsItemLoader.svelte';
	import {
		getExternalNewsItems,
		getNewsItems,
		getOperator,
		getOperatorExternalNewsItems,
		getOperatorNewsItems,
		getOperatorPendingExternalNewsItems,
		getPendingExternalNewsItems
	} from '$lib/api';

	export let data;

	const operators = data.operators;
	const regions = data.regions;
	const operatorIndex = Object.fromEntries(operators.map((o) => [o.id, o]));
	const regionIndex = Object.fromEntries(regions.map((r) => [r.id, r]));
	const ssrNews = data.items;

	const mapTabs = {
		internal: 0,
		external: 1,
		pendingExt: 2
	};
	let tab = mapTabs.internal;

	let editDialog;
	let editItemId;
	let editExternalItemId;

	let loadedOperator = null;
	let operatorFilter = null;

	let internalLoaded = true;
	let internalNews = ssrNews.items;
	let internalTotal = ssrNews.total;
	let loadedInternalPage = 0;

	let externalLoaded = false;
	let externalNews = [];
	let loadedExternalPage = null;
	let externalTotal = 0;

	let pendingExternalLoaded = false;
	let pendingExternalNews = [];
	let loadedPendingExternalPage = null;
	let pendingExternalTotal = 0;

	let internalPage = 0;
	let externalPage = 0;
	let pendingExternalPage = 0;

	// Filter to show only those
	let filterPendingExternal = false;

	function onOperatorChange() {
		resetPages();
		loadData();
	}

	function resetPages() {
		internalPage = 0;
		externalPage = 0;
		pendingExternalPage = 0;
		loadedOperator = null;
	}

	async function loadData(force = false) {
		if (tab === mapTabs.internal) {
			if (force || loadedInternalPage !== internalPage || loadedOperator !== operatorFilter) {
				internalLoaded = false;
				const reqPage = internalPage;
				const reqOperator = operatorFilter;
				const onSuccess = (data) => {
					if (reqPage !== internalPage || reqOperator !== operatorFilter) {
						return; // Answer is now irrelevant
					}
					internalTotal = data.total;
					internalNews = data.items;
					internalLoaded = true;
					loadedInternalPage = reqPage;
					loadedOperator = reqOperator;
				};
				const onError = (err) => {
					toast('Erro ao carregar notícias', 'error');
				};
				await (operatorFilter
					? getOperatorNewsItems(operatorFilter, reqPage, { onSuccess, onError, toJson: true })
					: getNewsItems(reqPage, { onSuccess, onError, toJson: true }));
			}
		} else if (tab === mapTabs.external) {
			if (force || loadedExternalPage !== externalPage || loadedOperator !== operatorFilter) {
				externalLoaded = false;
				const reqPage = externalPage;
				const reqOperator = operatorFilter;
				const onSuccess = (data) => {
					if (reqPage !== externalPage || reqOperator !== operatorFilter) {
						return; // Answer is now irrelevant
					}
					externalTotal = data.total;
					externalNews = data.items;
					externalLoaded = true;
					loadedInternalPage = reqPage;
					loadedOperator = reqOperator;
				};
				const onError = (err) => {
					toast('Erro ao carregar notícias externas', 'error');
				};
				if (filterPendingExternal) {
					await (operatorFilter
						? getOperatorPendingExternalNewsItems(operatorFilter, reqPage, {
								onSuccess,
								onError,
								toJson: true
							})
						: getPendingExternalNewsItems(reqPage, { onSuccess, onError, toJson: true }));
				} else {
					await (operatorFilter
						? getOperatorExternalNewsItems(operatorFilter, reqPage, {
								onSuccess,
								onError,
								toJson: true
							})
						: getExternalNewsItems(reqPage, { onSuccess, onError, toJson: true }));
				}
			}
		}
	}
</script>

<div class="self-center max-w-[80em] w-full my-4">
	<h1 class="font-semibold text-3xl my-3 hidden lg:block ml-4">Notícias</h1>
	<div class="tabs tabs-md lg:tabs-lg tabs-lifted mx-4 max-w-96">
		<button
			class="tab"
			class:tab-active={tab === mapTabs.internal}
			on:click={() => {
				tab = mapTabs.internal;
				loadData();
			}}>Internas</button
		>
		<button
			class="tab"
			class:tab-active={tab === mapTabs.external}
			on:click={() => {
				tab = mapTabs.external;
				loadData();
			}}>Externas</button
		>
	</div>
	<div class="card card-compact bg-base-100 shadow-sm self-start">
		<div class="card-body">
			{#if tab === mapTabs.internal}
				{#if internalLoaded}
					<div class="flex flex-col gap-2">
						{#each internalNews as item (item.id)}
							<button
								class="p-2 border-[1px] rounded-lg cursor-pointer bg-base-100 hover:bg-slate-50"
								on:click={async () => {
									editExternalItemId = undefined;
									editItemId = item.id;
									await tick();
									editDialog.showModal();
								}}
							>
								<NewsItem {item} operators={operatorIndex} regions={regionIndex} />
							</button>
						{/each}
					</div>
				{:else}
					<div class="w-full flex justify-center">
						<span class="loading loading-dots loading-lg" />
					</div>
				{/if}
				<div class="flex flex-wrap gap-2 justify-between">
					<div class="input-group w-fit">
						<span class="label-text">Operador</span>
						<select
							bind:value={operatorFilter}
							class="input h-full input-bordered"
							on:change={onOperatorChange}
						>
							<option selected value>-------</option>
							{#each operators as operator}
								<option value={operator.id}>{operator.name}</option>
							{/each}
						</select>
					</div>
					<Paginator
						bind:page={internalPage}
						bind:itemCount={internalTotal}
						on:goto={() => loadData(true)}
					/>
				</div>
			{:else if tab === mapTabs.external}
				{#if externalLoaded}
					<div class="flex flex-col gap-2">
						{#each externalNews as item (item.id)}
							<button
								class="p-2 border-[1px] rounded-lg cursor-pointer bg-base-100 hover:bg-slate-50"
								on:click={async () => {
									editItemId = undefined;
									editExternalItemId = item.id;
									await tick();
									editDialog.showModal();
								}}
							>
								<ExternalNewsItem {item} operators={operatorIndex} regions={regionIndex} />
							</button>
						{/each}
					</div>
				{:else}
					<div class="w-full flex justify-center">
						<span class="loading loading-dots loading-lg" />
					</div>
				{/if}
				<div class="flex flex-wrap gap-2 justify-between items-center">
					<div class="flex items-center gap-2">
						<div class="input-group w-fit">
							<span class="label-text">Operador</span>
							<select
								bind:value={operatorFilter}
								class="input h-full input-bordered"
								on:change={onOperatorChange}
							>
								<option selected value>-------</option>
								{#each operators as operator}
									<option value={operator.id}>{operator.name}</option>
								{/each}
							</select>
						</div>
						{#if $permissions?.externalNews?.readPrivate}
							<div class="form-control">
								<label class="label cursor-pointer">
									<span class="label-text">Apenas pendentes</span>
									<input
										type="checkbox"
										class="toggle"
										bind:checked={filterPendingExternal}
										on:change={() => loadData(true)}
									/>
								</label>
							</div>
						{/if}
					</div>
					<Paginator
						bind:page={externalPage}
						bind:itemCount={externalTotal}
						on:goto={() => loadData(true)}
					/>
				</div>
			{/if}
		</div>
	</div>
</div>

<dialog bind:this={editDialog} class="modal modal-bottom sm:modal-middle">
	<div class="modal-box relative z-30 sm:max-w-5xl">
		<div>
			<form method="dialog">
				<button class="btn btn-sm btn-circle btn-error absolute right-2 top-2">
					<Icon name="close" class="h-4 stroke-current" />
				</button>
			</form>
			{#if editExternalItemId}
				{#key editExternalItemId}
					<ExternalNewsItemLoader
						id={editExternalItemId}
						operators={operatorIndex}
						regions={regionIndex}
					/>
					<!-- <ExternalNewsItemEditor
						id={editExternalItemId}
						operators={operatorIndex}
						regions={regionIndex}
						canEdit={$permissions?.news?.create || $permissions?.news?.modify}
						on:save={() => {
							editDialog.close();
							loadData(true);
						}}
						on:delete={() => {
							editDialog.close();
							loadData(true);
						}}
					/> -->
				{/key}
			{/if}
			{#if editItemId}
				{#key editItemId}
					<NewsItemLoader id={editItemId} operators={operatorIndex} regions={regionIndex} />
					<!-- <NewsItemEditor
						id={editExternalItemId}
						operators={operatorIndex}
						regions={regionIndex}
						on:save={() => {
							editDialog.close();
							loadData(true);
						}}
						on:delete={() => {
							editDialog.close();
							loadData(true);
						}}
					/> -->
				{/key}
			{/if}
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button></button>
	</form>
</dialog>
