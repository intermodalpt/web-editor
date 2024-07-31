<script lang="ts">
	import { permissions } from '$lib/stores';
	import Menu from '../Menu.svelte';

	export let data;

	const operator = data.operator;
	const calendars = data.calendars;
</script>

<Menu {operator} page="calendars" />

<div class="card-body">
	{#if calendars.length == 0}
		<p>Sem calendários introduzidos neste operador.</p>
	{/if}
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
		{#each calendars as calendar}
			<div class="flex gap-2 p-2 rounded-lg border-[1px] shadow-sm">
				<span class="text-3xl font-light w-10">{calendar.id}</span>
				<div class="flex flex-col gap-1">
					<span class="text-lg font-bold">{calendar.name}</span>
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
			</div>
		{/each}
	</div>
</div>
