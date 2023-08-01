<script>
	import { createEventDispatcher } from 'svelte';
	import ChangeViewer from '$lib/changes/ChangeViewer.svelte';
	import { apiServer } from '$lib/settings.js';
	import { token, decodedToken } from '$lib/stores.js';

	export let contribution;
	export let stops;

	export let keepVerification = false;

	let ignoredKeys = [];

	const dispatch = createEventDispatcher();

	function acceptContribution() {
		fetch(
			`${apiServer}/v1/contrib/${contribution.id}/accept?verify=${
				keepVerification ? 'true' : 'false'
			}&ignored=${ignoredKeys.join(',')}`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${$token}`
				}
			}
		).then(async (r) => {
			if (r.error) {
				alert(r.error);
			} else {
				await wipeCachedData();
				dispatch('accept', { id: contribution.id });
			}
		});
	}

	function declineContribution() {
		if (!confirm('Are you sure')) return;
		fetch(`${apiServer}/v1/contrib/${contribution.id}/decline`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${$token}`
			}
		}).then((r) => {
			if (r.error) {
				alert(r.error);
			} else {
				dispatch('reject', { id: contribution.id });
			}
		});
	}

	function close() {
		dispatch('close');
	}
</script>

<div
	class="fixed top-0 bottom-0 left-0 right-0 overflow-y-scroll grid grid-cols-1 bg-base-100 modal modal-open modal-bottom xl:modal-middle"
	style="grid-template-rows: 1fr auto;"
	on:click={close}
>
	<div class="modal-box xl:max-w-[80em]" on:click|stopPropagation={() => {}}>
		<div class="flex flex-col gap-1 max-h-[75vh]">
			<h2 class="card-title text-lg">
				#{contribution.id} por {contribution.author_username} -
				{new Date(contribution.submission_date).toString().split(' GMT')[0]}
			</h2>
			<div class="overflow-y-auto">
				<ChangeViewer change={contribution.change} {stops} bind:ignoredKeys />
				{#if contribution.comment}
					<div class="flex flex-col">
						<h4 class="label-text">Comentário:</h4>
						<textarea disabled class="w-full input input-bordered">{contribution.comment}</textarea>
					</div>
				{/if}
			</div>
		</div>
		<div class="modal-action">
			{#if $decodedToken?.permissions?.is_admin}
				<button
					class="btn btn-error"
					on:click={declineContribution}
					on:keypress={declineContribution}>Recusar</button
				>
			{/if}
			<span class="grow" />
			{#if $decodedToken?.permissions?.is_admin}
				<div class="input-group w-auto border-success">
					<span><label for="keep-verification">Manter verificação</label></span>
					<span
						><input
							id="keep-verification"
							class="checkbox checkbox-success"
							type="checkbox"
							bind:checked={keepVerification}
						/></span
					>
				</div>
			{/if}
			<button class="btn" on:click={close}>Fechar sem guardar</button>
			{#if $decodedToken?.permissions?.is_admin}
				<button class="btn btn-success" on:click={acceptContribution}>Aceitar</button>
			{/if}
		</div>
	</div>
</div>
