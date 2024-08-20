<script>
	import { onMount } from 'svelte';
	import { getExternalNewsItem } from '$lib/api';
	import Icon from '$lib/components/Icon.svelte';
	import ExternalNewsItem from './ExternalNewsItem.svelte';

	export let id;
	export let regions;
	export let operators;

	let item = null;

	onMount(async () => {
		item = await getExternalNewsItem(id, { toJson: true });
	});
</script>

{#if item}
	<ExternalNewsItem {item} {regions} {operators}>
		<a class="btn btn-primary btn-sm" href="/news/external/{id}" slot="actions">
			<Icon name="arrows-outwards" class="p-1 h-full fill-white" />Abrir</a
		>
	</ExternalNewsItem>
{:else}
	<div class="w-full flex justify-center">
		<span class="loading loading-dots loading-lg" />
	</div>
{/if}
