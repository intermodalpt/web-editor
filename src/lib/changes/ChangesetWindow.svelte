<script>
	import { createEventDispatcher } from 'svelte';
	import ChangeViewer from '$lib/changes/ChangeViewer.svelte';

	export let changeset;
	export let stops;

	const dispatch = createEventDispatcher();

	function close() {
		dispatch('close');
	}
</script>

<button
	class="fixed top-0 bottom-0 left-0 right-0 overflow-y-scroll grid grid-cols-1 bg-base-100 modal modal-open modal-bottom xl:modal-middle"
	style="grid-template-rows: 1fr auto;"
	on:click={close}
>
	<button class="modal-box xl:max-w-[80em]" on:click|stopPropagation={() => {}}>
		<div class="flex flex-col gap-1 max-h-[75vh]">
			<h2 class="card-title text-lg">
				#{changeset.id} por {changeset.author_username} -
				{new Date(changeset.datetime).toLocaleString('pt')}
			</h2>
			<div class="overflow-y-auto">
				{#each changeset.changes as change}
					<ChangeViewer {change} {stops} />
					<hr />
				{/each}
			</div>
		</div>
		<div class="modal-action">
			<span class="grow" />
			<button class="btn" on:click={close}>Fechar</button>
		</div>
	</button>
</button>
