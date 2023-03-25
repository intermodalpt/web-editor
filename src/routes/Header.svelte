<script>
	import { page } from '$app/stores';
	import { logout, decodedToken } from '$lib/stores.js';
</script>

<header class="flex justify-around bg-base-100">
	<a href="/" class="font-bold">Editor Intermodal</a>
	<nav>
		<div class="tabs mx-auto">
			<a
				href="/stops"
				class="tab tab-bordered"
				class:tab-active={$page.url.pathname.startsWith('/stops')}>Paragens</a
			>
			<a
				href="/routes"
				class="tab tab-bordered"
				class:tab-active={$page.url.pathname.startsWith('/lines')}>Linhas</a
			>
			<a
				href="/calendars"
				class="tab tab-bordered"
				class:tab-active={$page.url.pathname.startsWith('/calendars')}>Calendários</a
			>
			{#if $decodedToken}
				<a
					href="/images"
					class="tab tab-bordered"
					class:tab-active={$page.url.pathname.startsWith('/images')}>Fotos</a
				>
			{/if}
			{#if $decodedToken?.permissions?.is_admin}
				<a
					href="/moderation"
					class="tab tab-bordered"
					class:tab-active={$page.url.pathname.startsWith('/moderation')}>Moderação</a
				>
				<a
					href="/actions"
					class="tab tab-bordered"
					class:tab-active={$page.url.pathname.startsWith('/actions')}>Ações</a
				>
			{/if}
		</div>
	</nav>
	<div>
		{#if $decodedToken}
			<a href="/login">{$decodedToken?.uname}</a>
			<input type="button" class="btn btn-error btn-xs" value="Sair" on:mouseup={logout} />
		{:else}
			<a href="/login" class="btn btn-primary btn-xs">Login</a>
		{/if}
	</div>
</header>
