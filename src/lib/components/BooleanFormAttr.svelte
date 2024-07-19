<script>
	import BooleanToggle from '$lib/components/BooleanToggle.svelte';
	import Icon from '$lib/components/Icon.svelte';

	export let state = false;
	export let disabled = false;
	export let nullable = true;
	export let label = null;
	export let infoUrl = null;
</script>

<div class="flex items-center gap-1">
	<BooleanToggle bind:state compact={true} {disabled} {nullable} />
	{#if label}
		<span class="label-text">{label}</span>
	{/if}
	{#if infoUrl}
		<a class="btn btn-circle btn-ghost btn-xs text-info" href={infoUrl} target="_blank">
			<Icon name="info" class="h-4 w-4" />
		</a>
	{/if}
</div>
