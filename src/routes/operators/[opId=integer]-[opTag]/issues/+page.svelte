<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import IssueViewer from '$lib/issues/Viewer.svelte';
	import { permissions } from '$lib/stores';
	import IssueBadge from '$lib/issues/IssueBadge.svelte';
	import Menu from '../Menu.svelte';

	export let data;

	const operator = data.operator;
	const issues = data.issues;

	let dialog;
	let shownIssue;
</script>

<Menu {operator} page="issues" />

<div class="card-body">
	{#if issues.length === 0}
		<p>Não há problemas registrados para este operador.</p>
	{:else}
		<div class="grid grid-cols-1 xl:grid-cols-2 gap-2" class:hidden={issues.length === 0}>
			{#each issues as issue}
				<IssueBadge
					{issue}
					{operator}
					on:click={() => {
						shownIssue = issue;
						dialog.showModal();
					}}
				/>
			{/each}
		</div>
	{/if}
	<div class="flex justify-end">
		<a class="btn btn-primary" class:hidden={!$permissions?.misc?.modifyIssues} href="/issues/new">
			Novo
		</a>
	</div>
</div>

<dialog bind:this={dialog} class="modal modal-bottom sm:modal-middle">
	<div class="modal-box max-w-[55em]">
		{#if shownIssue}
			<IssueViewer issue={shownIssue}>
				<a class="btn btn-primary btn-sm" href="/issues/{shownIssue.id}" slot="actions">
					<Icon name="arrows-outwards" class="p-1 h-full fill-white" />Abrir</a
				>
			</IssueViewer>
		{/if}
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
