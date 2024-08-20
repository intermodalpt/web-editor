<script>
	export let state = null;
	export let text = null;
</script>

{#if state}
	<span
		class="badge badge-lg font-semibold text-sm rounded-lg border-2 border-green-400 text-green-700"
		class:w-10={text === null}
	>
		{text === null ? 'Sim' : text}
	</span>
{:else if state === false}
	<span
		class="badge badge-lg font-semibold text-sm rounded-lg border-2 border-red-400 text-red-700"
		class:w-10={text === null}
	>
		{text === null ? 'Não' : text}</span
	>
{:else}
	<span
		class="badge badge-lg font-semibold text-sm rounded-lg border-2 border-yellow-400 text-yellow-700"
		class:w-10={text === null}
	>
		{text === null ? '???' : text}
	</span>
{/if}
