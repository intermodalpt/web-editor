<script lang="ts">
	import NewsItem from '$lib/news/viewer/NewsItem.svelte';

	export let data;
	const item = data.item;
	const operators = data.operators;
	const regions = data.regions;
	const operatorIndex = Object.fromEntries(operators.map((o) => [o.id, o]));
	const regionIndex = Object.fromEntries(regions.map((r) => [r.id, r]));
</script>

<div class="w-full max-w-[900px] self-center">
	<div class="breadcrumbs my-1">
		<ul>
			<li><a class="link" href="/news">Notícias</a></li>
			<li><a class="link" href="/news/{item.id}">{item.title}</a></li>
		</ul>
	</div>

	<div class="card self-center bg-base-100 shadow-sm w-full">
		<div class="card-body">
			<NewsItem item={data.item} regions={regionIndex} operators={operatorIndex} />
		</div>
	</div>
</div>
