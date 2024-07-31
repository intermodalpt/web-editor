<script>
	import { createEventDispatcher } from 'svelte';
	export let calendar;

	const dispatcher = createEventDispatcher();

	function handleClick() {
		dispatcher('click', { calendar });
	}
</script>

<button
	class="flex gap-2 p-2 rounded-lg border-[1px] shadow-sm hover:bg-zinc-50"
	on:click={handleClick}
>
	<span class="text-3xl font-light w-10">{calendar.id}</span>
	<div class="flex flex-col gap-1 items-start">
		<h3 class="text-lg font-bold">{calendar.name}</h3>
		<div class="flex gap-1">
			{#each calendar.calendar.weekdays as weekday}
				{#if weekday === 0}
					<div class="badge badge-secondary">Seg.</div>
				{:else if weekday === 1}
					<div class="badge badge-secondary">Ter.</div>
				{:else if weekday === 2}
					<div class="badge badge-secondary">Qua.</div>
				{:else if weekday === 3}
					<div class="badge badge-secondary">Qui.</div>
				{:else if weekday === 4}
					<div class="badge badge-secondary">Sex.</div>
				{:else if weekday === 5}
					<div class="badge badge-secondary">Sáb.</div>
				{:else if weekday === 6}
					<div class="badge badge-secondary">Dom.</div>
				{:else if weekday === 7}
					<div class="badge badge-secondary">?</div>
				{/if}
			{/each}
		</div>
		{#if calendar.calendar.only_if.length > 0}
			<div class="flex gap-1">
				<span>Só se:</span>
				{#each calendar.calendar.only_if as condition}
					<div class="badge badge-info">{condition.condition}</div>
				{/each}
			</div>
		{/if}
		{#if calendar.calendar.except_if.length > 0}
			<div class="flex gap-1">
				<span>Excepto se:</span>
				{#each calendar.calendar.except_if as condition}
					<div class="badge badge-error">{condition.condition}</div>
				{/each}
			</div>
		{/if}
		{#if calendar.calendar.also_if.length > 0}
			<div class="flex gap-1">
				<span>Também se:</span>
				{#each calendar.calendar.also_if as condition}
					<div class="badge badge-success">{condition.condition}</div>
				{/each}
			</div>
		{/if}
	</div>
</button>
