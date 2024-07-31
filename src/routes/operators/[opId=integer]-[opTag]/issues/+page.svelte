<script lang="ts">
	import { permissions } from '$lib/stores';
	import Menu from '../Menu.svelte';

	export let data;

	const operator = data.operator;
	const issues = data.issues;
</script>

<Menu {operator} page="issues" />

<div class="card-body">
	<p>Não existem problemas registados neste operador.</p>
</div>

<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
	{#each issues as issue}
		<div class="card card-compact">
			<div class="card-body">
				<div class="flex gap-1">
					<span>Afecto a</span>
					<div class="flex">
						{#each issue.operator as issueOperator}
							<span class="badge badge-secondary">{issueOperator.name}</span>
						{/each}
					</div>
				</div>
				<h2 class="card-title">
					<a href="/operators/{operator.id}-{operator.tag}/issues/{issue.id}">{issue.title}</a>
				</h2>
				<div class="flex gap-2">
					<span>Linhas</span>
					{#each issue.routes as routes}
						<div class="flex">
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
				<div class="flex gap-2">
					<span>Stops</span>
					{#each issue.stops as stop}
						<span class="badge badge-outline">{stop.id} - {stop.name}</span>
					{/each}
				</div>
			</div>
		</div>
	{/each}
</div>

<div class="card-body">
	<div class="flex justify-end">
		<a class="btn" class:hidden={!$permissions?.misc?.modify_issues} href="/issues/new">
			Adicionar problema
		</a>
	</div>
</div>
