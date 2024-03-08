<script>
	import '../app.css';
	import Header from './Header.svelte';
	import { page, navigating } from '$app/stores';
	import { toasts } from '$lib/stores';
</script>

{#if $navigating}
	<div
		class="fixed inset-0 bg-white backdrop-blur-sm bg-opacity-20 z-40 flex items-end justify-end p-8"
	>
		<span class="loading loading-spinner text-primary loading-lg" />
	</div>
{/if}

<div class="drawer min-h-[100%]">
	<input id="mobile-drawer" type="checkbox" class="drawer-toggle" />
	<div class="drawer-content flex flex-col min-h-[100%]">
		<div id="layout" class="min-h-[100%]">
			<Header />
			<main class="flex flex-col overflow-y-auto">
				<slot />
			</main>
		</div>
	</div>
	<div class="drawer-side z-[10000]">
		<label for="mobile-drawer" class="drawer-overlay" />
		<ul class="menu p-4 w-80 h-full bg-base-200">
			<li>
				<a href="/stops" class:active={$page.url.pathname.startsWith('/stops')}>Paragens</a>
			</li>
			<li>
				<a href="/operators" class:active={$page.url.pathname.startsWith('/operators')}>
					Operadores
				</a>
			</li>
			<li>
				<a href="/images" class:active={$page.url.pathname.startsWith('/images')}>Fotos</a>
			</li>
			<li>
				<a href="/contrib" class:active={$page.url.pathname.startsWith('/contrib')}>
					Contribuições
				</a>
			</li>
			<li>
				<a href="/stats" class:active={$page.url.pathname.startsWith('/stats')}>Estado</a>
			</li>
			<li>
				<a href="/osm" class:active={$page.url.pathname.startsWith('/osm')}>OSM</a>
			</li>
		</ul>
	</div>
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
