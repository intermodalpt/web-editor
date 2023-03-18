<script>
	import Header from './Header.svelte';
	import '../app.css';
	import { navigating } from '$app/stores';
</script>

{#if $navigating}
	<div class="fixed inset-0 bg-white bg-opacity-50 z-50 flex items-center justify-center">
		<div class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900" />
	</div>
{/if}
<div id="layout" class="min-h-[100%]">
	<Header />
	<main class="flex flex-col overflow-y-auto">
		<slot />
	</main>
</div>

<style>
	#layout {
		display: grid;
		grid-template-rows: auto 1fr;
		height: 100%;
	}
</style>
