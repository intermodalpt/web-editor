<script>
	import { token } from '$lib/stores.js';
	import { writable, derived } from 'svelte/store';
	import { apiServer } from '$lib/settings.js';
	import { fetchStops, getStops, loadMissing } from '$lib/db';
	import { liveQuery } from 'dexie';
	import ContributionRow from '$lib/changes/rows/ContributionRow.svelte';
	import DecidedContributionRow from '$lib/changes/rows/DecidedContributionRow.svelte';
	import ChangesetRow from '$lib/changes/rows/ChangesetRow.svelte';
	import ContributionWindow from '$lib/changes/ContributionWindow.svelte';
	import ChangesetWindow from '$lib/changes/ChangesetWindow.svelte';
	import Paginator from '$lib/editor/Paginator.svelte';

	const stops = liveQuery(() => getStops());

	const mapTabs = {
		undecided: 0,
		decided: 1,
		changelog: 2
	};

	const tab = writable(mapTabs.undecided);

	const openContribution = writable(null);
	const openChangeset = writable(null);

	const userFilter = writable(null);

	let contributors = [];

	let undecidedLoaded = false;
	let decidedLoaded = false;
	let changelogLoaded = false;
	let contributorsLoaded = false;

	const undecidedPage = writable(0);
	const decidedPage = writable(0);
	const changelogPage = writable(0);

	let decidedTotal = 0;
	let undecidedTotal = 0;
	let changelogTotal = 0;

	const undecidedContributions = derived(
		[undecidedPage, userFilter],
		([$page, $userFilter], set) => {
			undecidedLoaded = false;
			const fetchParams = {
				headers: {
					authorization: `Bearer ${$token}`
				}
			};

			return (
				$userFilter
					? fetch(
							`${apiServer}/v1/contrib/contributions/undecided?p=${$page}&uid=${$userFilter}`,
							fetchParams
					  )
					: fetch(`${apiServer}/v1/contrib/contributions/undecided?p=${$page}`, fetchParams)
			)
				.then((res) => res.json())
				.then((res) => {
					undecidedTotal = res.total;
					set(res.items);
					undecidedLoaded = true;
				});
		}
	);

	const decidedContributions = derived([decidedPage], ([$page], set) => {
		decidedLoaded = false;
		const fetchParams = {
			headers: {
				authorization: `Bearer ${$token}`
			}
		};

		fetch(`${apiServer}/v1/contrib/contributions/decided?p=${$page}`, fetchParams)
			.then((res) => res.json())
			.then((res) => {
				decidedTotal = res.total;
				set(res.items);
				decidedLoaded = true;
			});
	});

	const changelog = derived([changelogPage], ([$page], set) => {
		changelogLoaded = false;
		const fetchParams = {
			headers: {
				authorization: `Bearer ${$token}`
			}
		};
		fetch(`${apiServer}/v1/contrib/changelog?p=${$page}`, fetchParams)
			.then((res) => res.json())
			.then((res) => {
				changelogTotal = res.total;
				set(res.items);
				changelogLoaded = true;
			});
	});

	async function loadData() {
		let fetchParams = {
			headers: {
				authorization: `Bearer ${$token}`
			}
		};
		await Promise.all([
			fetchStops(),
			fetch(`${apiServer}/v1/contrib/contributions/undecided/contributors`, fetchParams)
				.then((res) => res.json())
				.then((res) => {
					contributors = res;
					contributorsLoaded = true;
				})
		]);
	}

	loadData().then(async () => {
		console.log('data loaded');
		await loadMissing();
	});
</script>

<svelte:head>
	<title>Contribuições</title>
	<meta name="description" content="Contribuições" />
</svelte:head>

<div class="self-center max-w-[80em] w-full my-4">
	<div class="tabs ml-4">
		<a
			class="tab tab-md lg:tab-lg tab-lifted"
			class:tab-active={$tab === mapTabs.undecided}
			on:click={() => {
				$tab = mapTabs.undecided;
			}}>Por decidir</a
		>
		<a
			class="tab tab-md lg:tab-lg tab-lifted"
			class:tab-active={$tab === mapTabs.decided}
			on:click={() => {
				$tab = mapTabs.decided;
			}}>Decididas</a
		>
		<a
			class="tab tab-md lg:tab-lg tab-lifted"
			class:tab-active={$tab === mapTabs.changelog}
			on:click={() => {
				$tab = mapTabs.changelog;
			}}>Alterações</a
		>
	</div>
	<div class="card card-compact 2xl:card-normal bg-base-100 shadow-md self-start">
		<div class="card-body">
			{#if $tab === mapTabs.undecided}
				<div class="flex flex-wrap justify-between">
					<h2 class="card-title">Contribuições por decidir</h2>
					<Paginator
						bind:page={$undecidedPage}
						bind:itemCount={undecidedTotal}
						on:goto={(e) => {
							$undecidedPage = e.detail.page;
						}}
					/>
				</div>
				{#if $stops && undecidedLoaded}
					<ul class="grid grid-cols-1 lg:grid-cols-2 gap-2">
						{#each $undecidedContributions || [] as contribution (contribution.id)}
							<ContributionRow
								{contribution}
								{stops}
								on:click={() => {
									$openContribution = contribution;
								}}
							/>
						{/each}
					</ul>
				{:else}
					<div class="w-full flex justify-center">
						<span class="loading loading-dots loading-lg" />
					</div>
				{/if}
				{#if contributorsLoaded}
					<div class="flex justify-between">
						<div class="input-group w-fit">
							<span class="bg-base-200">Filtros</span>
							<span>Utilizador</span>
							<select bind:value={$userFilter} class="input input-bordered">
								<option selected value>-------</option>
								{#each contributors as contributor}
									<option value={contributor.id}>{contributor.username}</option>
								{/each}
							</select>
						</div>
					</div>
				{/if}
			{:else if $tab === mapTabs.decided}
				<div class="flex flex-wrap justify-between">
					<h2 class="card-title">Contribuições decididas</h2>
					<Paginator
						bind:page={$decidedPage}
						bind:itemCount={decidedTotal}
						on:goto={(e) => {
							$decidedPage = e.detail.page;
						}}
					/>
				</div>
				{#if $stops && decidedLoaded}
					<ul class="grid grid-cols-1 lg:grid-cols-2 gap-2">
						{#each $decidedContributions || [] as contribution}
							<DecidedContributionRow
								{contribution}
								{stops}
								on:click={() => {
									$openContribution = contribution;
								}}
							/>
						{/each}
					</ul>
				{:else}
					<div class="w-full flex justify-center">
						<span class="loading loading-dots loading-lg" />
					</div>
				{/if}
			{:else if $tab === mapTabs.changelog}
				<div class="flex flex-wrap justify-between">
					<h2 class="card-title">Alterações aplicadas</h2>
					<Paginator
						bind:page={$changelogPage}
						bind:itemCount={changelogTotal}
						on:goto={(e) => {
							$changelogPage = e.detail.page;
						}}
					/>
				</div>
				{#if $stops && changelogLoaded}
					<ul class="grid grid-cols-1 lg:grid-cols-2 gap-2">
						{#each $changelog || [] as changeset}
							<ChangesetRow
								{changeset}
								{stops}
								on:click={() => {
									$openChangeset = changeset;
								}}
							/>
						{/each}
					</ul>
				{:else}
					<div class="w-full flex justify-center">
						<span class="loading loading-dots loading-lg" />
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>

{#if $openContribution}
	<ContributionWindow
		contribution={$openContribution}
		{stops}
		on:close={() => {
			$openContribution = null;
		}}
	/>
{/if}
{#if $openChangeset}
	<ChangesetWindow
		changeset={$openChangeset}
		{stops}
		on:close={() => {
			$openChangeset = null;
		}}
	/>
{/if}
