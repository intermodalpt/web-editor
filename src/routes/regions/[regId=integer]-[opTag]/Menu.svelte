<script lang="ts">
	import {
		getRegionUrl,
		getRegionStopsUrl,
		getRegionTodoUrl,
		getRegionIssuesUrl,
		getRegionStatsUrl
	} from '$lib/urls';

	export let region;
	export let page: string;
</script>

<div class="card-body">
	<h2 class="card-title text-3xl">{region.name}</h2>
</div>

<div role="tablist" class="tabs tabs-bordered tabs-lg overflow-x-auto menu-scroll-shadows">
	<a role="tab" class="tab" class:tab-active={page == 'root'} href={getRegionUrl(region)}>Sumário</a
	>
	<a role="tab" class="tab" class:tab-active={page == 'stops'} href={getRegionStopsUrl(region)}
		>Paragens</a
	>
	<a role="tab" class="tab" class:tab-active={page == 'todo'} href={getRegionTodoUrl(region)}
		>Tarefas</a
	>
	<a role="tab" class="tab" class:tab-active={page == 'issues'} href={getRegionIssuesUrl(region)}
		>Problemas</a
	>
	<a role="tab" class="tab" class:tab-active={page == 'stats'} href={getRegionStatsUrl(region)}
		>Estatisticas</a
	>
</div>