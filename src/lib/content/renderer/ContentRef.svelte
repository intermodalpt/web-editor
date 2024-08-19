<script>
	export let data;

</script>

<div class="bg-amber-50 rounded-lg p-2">
	<div class="flex flex-wrap gap-1">
		<span>Leia mais em</span>
		{#if data.url}
			<a class="link link-primary font-bold" href={data.url}>{data.name ?? data.url}</a>
		{:else}
			<span class="font-bold">{data.name ?? ''}</span>
		{/if}
	</div>
</div>
