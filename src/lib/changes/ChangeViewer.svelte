<script>
	import StopUpdate from '$lib/changes/StopUpdate.svelte';
	import StopPicUpload from '$lib/changes/StopPicUpload.svelte';
	import RouteUpdate from '$lib/changes/RouteUpdate.svelte';
	import SubrouteCreation from '$lib/changes/SubrouteCreation.svelte';
	import SubrouteUpdate from '$lib/changes/SubrouteUpdate.svelte';
	import SubrouteDeletion from '$lib/changes/SubrouteDeletion.svelte';

	export let change;
	export let stops;
</script>

{#if 'StopUpdate' in change}
	<StopUpdate change={change.StopUpdate} {stops}/>
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
