<script>
	import { token, decodedToken, loadToken } from '$lib/stores.js';
	import { api_server } from '$lib/settings.js';

	/** @type {import('./$types').PageData} */
	export let data;

	let changelogPage = 1;

	const is_authorized = false;

	function accept_contribution(contribution_id) {
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

	function decline_contribution(contribution_id) {
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

	// Strips an object of properties whose value is null
	function stripNulls(obj) {
		return Object.fromEntries(Object.entries(obj).filter(([key, value]) => value !== null));
	}

	function listDifferences(original, patch) {
		const changes = [];
		for (const [key, value] of Object.entries(patch)) {
			if (value === null) {
				continue;
			}
			if (original[key] !== value) {
				changes.push({ key, original: original[key], new: value });
			}
		}
		return changes;
	}

	function prepareChange(change) {
		if ('StopUpdate' in change) {
			let diffs = listDifferences(change.StopUpdate.original, change.StopUpdate.patch);
			return {
				title: `Stop change ${change.StopUpdate.original.id}, ${
					change.StopUpdate.original.name ||
					change.StopUpdate.original.official_name ||
					change.StopUpdate.osm_name
				}`,
				diffs: diffs
			};
		} else if ('StopPicUpload' in change) {
			return {
				title: `New pic ${change.StopPicUpload.pic.id}, ${change.StopPicUpload.pic.original_filename}`,
				diffs: [
					{ key: 'upload_date', original: null, new: change.StopPicUpload.pic.upload_date },
					{ key: 'public', original: null, new: change.StopPicUpload.pic.public },
					{ key: 'sensitive', original: null, new: change.StopPicUpload.pic.sensitive },
					{ key: 'notes', original: null, new: change.StopPicUpload.pic.notes },
					{ key: 'width', original: null, new: change.StopPicUpload.pic.width },
					{ key: 'height', original: null, new: change.StopPicUpload.pic.height }
				]
			};
		} else {
			return {
				raw: change
			};
		}
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
						<li>{JSON.stringify(contribution)}</li>
					{/each}
				</ul>
			</div>
		</div>
		<div class="card bg-base-100 shadow-md">
			<div class="card-body">
				<h2 class="card-title">Contribuições decididas</h2>
				<ul>
					{#each data.decided as contribution}
						<li>{JSON.stringify(contribution)}</li>
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
								{changeset.id} - {new Date(changeset.datetime).toString().split(' (')[0]} - From {changeset.contribution_id},
								Committed by {changeset.author_id}
							</h2>
							<ul>
								{#each changeset.changes.map(prepareChange) as change}
									<li>
										{#if 'raw' in change}
											<textarea disabled class="w-full h-36"
												>{JSON.stringify(change.raw, undefined, 4)}</textarea
											>
										{:else}
											<h3 class="font-bold">{change.title}</h3>
											<ul>
												{#each change.diffs as diff}
													<li>
														{diff.key}:
														{#if diff.original}<span class="bg-red-300">{diff.original}</span>{/if}
														-> <span class="bg-green-300">{diff.new}</span>
													</li>
												{/each}
											</ul>
										{/if}
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
					disabled={data.changesets.length <=  changelogPage * 5}
				/>
			</div>
		</div>
	{/await}
</div>
