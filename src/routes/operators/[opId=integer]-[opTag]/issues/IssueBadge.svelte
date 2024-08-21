<script>
	import { createEventDispatcher } from 'svelte';

	export let issue;
	export let operator;

	const showOperators =
		(!operator && issue.operators.length > 0) || (operator && issue.operators.length > 1);

	const dispatcher = createEventDispatcher();

	function handleClick() {
		dispatcher('click', { issueId: issue.id });
	}
</script>

<button
	class="flex flex-col gap-2 p-2 rounded-lg border-[1px] shadow-sm hover:bg-zinc-50"
	on:click={handleClick}
>
	<h2 class="card-title">{issue.title}</h2>
	<div class="flex flex-wrap gap-2">
		<span>Linhas</span>
		{#each issue.routes as routes}
			<div class="flex items-center">
				<span
					class="rounded-l-full px-1 font-bold"
					style="color: {routes.badge_text}; background-color: {routes.badge_bg}"
				>
					{routes.code}
				</span>
				<span class="badge rounded-r-full badge-outline">{routes.name}</span>
			</div>
		{/each}
	</div>
	<div class="flex flex-wrap gap-2 items-center">
		<span>Paragens</span>
		{#each issue.stops as stop}
			<span class="badge badge-outline">{stop.id} - {stop.name}</span>
		{/each}
	</div>
	{#if showOperators}
		<div class="flex gap-1">
			<span>Afecto a</span>
			<div class="flex flex-wrap">
				{#each issue.operators as issueOperator}
					<span class="badge badge-secondary">{issueOperator.name}</span>
				{/each}
			</div>
		</div>
	{/if}
</button>
