<script>
	import { createEventDispatcher } from 'svelte';
	import ChangeTitle from '$lib/changes/ChangeTitle.svelte';

	export let stops;
	export let changeset;

	const dispatch = createEventDispatcher();

	function onClick() {
		dispatch('click');
	}
</script>

<li
	class="p-2 border-2 rounded-lg cursor-pointer bg-base-200 hover:bg-base-300"
	on:click={onClick}
	on:keypress={onClick}
>
	<h2 class="card-title text-lg">
		#{changeset.id}
	</h2>
	<ul>
		{#each changeset.changes as change}
			<li>
				<ChangeTitle {change} {stops} />
			</li>
		{/each}
	</ul>
	<div class="flex flex-wrap gap-1 justify-end">
		<span class="label-text">{changeset.author_username}</span>
		<span class="label-text">{new Date(changeset.datetime).toLocaleString('pt')}</span>
	</div>
</li>
