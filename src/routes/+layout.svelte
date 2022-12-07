<script>
	import Header from './Header.svelte';
	import '../app.css';
</script>

<div class="flex flex-col flex-1 gap-2 p2">
	<Header />
	<main class="flex flex-col">
		<slot />
	</main>
</div>
