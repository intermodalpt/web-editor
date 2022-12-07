<script>
	import StopUpdate from '$lib/changes/StopUpdate.svelte';
	import StopPicUpload from '$lib/changes/StopPicUpload.svelte';

	export let change;
</script>

{#if 'StopUpdate' in change}
	<StopUpdate change={change.StopUpdate} />
{:else if 'PictureUpload'}
	<StopPicUpload change={change.StopPicUpload} />
{:else}
	<textarea class="w-full">{JSON.stringify(contribution)}</textarea>
{/if}
