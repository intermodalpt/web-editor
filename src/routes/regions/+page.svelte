<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { slugify } from '$lib/utils';
	import RegionPicker from '$lib/components/RegionPicker.svelte';

	export let data;
	const regions = data.regions;

	const modes = {
		map: 'map',
		index: 'index'
	};
	let mode = modes.map;
</script>

<div class="flex flex-col w-[min(80em,100%)] sm:px-4 self-center my-4">
	<div class="card card-compact bg-base-100 shadow-sm">
		<div class="card-body">
			<div class="flex justify-between">
				<h2 class="text-xl font-bold">Regiões</h2>
				<div class="join">
					<button
						class="join-item btn btn-primary btn-outline"
						class:btn-active={mode == modes.map}
						on:click={() => (mode = modes.map)}>Mapa</button
					>
					<button
						class="join-item btn btn-primary btn-outline"
						class:btn-active={mode == modes.index}
						on:click={() => (mode = modes.index)}>Índice</button
					>
				</div>
			</div>
			<div class:hidden={mode != modes.map}>
				<RegionPicker
					on:select={(e) => {
						const id = e.detail.id;
						const region = regions.find((r) => r.id == id);
						goto(`/regions/${id}-${slugify(region.name ?? '-')}`);
					}}
					{regions}
					setsUserRegion={false}
					requestsConfirmation={false}
				/>
			</div>

			<div
				class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 lg:p-2"
				class:hidden={mode != modes.index}
			>
				{#each regions as region}
					<a class="btn btn-primary" href="/regions/{region.id}-{slugify(region.name)}"
						>{region.name}</a
					>
				{/each}
			</div>
			<!-- {#if $selectedRegion}
				<a
					class="btn btn-xl btn-secondary btn-lg"
					href="/regioes/{$selectedRegion?.id}-{slugify($selectedRegion?.name ?? '')}"
					>Continuar em {$selectedRegion?.name}</a
				>
			{/if} -->
		</div>
	</div>
</div>
