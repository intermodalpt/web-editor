<script lang="ts">
	import ChangeViewer from '$lib/changes/ChangeViewer.svelte';
	import Menu from '../Menu.svelte';

	export let data;
	const decidedContributions = data.decidedContributions;
	const undecidedContributions = data.undecidedContributions;
</script>

<div class="card-body">
	<Menu {data} page="contrib" />
	<h2 class="card-title">Alterações pendentes</h2>
	{#if undecidedContributions.length === 0}
		Sem contribuições pendentes.
	{/if}
	<ul>
		{#each undecidedContributions as contribution}
			<li>
				<h2 class="card-title text-lg">
					#{contribution.id}
					{new Date(contribution.submission_date).toString().split(' GMT')[0]}
				</h2>
				<ChangeViewer change={contribution.change} />
				{#if contribution.comment}
					<h4 class="font-bold">Comentário:</h4>
					<textarea disabled class="w-full">{contribution.comment}</textarea>
				{/if}
			</li>
		{/each}
	</ul>
	<h2 class="card-title">Contribuições aceites</h2>
	{#if decidedContributions.length === 0}
		Sem contribuições aceites.
	{/if}
	<ul>
		{#each decidedContributions as contribution}
			<li>
				<h2 class="card-title text-lg">
					#{contribution.id}
					{new Date(contribution.submission_date).toString().split(' GMT')[0]}
				</h2>
				<ChangeViewer change={contribution.change} />
				{#if contribution.comment}
					<h4 class="font-bold">Comentário:</h4>
					<textarea disabled class="w-full">{contribution.comment}</textarea>
				{/if}
			</li>
		{/each}
	</ul>
</div>
