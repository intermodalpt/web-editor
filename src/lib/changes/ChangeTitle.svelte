<script>
	import StopUpdate from '$lib/changes/titles/StopUpdate.svelte';
	import StopPicUpload from '$lib/changes/titles/StopPicUpload.svelte';
	import RouteUpdate from '$lib/changes/titles/RouteUpdate.svelte';
	import SubrouteCreation from '$lib/changes/titles/SubrouteCreation.svelte';
	import SubrouteUpdate from '$lib/changes/titles/SubrouteUpdate.svelte';
	import SubrouteDeletion from '$lib/changes/titles/SubrouteDeletion.svelte';

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