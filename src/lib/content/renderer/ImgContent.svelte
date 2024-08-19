<script>
	export let data;
</script>

{#if data?.id}
	<img src={data.url} alt={data.transcription} class="rounded-lg" />
{/if}
<div class="p-2 border-l-2 border-neutral">
	{data.description ?? ''}
	{data.attribution ? ' - ' : ''}
	{data.attribution ?? ''}
</div>
<h4 class="label-text">Descrição:</h4>
<textarea class="w-full input input-bordered" bind:value={data.description}></textarea>
<h4 class="label-text">Transcrição:</h4>
<textarea class="w-full input input-bordered" bind:value={data.transcript}></textarea>
<h4 class="label-text">Atribuição:</h4>
<textarea class="w-full input input-bordered" bind:value={data.attribution}></textarea>
