<script>
	import { tick } from 'svelte';
	import { token } from '$lib/stores.js';
	import { writable, derived } from 'svelte/store';
	import { liveQuery } from 'dexie';
	import { apiServer } from '$lib/settings.js';
	import { decodedToken } from '$lib/stores.js';
	import { getOperators, fetchOperators, getRegions, fetchRegions, loadMissing } from '$lib/db';
	import Paginator from '$lib/components/Paginator.svelte';
	import ExternalNewsItem from './ExternalNewsItem.svelte';
	import ExternalNewsItemEditor from './ExternalNewsItemEditor.svelte';

	const isAdmin = $decodedToken?.permissions?.is_admin || false;
	const operators = liveQuery(() => getOperators());
	const regions = liveQuery(() => getRegions());

	const mapTabs = {
		pending: 0
	};

	const tab = writable(mapTabs.pending);
	let editDialog;
	let editItemId;

	const openContribution = writable(null);
	const openChangeset = writable(null);

	const operatorFilter = writable(null);

	let contributors = [];

	let pendingLoaded = false;
	let operatorsLoaded = false;

	const pendingPage = writable(0);

	// Singin', "This'll be the day that I die
	// This'll be the day that I die,"
	// -
	const forceDerivedStoresToUpdate = writable(0);

	let pendingTotal = 0;

	const pendingNews = derived(
		[pendingPage, operatorFilter, forceDerivedStoresToUpdate],
		async ([$page, $OperatorFilter], set) => {
			pendingLoaded = false;
			console.log('fetching pending external', $page);
			const fetchParams = {
				headers: {
					authorization: `Bearer ${$token}`
				}
			};

			const res = await ($OperatorFilter
				? fetch(`${apiServer}/v1/operators/${$operatorFilter}/external_news/pending`, fetchParams)
				: fetch(`${apiServer}/v1/news/external?p=${$page}`, fetchParams));
			const data = await res.json();
			pendingTotal = data.total;
			set(data.items);
			pendingLoaded = true;
		}
	);

	function refreshData() {
		console.log('refreshing data');
		// Force a data refresh
		// This should work...
		$pendingPage = $pendingPage;
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
	<title>Noticias externas</title>
	<meta name="description" content="Noticias externas" />
</svelte:head>

<div class="self-center max-w-[80em] w-full my-4">
	<div class="tabs ml-4">
		<button
			class="tab tab-md lg:tab-lg tab-lifted"
			class:tab-active={$tab === mapTabs.pending}
			on:click={() => {
				$tab = mapTabs.pending;
			}}>Pendentes</button
		>
	</div>
	<div class="card card-compact 2xl:card-normal bg-base-100 shadow-sm self-start">
		<div class="card-body">
			{#if $tab === mapTabs.pending}
				<div class="flex flex-wrap gap-2 justify-between">
					<h2 class="card-title">Conteúdos pendentes</h2>
					<Paginator
						bind:page={$pendingPage}
						bind:itemCount={pendingTotal}
						on:goto={(e) => {
							$pendingPage = e.detail.page;
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
				{#if pendingLoaded}
					<div class="flex flex-col gap-2">
						{#each $pendingNews as item (item.id)}
							<button
								class="p-2 border-2 rounded-lg cursor-pointer bg-base-100 hover:bg-base-200"
								on:click={async () => {
									editItemId = item.id;
									await tick();
									editDialog.showModal();
								}}
							>
								<ExternalNewsItem {item} />
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
					<button class="btn btn-sm btn-circle btn-error absolute right-2 top-2">x</button>
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
