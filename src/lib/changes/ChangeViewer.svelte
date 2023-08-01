<script>
	import StopUpdate from '$lib/changes/viewers/StopUpdate.svelte';
	import StopPicUpload from '$lib/changes/viewers/StopPicUpload.svelte';
	import RouteUpdate from '$lib/changes/viewers/RouteUpdate.svelte';
	import SubrouteCreation from '$lib/changes/viewers/SubrouteCreation.svelte';
	import SubrouteUpdate from '$lib/changes/viewers/SubrouteUpdate.svelte';
	import SubrouteDeletion from '$lib/changes/viewers/SubrouteDeletion.svelte';

	export let change;
	export let stops;
	export let ignoredKeys;
</script>

{#if 'StopUpdate' in change}
	<StopUpdate change={change.StopUpdate} {stops} bind:ignoredKeys />
{:else if 'StopPicUpload' in change}
	<StopPicUpload change={change.StopPicUpload} />
{:else if 'RouteUpdate' in change}
	<RouteUpdate change={change.RouteUpdate} />
{:else if 'SubrouteCreation' in change}
	<SubrouteCreation change={change.SubrouteCreation} />
{:else if 'SubrouteUpdate' in change}
	<SubrouteUpdate change={change.SubrouteUpdate} />
{:else if 'SubrouteDeletion' in change}
	<SubrouteDeletion change={change.SubrouteDeletion} />
{:else}
	<textarea disabled class="w-full">{JSON.stringify(change)}</textarea>
{/if}
