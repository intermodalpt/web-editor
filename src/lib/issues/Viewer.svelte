<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import maplibre from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { defaultMapBounds, defaultMapZoom, tileStyle } from '$lib/settings.js';
	import CoordViewer from '$lib/components/CoordViewer.svelte';
	import ContentBlock from '$lib/content/renderer/ContentBlock.svelte';
	import { permissions } from '$lib/stores';
	import Icon from '$lib/components/Icon.svelte';

	export let issue;
	const isLocated = issue.lat && issue.lon;

	issue.creation = new Date(issue.creation);

	let map;
	let mapElem;

	onMount(() => {
		if (isLocated) {
			map = new maplibre.Map({
				container: mapElem,
				style: tileStyle,
				center: [issue.lon, issue.lat],
				zoom: 12,
				minZoom: defaultMapZoom,
				maxZoom: 20,
				maxBounds: defaultMapBounds
			});

			new maplibre.Marker().setLngLat([issue.lon, issue.lat]).addTo(map);

			map.addControl(new maplibre.FullscreenControl());
		}
	});

	onDestroy(() => map?.remove());
</script>

<h2 class="card-title">{issue.title}</h2>
<div class="flex flex-wrap gap-1 items-center">
	<span>Afecto a</span>
	{#each issue.operators as operator}
		<a class="badge badge-secondary" href="/operators/{operator.id}-{operator.tag}"
			>{operator.name}</a
		>
	{/each}
</div>
{#each issue.content as block}
	<ContentBlock {block} />
{/each}

<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
	<div class="flex flex-col gap-2">
		<div>
			<span class="label-text">Linhas</span>
			<div class="flex gap-2 ml-1">
				{#each issue.routes as route}
					<div class="flex flex-wrap">
						<span
							class="rounded-l-full px-1 font-bold text-md h-6"
							style="color: {route.badge_text}; background-color: {route.badge_bg}"
						>
							{route.code}
						</span>
						<span class="badge rounded-r-full badge-outline text-md h-6">{route.name}</span>
					</div>
				{/each}
			</div>
		</div>
		<div>
			<span class="label-text">Paragens</span>
			<div class="flex flex-wrap gap-2 ml-1">
				{#each issue.stops as stop}
					<span class="badge badge-outline text-md h-6">{stop.id} - {stop.name}</span>
				{/each}
			</div>
		</div>
		<div>
			<span class="label-text">Importância:</span>
			<div class="pl-2">
				{#if issue.impact === 1}
					<span class="text-success ml-1">Baixa</span>
				{:else if issue.impact === 3}
					<span class="text-warning ml-1">Média</span>
				{:else if issue.impact === 5}
					<span class="text-error ml-1">Alta</span>
				{:else}
					<span>Desconhecida</span>
				{/if}
			</div>
		</div>
		<div>
			<span class="label-text">Estado</span>
			<span class="ml-1">
				{#if issue.state === 'unanswered'}
					Sem resposta
				{:else if issue.state === 'wontfix'}
					Rejeitado
				{:else if issue.state === 'fixinprogress'}
					Resolução em progresso
				{:else if issue.state === 'fixdone'}
					Resolvido
				{:else}
					Desconhecido
				{/if}
			</span>
		</div>
		{#if issue.state_justification}
			<div>
				<span class="label-text">Justificação</span>
				<span class="ml-1">{issue.state_justification}</span>
			</div>
		{/if}
		<hr />
		<span class="label-text">
			Criado a {issue.creation.toLocaleString('pt-pt', {
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			})}
		</span>
	</div>
	{#if isLocated}
		<div>
			<span class="label-text">Localização</span>
			<div bind:this={mapElem} class="h-64 relative">
				<div class="absolute bottom-2 left-2 z-10">
					<CoordViewer lat={issue.lat} lon={issue.lon} />
				</div>
			</div>
		</div>
	{/if}
</div>

<div class="flex flex-wrap justify-end gap-2 mt-2">
	<slot name="actions" />
	{#if $permissions?.misc?.modifyIssues}
		<a class="btn btn-neutral btn-sm" href="/issues/{issue.id}/edit"
			><Icon name="pencil" class="p-1 h-full fill-white" />Editar</a
		>
	{/if}
</div>
