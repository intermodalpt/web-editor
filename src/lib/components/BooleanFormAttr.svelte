<script>
	import BooleanToggle from '$lib/components/BooleanToggle.svelte';

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
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				class="w-4 h-4 stroke-current"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
		</a>
	{/if}
</div>
