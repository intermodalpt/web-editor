<script>
	import { onDestroy, onMount, tick } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import maplibre from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { liveQuery } from 'dexie';
	import { apiServer, tileStyle } from '$lib/settings';
	import { toast } from '$lib/stores';
	import { SearchControl } from '$lib/stops/SearchControl.js';
	import { fetchRegions, getRegions, loadMissing } from '$lib/db';
	import Icon from '$lib/components/Icon.svelte';
	import OsmStopData from './OsmStopData.svelte';
	import { invalidate } from '$app/navigation';

	export let data;
	const regions = data.regions;
	const osmStops = data.osmStops;
	const osmIndex = Object.fromEntries(osmStops.map((stop) => [stop.id, stop]));
	$: stops = data.stops;

	let map;
	let searchDialog;

	let stopsLoaded = true;
	let osmStopsLoaded = true;
	let mapLoaded = false;

	$: loading = !stopsLoaded || !osmStopsLoaded || !mapLoaded;

	let selectedOsmStop = writable(null);

	const stopSearchInput = writable(null);

	const stopSearchResults = derived(stopSearchInput, ($stopSearchInput) => {
		if (!$stopSearchInput || $stopSearchInput.length < 3) return [];

		let lowerInput = $stopSearchInput.toLowerCase();

		let result = osmStops
			.map((stop) => {
				let id_score = 0;
				let name_score = 0;

				if (('' + stop.id).includes($stopSearchInput)) {
					'' + stop.id == $stopSearchInput ? (id_score += 100) : (id_score += 50);
				}

				if (stop.name && stop.name.toLowerCase().includes(lowerInput)) {
					name_score = Math.max(name_score, stop.name.toLowerCase() == lowerInput ? 100 : 50);
				}

				const score = id_score + name_score;
				return [score, stop];
			})
			.filter(([score, result]) => score > 0)
			.sort((a, b) => a[0] - b[0])
			.map(([, result]) => result);
		return result;
	});

	export function selectStop(stopId) {
		$selectedOsmStop = osmIndex[stopId];
	}

	function drawStops() {
		const features = {
			type: 'FeatureCollection',
			features: stops.map((stop) => {
				return {
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: [stop.lon, stop.lat]
					},
					properties: {
						stopId: stop.id,
						label: `${stop.id} - ${stop.name}`
					}
				};
			})
		};

		map.getSource('stops').setData(features);
	}

	function fitMap() {
		const bounds = new maplibre.LngLatBounds();
		stops.forEach((stop) => {
			bounds.extend([stop.lon, stop.lat]);
		});
		map.fitBounds(bounds, {
			padding: 50
		});
	}

	function drawOsmStops() {
		const features = {
			type: 'FeatureCollection',
			features: osmStops.map((stop) => {
				return {
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: [stop.lon, stop.lat]
					},
					properties: {
						stopId: stop.id,
						label: `${stop.id} - ${stop.name}`
					}
				};
			})
		};

		map.getSource('osm-stops').setData(features);
	}

	function flyToStop(stop) {
		searchDialog.close();

		map.flyTo({
			center: [stop.lon, stop.lat],
			zoom: 18
		});
	}

	function addSourcesAndLayers() {
		map.addSource('stops', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			},
			clusterRadius: 40,
			clusterMinPoints: 3
		});

		map.addLayer({
			id: 'stop-labels',
			type: 'symbol',
			source: 'stops',
			layout: {
				'text-field': ['get', 'label'],
				'text-font': ['Open Sans', 'Arial Unicode MS'],
				'text-size': 10,
				'text-offset': [2, 0],
				'text-anchor': 'left',
				'text-max-width': 150,
				'text-allow-overlap': false
			},
			minzoom: 16
		});

		map.addLayer({
			id: 'stop-points',
			type: 'circle',
			source: 'stops',
			filter: ['!', ['has', 'point_count']],
			paint: {
				'circle-color': 'rgba(0, 0, 0, 0.0)',
				'circle-radius': {
					base: 1.75,
					stops: [
						[0, 0],
						[11, 1.5],
						[16, 8],
						[18, 18]
					]
				},
				'circle-stroke-width': 2,
				'circle-stroke-color': '#f00'
			}
		});

		map.addSource('osm-stops', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			},
			clusterRadius: 40,
			clusterMinPoints: 3
		});

		map.addLayer({
			id: 'osm-stop-labels',
			type: 'symbol',
			source: 'osm-stops',
			layout: {
				'text-field': ['get', 'label'],
				'text-font': ['Open Sans', 'Arial Unicode MS'],
				'text-size': 10,
				'text-offset': [2, 0],
				'text-anchor': 'left',
				'text-max-width': 150,
				'text-allow-overlap': false
			},
			minzoom: 16
		});

		map.addLayer({
			id: 'osm-stop-points',
			type: 'circle',
			source: 'osm-stops',
			filter: ['!', ['has', 'point_count']],
			paint: {
				'circle-color': 'rgb(0, 170, 0)',
				'circle-radius': {
					base: 1.75,
					stops: [
						[0, 1.5],
						[11, 2],
						[17, 7],
						[18, 15]
					]
				},
				'circle-stroke-width': 1,
				'circle-stroke-color': '#fff'
			}
		});
	}

	function addEvents() {
		const canvas = map.getCanvas();

		map.on('mouseenter', 'osm-stop-points', () => {
			canvas.style.cursor = 'pointer';
		});

		map.on('mouseleave', 'osm-stop-points', () => {
			canvas.style.cursor = '';
		});

		map.on('click', 'osm-stop-points', (e) => {
			$selectedOsmStop = osmIndex[e.features[0].properties.stopId];
		});
	}

	async function handleCreateStop() {
		await invalidate('stops:osm');
		drawStops();
	}

	onMount(() => {
		map = new maplibre.Map({
			container: 'map',
			style: tileStyle,
			minZoom: 6.0,
			maxZoom: 20,
			zoom: 7,
			center: [-8.5, 39.5]
		});

		map.addControl(new maplibre.NavigationControl());
		map.addControl(new SearchControl(() => searchDialog.showModal()));

		map.addControl(
			new maplibre.GeolocateControl({
				positionOptions: {
					enableHighAccuracy: true
				},
				showUserHeading: true,
				trackUserLocation: true
			})
		);

		map.on('load', async () => {
			addSourcesAndLayers();
			addEvents();

			mapLoaded = true;
			await tick();

			if (stopsLoaded) {
				drawStops();
				fitMap();
			}
			if (osmStopsLoaded) drawOsmStops();
		});
	});

	onDestroy(() => {
		mapLoaded = false;
		map?.remove();
	});
</script>

<svelte:head>
	<title>Intermodal - OpenStreetMap</title>
	<meta name="description" content="Emparelhamento com paragens OpenStreetMap" />
</svelte:head>

<div id="map" class="h-full relative">
	{#if loading}
		<div style="background-color: #33336699" class="z-[2000] absolute inset-0 backdrop-blur-sm" />
		<div class="absolute inset-x-0 m-auto w-full md:w-96 w z-[2001]">
			<div class="m-2 p-4 bg-base-100 flex flex-col gap-4 rounded-2xl shadow-3xl max-h-full">
				<span class="text-xl">A carregar</span>
				<span
					>Mapa: <progress
						class="progress progress-primary w-full"
						value={mapLoaded ? 100 : 0}
						max="100"
					/></span
				>
				<span
					>Paragens IML: <progress
						class="progress progress-primary w-full"
						value={stopsLoaded ? 100 : 0}
						max="100"
					/></span
				>
				<span
					>Paragens OSM: <progress
						class="progress progress-primary w-full"
						value={osmStopsLoaded ? 100 : 0}
						max="100"
					/></span
				>
			</div>
		</div>
	{/if}
	<div
		class="absolute bottom-0 z-10 flex justify-center w-full transition duration-750"
		class:translate-y-[350px]={!$selectedOsmStop}
	>
		<div class="h-[350px] w-full bg-base-100 lg:w-[95%] lg:rounded-t-xl shadow-md">
			{#if $selectedOsmStop}
				<OsmStopData {regions} osmStop={selectedOsmStop} on:stopcreated={handleCreateStop} />
			{/if}
		</div>
	</div>
</div>

<dialog bind:this={searchDialog} class="modal modal-bottom sm:modal-middle z-30">
	<div class="modal-box z-30 max-w-5xl grid grid-cols-1" style="grid-template-rows: auto 1fr;">
		<form method="dialog">
			<button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
				<Icon name="close" class="h-4 stroke-current" />
			</button>
			<h3 class="font-bold text-lg">Pesquisar</h3>
			<input
				type="text"
				class="input input-primary input-bordered w-full"
				placeholder="id ou nome"
				bind:value={$stopSearchInput}
			/>
		</form>
		{#if $stopSearchResults}
			<div class="flex flex-col gap-1 mt-2 overflow-y-scroll">
				{#each $stopSearchResults as result}
					<button
						class="card card-compact w-full bg-base-100 border-2 shadow-sm cursor-pointer"
						on:click={() => flyToStop(result)}
					>
						<div class="card-body">
							<h2 class="text-md font-semibold">
								<span class="text-md border-b-2 border-blue-500">{result.id}</span>
								{result.name}
							</h2>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>Fechar</button>
	</form>
</dialog>
