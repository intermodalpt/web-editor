<script>
	import { writable, derived } from 'svelte/store';
	import { apiServer } from '$lib/settings';
	import ContributionRow from '$lib/changes/rows/ContributionRow.svelte';
	import DecidedContributionRow from '$lib/changes/rows/DecidedContributionRow.svelte';
	import ChangesetRow from '$lib/changes/rows/ChangesetRow.svelte';
	import ContributionWindow from '$lib/changes/ContributionWindow.svelte';
	import ChangesetWindow from '$lib/changes/ChangesetWindow.svelte';
	import Paginator from '$lib/components/Paginator.svelte';
	import { onMount } from 'svelte';
	import {
		getChangelog,
		getLatestDecidedContributions,
		getLatestUndecidedContributions,
		getUndecicedContributors
	} from '$lib/api';
	import { toast } from '$lib/stores';

	export let data;
	const stops = data.stops;

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

			getLatestUndecidedContributions($page, $userFilter, {
				onSuccess: (res) => {
					undecidedTotal = res.total;
					set(res.items);
				},
				onError: (err) => {
					undecidedTotal = 0;
					toast('Erro a obter as contribuições por decidir', 'error');
				},
				onAfter: () => {
					undecidedLoaded = true;
				},
				toJson: true
			});
		}
	);

	const decidedContributions = derived(
		[decidedPage, forceDerivedStoresToUpdate],
		([$page], set) => {
			decidedLoaded = false;

			getLatestDecidedContributions($page, {
				onSuccess: (res) => {
					decidedTotal = res.total;
					set(res.items);
				},
				onError: (err) => {
					decidedTotal = 0;
					toast('Erro a obter as contribuições decididas', 'error');
				},
				onAfter: () => {
					decidedLoaded = true;
				},
				toJson: true
			});
		}
	);

	const changelog = derived([changelogPage, forceDerivedStoresToUpdate], ([$page], set) => {
		changelogLoaded = false;

		getChangelog($page, {
			onSuccess: (res) => {
				changelogTotal = res.total;
				set(res.items);
			},
			onError: (err) => {
				changelogTotal = 0;
				toast('Erro a obter o changelog', 'error');
			},
			onAfter: () => {
				changelogLoaded = true;
			},
			toJson: true
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
</script>

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
				{#if undecidedLoaded}
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
				{#if decidedLoaded}
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
				{#if changelogLoaded}
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
