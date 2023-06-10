<script>
	import { createEventDispatcher } from 'svelte';
	import { token } from '$lib/stores.js';
	import { apiServer } from '$lib/settings.js';
	import ChangeViewer from '$lib/changes/ChangeViewer.svelte';

	export let stops;
	export let contribution;
	export let keepVerification = false;

	let ignoredKeys = [];

	const dispatch = createEventDispatcher();

	function acceptContribution(contribution_id) {
		fetch(
			`${apiServer}/v1/contrib/${contribution_id}/accept?verify=${
				keepVerification ? 'true' : 'false'
			}&ignored=${ignoredKeys.join(',')}`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${$token}`
				}
			}
		).then((r) => {
			if (r.error) {
				alert(r.error);
			} else {
				dispatch('accept', { contribution_id: contribution_id });
			}
		});
	}

	function declineContribution(contribution_id) {
		if (!confirm('Are you sure')) return;

		fetch(`${apiServer}/v1/contrib/${contribution_id}/decline`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${$token}`
			}
		}).then((r) => {
			if (r.error) {
				alert(r.error);
			} else {
				dispatch('reject', { contribution_id: contribution_id });
			}
		});
	}
</script>

<li>
	<h2 class="card-title text-lg">
		#{contribution.id} por {contribution.author_username} -
		{new Date(contribution.submission_date).toString().split(' GMT')[0]}
	</h2>
	<ChangeViewer change={contribution.change} {stops} bind:ignoredKeys />
	{#if contribution.comment}
		<h4 class="font-bold">Comentário:</h4>
		<textarea disabled class="w-full">{contribution.comment}</textarea>
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
