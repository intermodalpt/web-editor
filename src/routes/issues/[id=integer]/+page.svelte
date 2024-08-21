<script lang="ts">
	import IssueViewer from '$lib/issues/Viewer.svelte';

	export let data;
	const issue = data.issue;
</script>

<svelte:head>
	<title>Problemas - {issue.title}</title>
	<meta name="description" content="Problemas - {issue.title}" />
</svelte:head>

<div class="card-body">
	<IssueViewer {issue} />
</div>
