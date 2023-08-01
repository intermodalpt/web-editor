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

	const stops = liveQuery(() => getStops());

	const openContribution = writable(null);

	const userFilter = writable(null);

	let keepVerification = false;

	let contributors = [];

	let undecidedLoaded = false;
	let decidedLoaded = false;
	let changelogLoaded = false;
	let contributorsLoaded = false;

	const undecidedPage = writable(0);
	const decidedPage = writable(0);
	const changelogPage = writable(0);

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
					set(res);
					undecidedLoaded = true;
				});
		}
	);

	const decidedContributions = derived([decidedPage], ([$page], set) => {
		const fetchParams = {
			headers: {
				authorization: `Bearer ${$token}`
			}
		};

		fetch(`${apiServer}/v1/contrib/contributions/decided?p=${$page}`, fetchParams)
			.then((res) => res.json())
			.then((res) => {
				set(res);
				decidedLoaded = true;
			});
	});

	const changelog = derived([decidedPage], ([$page], set) => {
		const fetchParams = {
			headers: {
				authorization: `Bearer ${$token}`
			}
		};
		fetch(`${apiServer}/v1/contrib/changelog`, fetchParams)
			.then((res) => res.json())
			.then((res) => {
				set(res);
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

<div class="grid grid-cols-1 xl:grid-cols-3 gap-4 w-full p-4 self-center min-h-0">
	<div class="card card-compact 2xl:card-normal bg-base-100 shadow-md self-start">
		<div class="card-body">
			<h2 class="card-title">Contribuições por decidir</h2>
			{#if $stops && undecidedLoaded}
				<ul class="flex flex-col gap-2">
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
		</div>
	</div>
	<div class="card card-compact 2xl:card-normal bg-base-100 shadow-md self-start">
		<div class="card-body">
			<h2 class="card-title">Contribuições decididas</h2>
			{#if $stops && decidedLoaded}
				<ul class="flex flex-col gap-2">
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
		</div>
	</div>
	<div class="card card-compact 2xl:card-normal bg-base-100 shadow-md self-start">
		<div class="card-body">
			<h2 class="card-title">Alterações aplicadas</h2>
			{#if $stops && changelogLoaded}
				<ul class="flex flex-col gap-2">
					{#each $changelog?.slice(0, ($changelogPage + 1) * 5) || [] as changeset}
						<ChangesetRow {changeset} {stops} />
					{/each}
				</ul>
				<input
					type="button"
					class="btn btn-neutral"
					value="Mostar mais"
					on:mouseup={() => {
						$changelogPage++;
					}}
					disabled={$changelog && $changelog.length <= ($changelogPage + 1) * 5}
				/>
			{:else}
				<div class="w-full flex justify-center">
					<span class="loading loading-dots loading-lg" />
				</div>
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
