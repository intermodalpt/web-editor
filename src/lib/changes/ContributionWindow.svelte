<script>
	import { createEventDispatcher } from 'svelte';
	import ChangeViewer from '$lib/changes/ChangeViewer.svelte';
	import { apiServer } from '$lib/settings';
	import { permissions } from '$lib/stores';
	import { acceptContribution, declineContribution } from '$lib/api';

	export let contribution;
	export let stops;

	export let keepVerification = false;

	let ignoredKeys = [];

	const isEvaluation = $permissions.misc.contrib_evaluator && contribution.accepted == null;

	const dispatch = createEventDispatcher();

	async function handleAcceptContribution() {
		await acceptContribution(contribution.id, ignoredKeys, keepVerification, {
			onSuccess: () => {
				dispatch('accept', { id: contribution.id });
			},
			onError: (e) => {
				toast("Couldn't accept contribution", 'error');
			}
		});
	}

	async function handleDeclineContribution() {
		if (!confirm('Are you sure')) return;

		await declineContribution(contribution.id, {
			onSuccess: () => {
				dispatch('accept', { id: contribution.id });
			},
			onError: (e) => {
				toast("Couldn't decline contribution", 'error');
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
				<button class="btn btn-error" on:click={handleDeclineContribution}>Recusar</button>
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
			{#if isEvaluation && contribution.accepted != true}
				<button class="btn btn-success" on:click={handleAcceptContribution}>Aceitar</button>
			{/if}
		</div>
	</div>
</div>
