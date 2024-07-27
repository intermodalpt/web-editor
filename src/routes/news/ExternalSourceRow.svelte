<script>
	import { onMount, createEventDispatcher } from 'svelte';
	import { toast } from '$lib/stores.js';
	import { apiServer } from '$lib/settings.js';
	import Icon from '$lib/components/Icon.svelte';
	import ExternalNewsItemImporter from './ExternalNewsItemImporter.svelte';

	const dispatch = createEventDispatcher();

	export let externalId;
	export let operators;
	export let regions;
	export let canEdit;

	let externalItem;
	let externalDialog;

	export function closeDialog() {
		externalDialog.close();
	}

	onMount(async () => {
		const res = await fetch(`${apiServer}/v1/news/external/${externalId}/full`, {
			credentials: 'include'
		});

		if (!res.ok) {
			toast(`Erro ao carregar notícia externa ${externalId}`, 'error');
			return;
		}
		externalItem = await res.json();
	});
</script>

<div class="flex gap-2 w-full items-center">
	<button
		class="input content-center bg-base-300 rounded-lg border-2"
		class:border-success={externalItem}
		class:border-error={!externalItem}
		on:click={() => {
			externalDialog.showModal();
			dispatch('open-dialog', {
				dialog: externalDialog
			});
		}}>#{externalId}</button
	>
	<span class="grow text-lg font-bold text-left">{externalItem?.title ?? 'Sem título'}</span>
	<button class="btn btn-xs btn-error" on:click={() => dispatch('delete', { id: externalId })}>
		<Icon name="close" class="h-4 stroke-current" />
	</button>
</div>

<dialog bind:this={externalDialog} class="modal modal-bottom sm:modal-middle">
	<div class="modal-box relative z-30 sm:max-w-5xl">
		<div>
			<form method="dialog">
				<button class="btn btn-sm btn-circle btn-error absolute right-2 top-2">
					<Icon name="close" class="h-4 stroke-current" />
				</button>
			</form>
			{#key externalId}
				{#if externalItem}
					<ExternalNewsItemImporter
						{externalItem}
						{operators}
						{regions}
						{canEdit}
						on:sync-title
						on:sync-summary
						on:sync-content
						on:sync-regions
						on:sync-operators
						on:sync-pub-date
						on:sync-edit-date
						on:sync-author
						on:sync-all
						on:import-img
					/>
				{/if}
			{/key}
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button></button>
	</form>
</dialog>
