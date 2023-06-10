<script>
	import { token } from '$lib/stores.js';
	import { writable } from 'svelte/store';
	import { apiServer } from '$lib/settings.js';
	import { getStops } from '$lib/db';
	import ChangeViewer from '$lib/changes/ChangeViewer.svelte';
	import ContributionPrompt from '$lib/changes/ContributionPrompt.svelte';

	/** @type {import('./$types').PageData} */
	export let data;

	let keepVerification = false;

	const stops = writable({});

	getStops().then((res) => {
		stops.set(res);
	});

	let undecidedContributions = [];
	let changelogPage = 0;

	loadUndecidedPage(0).then((res) => {
		undecidedContributions = res;
	});

	async function loadUndecidedPage(page) {
		return fetch(`${apiServer}/v1/contrib/contributions/undecided?p=${page}`, {
			headers: {
				authorization: `Bearer ${$token}`
			}
		}).then((res) => res.json());
	}
</script>

<svelte:head>
	<title>Contribuições</title>
	<meta name="description" content="Contribuições" />
</svelte:head>

<div class="flex flex-col gap-4 w-full max-w-5xl mt-4 self-center">
	{#await data}
		Loading
	{:then data}
		<div class="card bg-base-100 shadow-md">
			<div class="card-body">
				<div class="input-group">
					<span>Manter verificação</span>
					<input type="checkbox" bind:checked={keepVerification} />
				</div>
				<h2 class="card-title">Contribuições por decidir</h2>
				<ul>
					{#each undecidedContributions as contribution}
						<ContributionPrompt
							{contribution}
							{stops}
							{keepVerification}
							on:accept={(e) => {
								undecidedContributions = undecidedContributions.filter(
									(c) => c.id !== e.detail.contribution_id
								);
							}}
							on:reject={(e) => {
								undecidedContributions = undecidedContributions.filter(
									(c) => c.id !== e.detail.contribution_id
								);
							}}
						/>
					{/each}
				</ul>
			</div>
		</div>
		<div class="card bg-base-100 shadow-md">
			<div class="card-body">
				<h2 class="card-title">Contribuições decididas</h2>
				<ul>
					{#each data.decided as contribution}
						<li>
							<h2 class="card-title text-lg">
								{contribution.evaluator_username}
								{contribution.accepted ? 'aprovou' : 'recusou'} #{contribution.id} por {contribution.author_username}
								- {new Date(contribution.submission_date).toString().split(' GMT')[0]}
							</h2>
							<ChangeViewer change={contribution.change} {stops} />
							{#if contribution.comment}
								<h4 class="font-bold">Comentário:</h4>
								<textarea disabled class="w-full">{contribution.comment}</textarea>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		</div>
		<div class="card bg-base-100 shadow-md">
			<div class="card-body">
				<h2 class="card-title">Alterações</h2>
				{#each data.changesets.slice(0, changelogPage * 5) as changeset}
					<div class="card card-compact bg-base-100 shadow-sm">
						<div class="card-body">
							<h2 class="card-title text-lg">
								#{changeset.id} - aplicado por {changeset.author_username} em
								{new Date(changeset.datetime).toString().split(' GMT')[0]}
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
						changelogPage++;
					}}
					disabled={data.changesets.length <= changelogPage * 5}
				/>
			</div>
		</div>
	{/await}
</div>
