<script>
	import { page } from '$app/stores';
	import { logout, decodedToken } from '$lib/stores.js';
</script>

<header class="flex justify-around items-center bg-base-100 p-1">
	<a href="/" class="font-bold">Editor Intermodal</a>
	<nav>
		<div class="tabs tabs-boxed mx-auto justify-around">
			<a
				href="/stops"
				class="tab"
				class:tab-active={$page.url.pathname.startsWith('/stops')}>Paragens</a
			>
			<a
				href="/routes"
				class="tab"
				class:tab-active={$page.url.pathname.startsWith('/routes')}>Linhas</a
			>
			<a
				href="/calendars"
				class="tab"
				class:tab-active={$page.url.pathname.startsWith('/calendars')}>Calendários</a
			>
			{#if $decodedToken}
				<a
					href="/images"
					class="tab"
					class:tab-active={$page.url.pathname.startsWith('/images')}>Fotos</a
				>
			{/if}
			{#if $decodedToken?.permissions?.is_admin}
				<a
					href="/moderation"
					class="tab"
					class:tab-active={$page.url.pathname.startsWith('/moderation')}>Moderação</a
				>
				<a
					href="/actions"
					class="tab"
					class:tab-active={$page.url.pathname.startsWith('/actions')}>Ações</a
				>
			{/if}
		</div>
	</nav>
	<div>
		{#if $decodedToken}
      <div class="bg-base-200 rounded-lg p-1">
        <a class="font-bold px-1" href="/perfil">{$decodedToken?.uname}</a>
        <svg class="btn btn-error btn-xs fill-error-content h-8 w-8 p-1"
          on:click={logout}
          on:keypress={logout} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M502.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-128-128c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L402.7 224 192 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l210.7 0-73.4 73.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l128-128zM160 96c17.7 0 32-14.3 32-32s-14.3-32-32-32L96 32C43 32 0 75 0 128L0 384c0 53 43 96 96 96l64 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-64 0c-17.7 0-32-14.3-32-32l0-256c0-17.7 14.3-32 32-32l64 0z"/></svg>
      </div>
		{:else}
			<a href="/login" class="btn btn-primary btn-xs">Login</a>
		{/if}
	</div>
</header>
