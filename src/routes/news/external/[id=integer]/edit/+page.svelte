<script lang="ts">
	import { goto } from '$app/navigation';
	import ExternalNewsItem from '$lib/news/editor/ExternalNewsItem.svelte';

	export let data;
	const item = data.item;
	const operators = data.operators;
	const regions = data.regions;
	const operatorIndex = Object.fromEntries(operators.map((o) => [o.id, o]));
	const regionIndex = Object.fromEntries(regions.map((r) => [r.id, r]));

	function onSave(e) {
		goto(`/news/external/${e.detail.id}`);
	}

	console.log(item);
</script>

<div class="w-full max-w-[900px] self-center">
	<div class="breadcrumbs my-1">
		<ul>
			<li><a class="link" href="/news">Notícias</a></li>
			<li><span>Externas</span></li>
			<li><a class="link" href="/news/external/{item.id}">{item.title}</a></li>
			<li><a class="link" href="/news/external/{item.id}/edit">Editar</a></li>
		</ul>
	</div>

	<div class="card self-center bg-base-100 shadow-sm w-full">
		<div class="card-body">
			<ExternalNewsItem {item} regions={regionIndex} operators={operatorIndex} on:save={onSave} />
		</div>
	</div>
</div>
