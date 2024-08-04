<script>
	import { writable, derived } from 'svelte/store';
	import { apiServer } from '$lib/settings';
	import { fetchStops, getStops, loadMissing } from '$lib/db';
	import { liveQuery } from 'dexie';
	import ContributionRow from '$lib/changes/rows/ContributionRow.svelte';
	import DecidedContributionRow from '$lib/changes/rows/DecidedContributionRow.svelte';
	import ChangesetRow from '$lib/changes/rows/ChangesetRow.svelte';
	import ContributionWindow from '$lib/changes/ContributionWindow.svelte';
	import ChangesetWindow from '$lib/changes/ChangesetWindow.svelte';
	import Paginator from '$lib/components/Paginator.svelte';

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

	// Singin', "This'll be the day that I die
	// This'll be the day that I die,"
	// -
	const forceDerivedStoresToUpdate = writable(0);

	let decidedTotal = 0;
	let undecidedTotal = 0;
	let changelogTotal = 0;

	const undecidedContributions = derived(
		[undecidedPage, userFilter, forceDerivedStoresToUpdate],
		([$page, $userFilter], set) => {
			undecidedLoaded = false;
			console.log('fetching undecided contributions', $page);

			return (
				$userFilter
					? fetch(`${apiServer}/v1/contrib/contributions/undecided?p=${$page}&uid=${$userFilter}`, {
							credentials: 'include'
						})
					: fetch(`${apiServer}/v1/contrib/contributions/undecided?p=${$page}`, {
							credentials: 'include'
						})
			)
				.then((res) => res.json())
				.then((res) => {
					undecidedTotal = res.total;
					set(res.items);
					undecidedLoaded = true;
				});
		}
	);

	const decidedContributions = derived(
		[decidedPage, forceDerivedStoresToUpdate],
		([$page], set) => {
			decidedLoaded = false;

			fetch(`${apiServer}/v1/contrib/contributions/decided?p=${$page}`, { credentials: 'include' })
				.then((res) => res.json())
				.then((res) => {
					decidedTotal = res.total;
					set(res.items);
					decidedLoaded = true;
				});
		}
	);

	const changelog = derived([changelogPage, forceDerivedStoresToUpdate], ([$page], set) => {
		changelogLoaded = false;
		fetch(`${apiServer}/v1/contrib/changelog?p=${$page}`, { credentials: 'include' })
			.then((res) => res.json())
			.then((res) => {
				changelogTotal = res.total;
				set(res.items);
				changelogLoaded = true;
			});
	});

	function refreshData() {
		console.log('refreshing data');
		// Force a data refresh
		// This should've worked...
		$decidedPage = $decidedPage;
		$undecidedPage = $undecidedPage;
		$changelogPage = $changelogPage;
		// It doesn't. Let's drown a kitten
		$forceDerivedStoresToUpdate = $forceDerivedStoresToUpdate + 1;
	}

	async function loadData() {
		await Promise.all([
			fetchStops(),
			fetch(`${apiServer}/v1/contrib/contributions/undecided/contributors`, {
				credentials: 'include'
			})
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
	<div class="tabs tabs-lifted tabs-md lg:tabs-lg ml-4">
		<button
			class="tab"
			class:tab-active={$tab === mapTabs.undecided}
			on:click={() => {
				$tab = mapTabs.undecided;
			}}>Por decidir</button
		>
		<button
			class="tab"
			class:tab-active={$tab === mapTabs.decided}
			on:click={() => {
				$tab = mapTabs.decided;
			}}>Decididas</button
		>
		<button
			class="tab"
			class:tab-active={$tab === mapTabs.changelog}
			on:click={() => {
				$tab = mapTabs.changelog;
			}}>Alterações</button
		>
	</div>
	<div class="card card-compact 2xl:card-normal bg-base-100 shadow-sm self-start">
		<div class="card-body">
			{#if $tab === mapTabs.undecided}
				<div class="flex flex-wrap gap-2 justify-between">
					<h2 class="card-title">Contribuições por decidir</h2>
					<Paginator
						bind:page={$undecidedPage}
						bind:itemCount={undecidedTotal}
						on:goto={(e) => {
							$undecidedPage = e.detail.page;
						}}
					/>
					{#if contributorsLoaded}
						<div class="input-group w-fit">
							<span class="bg-base-200 label-text">Filtros</span>
							<span class="label-text">Utilizador</span>
							<select bind:value={$userFilter} class="input h-full input-bordered">
								<option selected value>-------</option>
								{#each contributors as contributor}
									<option value={contributor.id}>{contributor.username}</option>
								{/each}
							</select>
						</div>
					{/if}
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
			{:else if $tab === mapTabs.decided}
				<div class="flex flex-wrap gap-2 justify-between">
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
				<div class="flex flex-wrap gap-2 justify-between">
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
		on:accept={() => {
			refreshData();
			$openContribution = null;
		}}
		on:reject={() => {
			refreshData();
			$openContribution = null;
		}}
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
