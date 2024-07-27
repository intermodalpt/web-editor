<script>
	import { createEventDispatcher } from 'svelte';
	import ChangeViewer from '$lib/changes/ChangeViewer.svelte';
	import { apiServer } from '$lib/settings.js';
	import { permissions } from '$lib/stores.js';
	import { isAdmin } from '$lib/permissions.ts';

	export let contribution;
	export let stops;

	export let keepVerification = false;

	let ignoredKeys = [];

	const hasAdminPerm = isAdmin($permissions);
	const isEvaluation = hasAdminPerm && contribution.accepted == null;

	const dispatch = createEventDispatcher();

	function acceptContribution() {
		fetch(
			`${apiServer}/v1/contrib/${contribution.id}/accept?verify=${
				keepVerification ? 'true' : 'false'
			}&ignored=${ignoredKeys.join(',')}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include'
			}
		)
			.catch((e) => {
				alert("Couldn't decline contribution: " + e.message);
				console.error(e);
			})
			.then(async (r) => {
				if (r.ok) {
					// await wipeCachedData();
					dispatch('accept', { id: contribution.id });
				} else {
					alert("Couldn't accept contribution: " + r.status + ' ' + r.statusText);
				}
			});
	}

	function declineContribution() {
		if (!confirm('Are you sure')) return;
		fetch(`${apiServer}/v1/contrib/${contribution.id}/decline`, {
			method: 'POST',
			credentials: 'include'
		})
			.catch((e) => {
				alert("Couldn't decline contribution: " + e.message);
				console.error(e);
			})
			.then((r) => {
				if (r.ok) {
					dispatch('reject', { id: contribution.id });
				} else {
					alert("Couldn't decline contribution: " + r.status + ' ' + r.statusText);
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
	on:keypress={close}
>
	<div
		class="modal-box xl:max-w-[80em]"
		on:click|stopPropagation={() => {}}
		on:keypress|stopPropagation={() => {}}
	>
		<div class="flex flex-col gap-1 max-h-[75vh]">
			<h2 class="card-title text-lg">
				#{contribution.id} por {contribution.author_username} -
				{new Date(contribution.submission_date).toString().split(' GMT')[0]}
			</h2>
			<div class="overflow-y-auto">
				<ChangeViewer change={contribution.change} {stops} {isEvaluation} bind:ignoredKeys />
				{#if contribution.comment}
					<div class="flex flex-col">
						<h4 class="label-text">Comentário:</h4>
						<textarea disabled class="w-full input input-bordered">{contribution.comment}</textarea>
					</div>
				{/if}
			</div>
		</div>
		<div class="modal-action">
			{#if isEvaluation}
				<button class="btn btn-error" on:click={declineContribution}>Recusar</button>
			{/if}
			<span class="grow" />
			{#if isEvaluation}
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
			<button class="btn" on:click={close}>Fechar</button>
			{#if hasAdminPerm && contribution.accepted != true}
				<button class="btn btn-success" on:click={acceptContribution}>Aceitar</button>
			{/if}
		</div>
	</div>
</div>
