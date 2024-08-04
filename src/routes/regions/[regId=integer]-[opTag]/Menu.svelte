<script lang="ts">
	import {
		getRegionUrl,
		getRegionStopsUrl,
		getRegionImagesUrl,
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

<div class="px-4">
	<div role="tablist" class="tabs tabs-bordered tabs-lg mr-4">
		<a
			role="tab"
			class="tab tab-lg tab-bordered"
			class:tab-active={page == 'root'}
			href={getRegionUrl(region)}>Sumário</a
		>
		<a
			role="tab"
			class="tab tab-lg tab-bordered"
			class:tab-active={page == 'stops'}
			href={getRegionStopsUrl(region)}>Paragens</a
		>
		<a
			role="tab"
			class="tab tab-lg tab-bordered"
			class:tab-active={page == 'attrs'}
			href={getRegionImagesUrl(region)}>Imagens</a
		>
		<a
			role="tab"
			class="tab tab-lg tab-bordered"
			class:tab-active={page == 'attrs'}
			href={getRegionTodoUrl(region)}>Tarefas</a
		>
		<a
			role="tab"
			class="tab tab-lg tab-bordered"
			class:tab-active={page == 'state'}
			href={getRegionIssuesUrl(region)}>Problemas</a
		>
		<a
			role="tab"
			class="tab tab-lg tab-bordered"
			class:tab-active={page == 'state'}
			href={getRegionStatsUrl(region)}>Estatisticas</a
		>
	</div>
</div>
