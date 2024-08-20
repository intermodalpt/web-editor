<script>
	import { liveQuery } from 'dexie';
	import { permissions } from '$lib/stores';
	import NewsItemEditor from '../NewsItemEditor.svelte';

	export let data;
	const operators = data.operators;
	const regions = data.regions;
	const operatorIndex = Object.fromEntries(operators.map((o) => [o.id, o]));
	const regionIndex = Object.fromEntries(regions.map((r) => [r.id, r]));
</script>

<svelte:head>
	<title>Nova notícia</title>
	<meta name="description" content="Nova notícia" />
</svelte:head>

<div class="self-center max-w-[80em] w-full my-4">
	<div class="card card-compact 2xl:card-normal bg-base-100 shadow-sm self-start">
		<div class="card-body">
			<NewsItemEditor operators={operatorIndex} regions={regionIndex} />
		</div>
	</div>
</div>
