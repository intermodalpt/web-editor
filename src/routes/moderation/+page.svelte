<script>
	import { token } from '$lib/stores.js';
	import { api_server } from '$lib/settings.js';
	import ChangeViewer from '$lib/changes/ChangeViewer.svelte';

	/** @type {import('./$types').PageData} */
	export let data;

	let changelogPage = 1;

	function acceptContribution(contribution_id) {
		fetch(`${api_server}/v1/contrib/${contribution_id}/accept`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${$token}`
			}
		}).then((r) => {
			if (r.error) {
				alert(r.error);
			} else {
				alert('Approved!');
			}
		});
	}

	function declineContribution(contribution_id) {
		fetch(`${api_server}/v1/contrib/${contribution_id}/decline`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${$token}`
			}
		}).then((r) => {
			if (r.error) {
				alert(r.error);
			} else {
				alert('Rejected!');
			}
		});
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
				<h2 class="card-title">Contribuições por decidir</h2>
				<ul>
					{#each data.undecided as contribution}
						<li>
							<h2 class="card-title text-lg">
								#{contribution.id} por {contribution.author_id} - {new Date(
									contribution.submission_date
								)
									.toString()
									.split(' GMT')[0]}
							</h2>
							<ChangeViewer change={contribution.change} />
							{#if contribution.comment}
								<h4 class="font-bold">Comentário:</h4>
								<textarea class="w-full">{contribution.comment}</textarea>
							{/if}
						</li>
						<div class="card-actions justify-end">
							<button
								class="btn btn-success"
								on:mouseup={() => {
									acceptContribution(contribution.id);
								}}>Aceitar</button
							>
							<button
								class="btn btn-error"
								on:mouseup={() => {
									declineContribution(contribution.id);
								}}>Recusar</button
							>
						</div>
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
								{contribution.evaluator_id}
								{contribution.accepted ? 'aprovou' : 'recusou'} #{contribution.id} por {contribution.author_id}
								- {new Date(contribution.submission_date).toString().split(' GMT')[0]}
							</h2>
							<ChangeViewer change={contribution.change} />
							{#if contribution.comment}
								<h4 class="font-bold">Comentário:</h4>
								<textarea class="w-full">{contribution.comment}</textarea>
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
								#{changeset.id} - {new Date(changeset.datetime).toString().split(' GMT')[0]} - {changeset.author_id}
							</h2>
							<ul>
								{#each changeset.changes as change}
									<li>
										<ChangeViewer {change} />
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
