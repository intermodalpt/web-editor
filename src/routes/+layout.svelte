<script>
	import Header from './Header.svelte';
	import '../app.css';
	import { navigating } from '$app/stores';
	import { toasts, toast } from '$lib/stores';
</script>

{#if $navigating}
	<div
		class="fixed inset-0 bg-white backdrop-blur-sm bg-opacity-20 z-40 flex items-end justify-end p-8"
	>
		<span class="loading loading-spinner text-primary loading-lg" />
	</div>
{/if}
<div id="layout" class="min-h-[100%]">
	<Header />
	<main class="flex flex-col overflow-y-auto">
		<slot />
	</main>
</div>
<div class="toast toast-end z-50">
	{#each $toasts as toast}
		<div class="alert alert-{toast.type}">
			<span>{toast.message}</span>
		</div>
	{/each}
</div>

<style>
	#layout {
		display: grid;
		grid-template-rows: auto 1fr;
		height: 100%;
	}
</style>
