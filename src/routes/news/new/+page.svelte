<script>
	import { liveQuery } from 'dexie';
	import { decodedToken } from '$lib/stores.js';
	import { getOperators, fetchOperators, getRegions, fetchRegions, loadMissing } from '$lib/db';
	import NewsItemEditor from '../NewsItemEditor.svelte';

	const isAdmin = $decodedToken?.permissions?.is_admin || false;
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
			<NewsItemEditor {operators} {regions} canEdit={isAdmin} />
		</div>
	</div>
</div>
