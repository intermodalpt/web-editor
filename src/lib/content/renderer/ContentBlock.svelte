<script>
	import Icon from '$lib/components/Icon.svelte';
	import ImgContent from './ImgContent.svelte';
	import MapContent from './MapContent.svelte';
	import ContentRef from './ContentRef.svelte';
	import Markdown from '$lib/components/Markdown.svelte';

	export let block;
</script>

{#if 'md' in block}
	<Markdown content={block.md} />
{:else if 'img' in block}
	<ImgContent bind:data={block.img} />
{:else if 'map' in block}
	<MapContent bind:data={block.map} />
{:else if 'ref' in block}
	<ContentRef bind:data={block.ref} />
{/if}