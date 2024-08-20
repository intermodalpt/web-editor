<script lang="ts">
	import { goto } from '$app/navigation';
	import { externalContentToContentBlocks } from '$lib/content/utils';
	import NewsItem from '$lib/news/editor/NewsItem.svelte';

	export let data;
	const operators = data.operators;
	const regions = data.regions;
	const operatorIndex = Object.fromEntries(operators.map((o) => [o.id, o]));
	const regionIndex = Object.fromEntries(regions.map((r) => [r.id, r]));

	const externalItem = data.item;
	const internalItem = {
		title: externalItem.title,
		summary: externalItem.summary,
		content: externalContentToContentBlocks(
			externalItem.content_md || externalItem.prepro_content_md,
			externalItem.source,
			externalItem.url
		),
		region_ids: externalItem.region_ids,
		operator_ids: externalItem.operator_ids,
		author_override: externalItem.author,
		publish_datetime: externalItem.publish_datetime,
		edit_datetime: null,
		thumbId: null,
		external_rels: [{ id: externalItem.id }],
		is_visible: true
	};

	function onSave(e) {
		goto(`/news/external/${e.detail.id}`);
	}
</script>

<div class="w-full max-w-[900px] self-center">
	<div class="breadcrumbs my-1">
		<ul>
			<li><a class="link" href="/news">Notícias</a></li>
			<li><span>Externas</span></li>
			<li><a class="link" href="/news/external/{externalItem.id}">{externalItem.title}</a></li>
			<li><a class="link" href="/news/external/{externalItem.id}/edit">Importar</a></li>
		</ul>
	</div>

	<div class="card self-center bg-base-100 shadow-sm w-full">
		<div class="card-body">
			<NewsItem
				item={internalItem}
				regions={regionIndex}
				operators={operatorIndex}
				on:save={onSave}
			/>
		</div>
	</div>
</div>
