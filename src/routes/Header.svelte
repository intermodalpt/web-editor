<script>
	import { page } from '$app/stores';
	import { logout, decodedToken } from '$lib/stores.js';
</script>

<header class="flex justify-around items-center bg-base-100 p-1">
	<div class="flex-none lg:hidden">
		<label for="mobile-drawer" class="btn btn-sm btn-square btn-ghost">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				class="inline-block w-6 h-6 stroke-current"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 6h16M4 12h16M4 18h16"
				/>
			</svg>
		</label>
	</div>
	<a href="/" class="font-bold text-xl flex items-center gap-2">
		<img src="/logo.svg" alt="logo" class="h-8" />
		<span>Editor</span>
	</a>
	<nav class="hidden lg:block">
		<div class="tabs tabs-boxed mx-auto justify-around">
			<a href="/stops" class="tab" class:tab-active={$page.url.pathname.startsWith('/stops')}>
				Paragens
			</a>
			<a
				href="/operators"
				class="tab"
				class:tab-active={$page.url.pathname.startsWith('/operators')}
			>
				Operadores
			</a>
			<a href="/images" class="tab" class:tab-active={$page.url.pathname.startsWith('/images')}>
				Fotos
			</a>
			{#if $decodedToken?.permissions?.is_admin}
				<a
					href="/moderation"
					class="tab"
					class:tab-active={$page.url.pathname.startsWith('/moderation')}
				>
					Moderação
				</a>
				<a href="/actions" class="tab" class:tab-active={$page.url.pathname.startsWith('/actions')}>
					Ações
				</a>
			{/if}
		</div>
	</nav>
	<div>
		{#if $decodedToken}
			<div class="bg-base-200 rounded-lg p-1">
				<a class="font-bold px-1" href="/perfil">{$decodedToken?.uname}</a>
				<svg
					class="btn btn-error btn-xs fill-error-content h-8 w-8 p-1"
					on:click={logout}
					on:keypress={logout}
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 512 512"
				>
					<!-- Font Awesome Free 6.4.0 https://fontawesome.com/license/free (Free License). -->
					<path
						d="M502.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-128-128c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0
						45.3L402.7 224 192 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l210.7 0-73.4 73.4c-12.5 12.5-12.5
						32.8 0 45.3s32.8 12.5 45.3 0l128-128zM160 96c17.7 0 32-14.3 32-32s-14.3-32-32-32L96 32C43 32
						0 75 0 128L0 384c0 53 43 96 96 96l64 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-64 0c-17.7
						0-32-14.3-32-32l0-256c0-17.7 14.3-32 32-32l64 0z"
					/></svg
				>
			</div>
		{:else}
			<a href="/login" class="btn btn-primary btn-xs">Login</a>
		{/if}
	</div>
</header>
