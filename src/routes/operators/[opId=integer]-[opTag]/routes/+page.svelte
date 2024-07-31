<script lang="ts">
	import { writable, derived } from 'svelte/store';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { permissions } from '$lib/stores';
	import Paginator from '$lib/components/Paginator.svelte';
	import Menu from '../Menu.svelte';

	const ROUTES_PER_PAGE = 100;

	export let data;

	const operator = data.operator;
	const routes = data.routes;
	const regions = data.regions;

	const filter = writable('');
	const routePage = writable(0);

	filter.subscribe(() => {
		$routePage = 0;
	});

	const sortedFilteredRoutes = derived(filter, ($filter) => {
		const filterFunc = $filter
			? (r) =>
					r.name.toLowerCase().includes($filter.toLowerCase()) ||
					r.code?.toLowerCase().includes($filter.toLowerCase())
			: () => true;

		let res = routes.filter(filterFunc).sort((ra, rb) => {
			if (!ra.code) {
				return -1;
			} else if (!rb.code) {
				return 1;
			} else {
				return (parseInt(ra.code) || 10000) - (parseInt(rb.code) || 10000);
			}
		});
		return res;
	});

	const routesInPage = derived(
		[sortedFilteredRoutes, routePage],
		([$sortedFilteredRoutes, $routePage]) => {
			return $sortedFilteredRoutes.slice(
				$routePage * ROUTES_PER_PAGE,
				($routePage + 1) * ROUTES_PER_PAGE
			);
		}
	);
</script>

<Menu {operator} page="routes" />

<div class="flex flex-col gap-3 p-4">
	<div class="flex justify-between">
		<input
			type="text"
			class="input input-sm input-bordered w-full max-w-96"
			placeholder="Procurar"
			bind:value={$filter}
		/>
		<Paginator
			bind:page={$routePage}
			bind:itemCount={routes.length}
			pageSize={ROUTES_PER_PAGE}
			on:goto={(e) => {
				$routePage = e.detail.page;
			}}
		/>
	</div>
	<div class="flex flex-col gap-1">
		{#each $routesInPage as route}
			<div class="flex gap-1 hover:bg-base-200 border-[1px] p-2 rounded-lg cursor-pointer">
				<div class="flex grow items-center gap-2">
					<span
						class="rounded-full px-2 py-1 font-bold"
						style="color: {route.badge_text}; background-color: {route.badge_bg}"
					>
						{#if route.code}
							{route.code}
						{:else}
							<span class="text-gray-500">N/A</span>
						{/if}
					</span>
					<span class="font">{route.name}</span>
				</div>

				<div class="flex gap-2">
					<a
						class="btn btn-primary shadow-md"
						href="/operators/{operator.id}-{operator.tag}/routes/{route.id}-{route.code || ''}"
						>Editar</a
					>
				</div>
			</div>
		{/each}
	</div>
	<div class="flex justify-end">
		<a
			class="btn"
			class:hidden={!$permissions?.routes?.create}
			href="/operators/{operator.id}-{operator.tag}/routes/new">Nova linha</a
		>
	</div>
</div>
