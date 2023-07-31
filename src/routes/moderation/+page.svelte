<script>
	import { token } from '$lib/stores.js';
	import { writable, derived } from 'svelte/store';
	import { apiServer } from '$lib/settings.js';
	import { fetchStops, getStops, loadMissing } from '$lib/db';
	import { liveQuery } from 'dexie';
	import ChangeViewer from '$lib/changes/ChangeViewer.svelte';
	import ContributionPrompt from '$lib/changes/ContributionPrompt.svelte';

	const stops = liveQuery(() => getStops());

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

<div class="grid grid-cols-1 2xl:grid-cols-3 gap-4 w-full p-4 self-center min-h-0">
	<div class="card bg-base-100 shadow-md self-start">
		<div class="card-body">
			<h2 class="card-title">Contribuições por decidir</h2>
			{#if contributorsLoaded}
				<div class="flex justify-between">
					<div class="input-group">
						<span>Manter verificação</span>
						<input type="checkbox" bind:checked={keepVerification} />
					</div>
					<div class="input-group w-fit">
						<span>Utilizador</span>
						<select bind:value={$userFilter} class="input input-bordered">
							{#each contributors as contributor}
								<option value={contributor.id}>{contributor.username}</option>
							{/each}
						</select>
					</div>
				</div>
			{/if}
			{#if $stops && undecidedLoaded}
				<ul>
					{#each $undecidedContributions || [] as contribution (contribution.id)}
						<ContributionPrompt
							{contribution}
							{stops}
							{keepVerification}
							on:accept={(e) => {
								// undecidedContributions = undecidedContributions.filter(
								// 	(c) => c.id !== e.detail.contribution_id
								// );
							}}
							on:reject={(e) => {
								// undecidedContributions = undecidedContributions.filter(
								// 	(c) => c.id !== e.detail.contribution_id
								// );
							}}
						/>
						<hr />
					{/each}
				</ul>
			{:else}
				<div class="w-full flex justify-center">
					<span class="loading loading-dots loading-lg" />
				</div>
			{/if}
		</div>
	</div>
	<div class="card bg-base-100 shadow-md self-start">
		<div class="card-body">
			<h2 class="card-title">Contribuições decididas</h2>
			{#if $stops && decidedLoaded}
				<ul>
					{#each $decidedContributions || [] as contribution}
						<li>
							<h2 class="card-title text-lg">
								{contribution.evaluator_username}
								{contribution.accepted ? 'aprovou' : 'recusou'} #{contribution.id} por {contribution.author_username}
								- {new Date(contribution.submission_date).toLocaleString('pt')}
							</h2>
							<ChangeViewer change={contribution.change} {stops} />
							{#if contribution.comment}
								<h4 class="font-bold">Comentário:</h4>
								<textarea disabled class="w-full">{contribution.comment}</textarea>
							{/if}
						</li>
					{/each}
				</ul>
			{:else}
				<div class="w-full flex justify-center">
					<span class="loading loading-dots loading-lg" />
				</div>
			{/if}
		</div>
	</div>
	<div class="card bg-base-100 shadow-md self-start">
		<div class="card-body">
			<h2 class="card-title">Alterações</h2>
			{#if $stops && changelogLoaded}
				{#each $changelog?.slice(0, ($changelogPage + 1) * 5) || [] as changeset}
					<div class="card card-compact bg-base-100 shadow-sm">
						<div class="card-body">
							<h2 class="card-title text-lg">
								#{changeset.id} - aplicado por {changeset.author_username} em
								{new Date(changeset.datetime).toLocaleString('pt')}
							</h2>
							<ul>
								{#each changeset.changes as change}
									<li>
										<ChangeViewer {change} {stops} />
									</li>
								{/each}
							</ul>
						</div>
					</div>
				{/each}
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
