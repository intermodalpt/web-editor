<script>
	import { liveQuery } from 'dexie';
	import { permissions } from '$lib/stores';
	import { isAdmin } from '$lib/permissions';
	import { getOperators, fetchOperators, getRegions, fetchRegions, loadMissing } from '$lib/db';
	import NewsItemEditor from '../NewsItemEditor.svelte';

	const operators = liveQuery(() => getOperators());
	const regions = liveQuery(() => getRegions());

	async function loadData() {
		await Promise.all([fetchOperators(), fetchRegions()]);
	}

	loadData().then(async () => {
		console.log('data loaded');
		await loadMissing();
	});
</script>

<svelte:head>
	<title>Nova notícia</title>
	<meta name="description" content="Nova notícia" />
</svelte:head>

<div class="self-center max-w-[80em] w-full my-4">
	<div class="card card-compact 2xl:card-normal bg-base-100 shadow-sm self-start">
		<div class="card-body">
			<NewsItemEditor {operators} {regions} canEdit={isAdmin($permissions)} />
		</div>
	</div>
</div>
