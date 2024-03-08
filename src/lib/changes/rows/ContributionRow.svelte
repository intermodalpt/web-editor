<script>
	import { createEventDispatcher } from 'svelte';
	import ChangeTitle from '$lib/changes/ChangeTitle.svelte';

	export let stops;
	export let contribution;

	const dispatch = createEventDispatcher();

	function onClick() {
		dispatch('click');
	}
</script>

<li
	class="p-2 border-2 rounded-lg cursor-pointer bg-base-100 hover:bg-base-200"
	on:click={onClick}
	on:keypress={onClick}
>
	<h2 class="card-title text-lg">
		#{contribution.id}
	</h2>
	<ChangeTitle change={contribution.change} {stops} />
	{#if contribution.comment}
		<h4 class="label-text">Comentário:</h4>
		<textarea disabled class="w-full">{contribution.comment}</textarea>
	{/if}
	<div class="flex flex-wrap gap-1 justify-end">
		<span class="label-text">{contribution.author_username}</span>
		<span class="label-text">{new Date(contribution.submission_date).toLocaleString('pt')}</span>
	</div>
</li>
