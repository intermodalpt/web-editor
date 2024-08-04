<script>
	import { onDestroy, onMount, tick } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import maplibre from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { apiServer, tileStyle } from '$lib/settings';
	import { fetchStops, fetchParishes, getStops, getParishes, loadMissing } from '$lib/db';
	import Menu from '../Menu.svelte';

	export let data;
	const region = data.region;
	const parishes = data.parishes;
	const rankedParishes = data.rankedParishes;
	const annotatedParishes = data.annotatedParishes;
	const stops = data.stops;
	const stopsByPic = data.stopsByPic;

	let map;

	let stopsLoaded = true;
	let parishesLoaded = true;
	let mapLoaded = false;
	$: loading = !stopsLoaded || !parishesLoaded || !mapLoaded;

	const mapTabs = {
		identifier: 0,
		position: 1,
		service: 2,
		pics: 3
	};

	const tab = writable(mapTabs.identifier);

	tab.subscribe(($tab) => {
		refreshParishes();
	});

	const selectedParish = writable(null);

	const parishStops = derived(selectedParish, ($selectedParish) => {
		if (!$selectedParish) return;

		return stops.filter((stop) => stop.parish === $selectedParish.id);
	});

	const parishMeta = derived(parishStops, ($rankedParishes) => {
		if (!$selectedParish) return;

		const attrs = [
			'schedules',
			'flags',
			'has_sidewalk',
			'has_sidewalked_path',
			'has_shelter',
			'has_cover',
			'has_bench',
			'has_trash_can',
			'has_waiting_times',
			'has_ticket_seller',
			'has_costumer_support',
			'advertisement_qty',
			'has_crossing',
			'has_wide_access',
			'has_flat_access',
			'has_tactile_access',
			'illumination_strength',
			'illumination_position',
			'has_illuminated_path',
			'has_visibility_from_within',
			'has_visibility_from_area',
			'is_visible_from_outside',
			'parking_visibility_impairment',
			'parking_local_access_impairment',
			'parking_area_access_impairment'
		];

		const attrValues = Object.fromEntries(attrs.map((attr) => [attr, 0]));

		$parishStops.forEach((stop) => {
			attrs.forEach((attr) => {
				if (stop[attr] === null || stop[attr] === undefined) {
					return;
				}
				++attrValues[attr];
			});
		});
		return {
			attrUsage: attrValues,
			stopCount: $parishStops.length
		};
	});

	function refreshStops() {
		map.getSource('stops').setData({
			type: 'FeatureCollection',
			features: stops.map((stop) => {
				return {
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: [stop.lon, stop.lat]
					},
					properties: {
						id: stop.id,
						label: `${stop.id} - ${stop.name}`
					}
				};
			})
		});
	}

	function refreshParishes() {
		if (!mapLoaded) return;

		map.getSource('parishes').setData({
			type: 'FeatureCollection',
			features: annotatedParishes.map((parish) => {
				let scoringAttr;
				switch ($tab) {
					case mapTabs.identifier:
						scoringAttr = parish.idCount;
						break;
					case mapTabs.position:
						scoringAttr = parish.locationCount;
						break;
					case mapTabs.service:
						scoringAttr = parish.serviceCount;
						break;
					case mapTabs.pics:
						scoringAttr = parish.pictureCount;
						break;
				}

				const obj = {
					...parish.geojson
				};
				let complete = parish.totalCount == 0 || scoringAttr == parish.totalCount;
				obj.properties = {
					score: complete ? 1.0 : scoringAttr / parish.totalCount,
					percentage: Math.round((complete ? 1.0 : scoringAttr / parish.totalCount) * 100) + '%',
					id: parish.id
				};
				return obj;
			})
		});
	}

	function addSourcesAndLayers() {
		map.addSource('parishes', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});
		map.addLayer({
			id: 'parishes',
			type: 'fill',
			source: 'parishes',
			layout: {},
			paint: {
				'fill-color': [
					'interpolate',
					['linear'],
					['get', 'score'],
					0.0,
					'red',
					0.5,
					'yellow',
					1.0,
					'green'
				],
				'fill-opacity': 0.3
			}
		});
		map.addLayer({
			id: 'parish-boundaries',
			type: 'line',
			source: 'parishes',
			layout: {},
			paint: {
				'line-color': '#777',
				'line-opacity': 0.7,
				'line-width': 2
			}
		});

		map.addSource('stops', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});

		map.addLayer({
			id: 'stopLabels',
			type: 'symbol',
			source: 'stops',
			layout: {
				'text-field': ['get', 'label'],
				'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
				'text-size': 8,
				'text-offset': [5, 0],
				'text-anchor': 'left',
				'text-max-width': 150,
				'text-allow-overlap': false
			},
			minzoom: 18
		});

		map.addLayer({
			id: 'stops',
			type: 'circle',
			source: 'stops',
			paint: {
				'circle-color': 'rgb(50, 150, 220)',
				'circle-radius': {
					base: 1.2,
					stops: [
						[0, 1.5],
						[11, 2],
						[18, 5]
					]
				}
				// 'circle-stroke-width': 0.5,
				// 'circle-stroke-color': '#ABD'
			}
		});

		map.addLayer({
			id: 'parish-scores',
			type: 'symbol',
			source: 'parishes',
			layout: {
				'text-field': ['get', 'percentage'],
				'text-size': 14,
				'text-allow-overlap': false,
				'symbol-placement': 'point',
				'symbol-avoid-edges': true
			},
			paint: {
				'text-color': 'black',
				'text-halo-color': 'white',
				'text-halo-width': 2,
				'text-halo-blur': 1
			}
		});
	}

	function addEvents() {
		const canvas = map.getCanvasContainer();

		map.on('click', 'parishes', (e) => {
			$selectedParish = annotatedParishes.find(
				(parish) => parish.id === e.features[0].properties.id
			);
		});
	}

	onMount(() => {
		map = new maplibre.Map({
			container: 'map',
			style: tileStyle,
			center: [-9.0, 38.65],
			zoom: 10,
			minZoom: 8,
			maxZoom: 20,
			maxBounds: [
				[-10.0, 38.3],
				[-8.0, 39.35]
			]
		});

		map.addControl(new maplibre.NavigationControl(), 'top-right');

		map.on('load', async () => {
			addSourcesAndLayers();
			addEvents();

			await tick();

			mapLoaded = true;
			if (parishesLoaded) {
				refreshParishes();
			}
			if (stopsLoaded) {
				refreshStops();
			}
		});
	});

	onDestroy(() => map?.remove());
</script>

<Menu {region} page="stats" />

<div id="map" class="h-[30em] xl:h-[60em] w-full">
	<!-- {#if loading}
		<div style="background-color: #33336699" class="z-[2000] absolute inset-0" />
		<div class="absolute inset-x-0 m-auto w-full md:w-96 w z-[2001]">
			<div
				class="m-2 p-4 bg-base-100 flex flex-col gap-4 rounded-2xl shadow-3xl border-2 border-warning max-h-full"
			>
				<span class="text-xl">A carregar</span>
				<span
					>Mapa: <progress
						class="progress progress-primary w-full"
						value={mapLoaded ? 100 : 0}
						max="100"
					/></span
				>
				<span
					>Paragens: <progress
						class="progress progress-primary w-full"
						value={stopsLoaded ? 100 : 0}
						max="100"
					/></span
				>
				<span
					>Precursos GTFS: <progress
						class="progress progress-primary w-full"
						value={gtfsTripsLoaded ? 100 : 0}
						max="100"
					/></span
				>
				<span
					>Paragens GTFS: <progress
						class="progress progress-primary w-full"
						value={gtfsStopsLoaded ? 100 : 0}
						max="100"
					/></span
				>
			</div>
		</div>
	{/if} -->
</div>
<div class="tabs tabs-md lg:tabs-lg tabs-boxed rounded-none overflow-x-auto">
	<button
		class="tab"
		class:tab-active={$tab === mapTabs.identifier}
		on:click={() => {
			$tab = mapTabs.identifier;
		}}>Identificação</button
	>
	<button
		class="tab"
		class:tab-active={$tab === mapTabs.position}
		on:click={() => {
			$tab = mapTabs.position;
		}}>Posição</button
	>
	<button
		class="tab"
		class:tab-active={$tab === mapTabs.service}
		on:click={() => {
			$tab = mapTabs.service;
		}}>Serviço</button
	>
	<button
		class="tab"
		class:tab-active={$tab === mapTabs.pics}
		on:click={() => {
			$tab = mapTabs.pics;
		}}>Reg.Fotografico</button
	>
</div>

<div class="card-body overflow-x-auto">
	{#if $selectedParish}
		<h2 class="card-title">{$selectedParish.name}</h2>
		<div class="stats stats-vertical lg:stats-horizontal shadow-md">
			<div class="stat">
				<div class="stat-title">Paragens</div>
				<div class="stat-value">{$selectedParish.totalCount}</div>
			</div>
			<div class="stat">
				<div class="stat-title">Identificadas</div>
				<div class="stat-value">{$selectedParish.idCount}</div>
				<div class="stat-desc">
					{Math.round(($selectedParish.idCount / $selectedParish.totalCount) * 1000) / 10}% do total
				</div>
			</div>
			<div class="stat">
				<div class="stat-title">Localizadas</div>
				<div class="stat-value">{$selectedParish.locationCount}</div>
				<div class="stat-desc">
					{Math.round(($selectedParish.locationCount / $selectedParish.totalCount) * 1000) / 10}% do
					total
				</div>
			</div>
			<div class="stat">
				<div class="stat-title">Serviço inserido</div>
				<div class="stat-value">{$selectedParish.serviceCount}</div>
				<div class="stat-desc">
					{Math.round(($selectedParish.serviceCount / $selectedParish.totalCount) * 1000) / 10}% do
					total
				</div>
			</div>
			<div class="stat">
				<div class="stat-title">RºFotografico</div>
				<div class="stat-value">{$selectedParish.pictureCount}</div>
				<div class="stat-desc">
					{Math.round(($selectedParish.pictureCount / $selectedParish.totalCount) * 1000) / 10}% do
					total
				</div>
			</div>
		</div>
		{#if $parishMeta}
			<!-- <h2 class="text-xl font-semibold self-center">Atributos</h2>
					<div class="grid gap-2" style="grid-template-columns: auto 1fr;">
						{#each Object.entries($parishMeta.attrUsage) as [attr, value]}
							<span class="font-mono font-bold">{attr}</span>
							<progress
								class="progress progress-success min-w-56 grow"
								{value}
								max={$selectedParish.totalCount}
							/>
						{/each}
					</div> -->
			<table class="table table-zebra">
				<thead>
					<tr>
						<th>Atributo</th>
						<th>Completude</th>
					</tr>
				</thead>
				<tbody>
					{#each Object.entries($parishMeta.attrUsage) as [attr, value]}
						<tr>
							<td class="font-mono font-bold">{attr}</td>
							<td>
								<progress
									class="progress progress-success min-w-56 grow"
									{value}
									max={$selectedParish.totalCount}
								/>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	{:else}
		<h2 class="card-title">Escolha uma freguesia</h2>
		<p>Utilize o mapa acima para seleccionar uma freguesia a analisar!</p>
	{/if}
</div>
