<script>
	import { onDestroy, onMount } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import { liveQuery } from 'dexie';
	import {
		Map as Maplibre,
		Marker,
		LngLatBounds,
		NavigationControl,
		GeolocateControl
	} from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import View360, { EquirectProjection, LoadingSpinner, ControlBar } from '@egjs/svelte-view360';
	import '@egjs/svelte-view360/css/view360.min.css';
	import { apiServer, tileStyle } from '$lib/settings.js';
	import { token } from '$lib/stores.js';
	import { fetchStops, getStops, loadMissing } from '$lib/db';

	const panoramas = writable([]);
	const stops = liveQuery(() => getStops());

	let map;
	let mapEl;
	let marker = null;

	let mapLoaded = false;
	let stopsLoaded = false;
	let panosLoaded = false;

	$: loading = !stopsLoaded || !panosLoaded || !mapLoaded;

	const selectedPano = writable(null);

	const untaggedPanos = derived([panoramas], ([$panoramas]) => {
		if (!$panoramas) return [];
		return $panoramas.filter((pano) => !(pano.stop_id && pano.lat && pano.lon));
	});

	const panoOnion = derived([selectedPano], async ([$selectedPano], set) => {
		if (!$selectedPano) return null;
		fetch(`${apiServer}/v1/stop_pics/pano/${$selectedPano.id}/onion`, {
			headers: {
				Authorization: `Bearer ${$token}`
			}
		})
			.then((r) => r.json())
			.then((r) => set(r));
	});

	panoOnion.subscribe((onion) => {
		if (map) {
			updateData();

			// Figure the boundary for every predecessor and antecessor
			const bounds = new LngLatBounds();
			onion.predecessors
				.filter((pic) => pic.lat && pic.lon)
				.forEach((pic) => {
					bounds.extend([pic.lon, pic.lat]);
				});
			onion.successors
				.filter((pic) => pic.lat && pic.lon)
				.forEach((pic) => {
					bounds.extend([pic.lon, pic.lat]);
				});
			map.fitBounds(bounds, {
				padding: 50
			});
		}
	});

	selectedPano.subscribe((pano) => {
		if (!pano) {
			if (map && marker) {
				marker.remove();
				marker = null;
			}
			return;
		}

		if (projection?._for != pano) {
			projection = new EquirectProjection({
				src: `https://intermodal-storage-worker.claudioap.workers.dev/pano/${pano.sha1}/pano.jpg`
			});
			projection._for = pano;
		}

		if (map) {
			if (pano.lat && pano.lon) {
				if (marker) {
					marker.setLngLat([pano.lon, pano.lat]);
				} else {
					marker = new Marker().setLngLat([pano.lon, pano.lat]).setDraggable(true).addTo(map);
					marker.on('dragend', markerMoved);
				}
			} else {
				if (marker) {
					marker.remove();
					marker = null;
				}
			}
		}
	});

	async function loadData() {
		await Promise.all([
			fetchStops().then((r) => {
				stopsLoaded = true;
			}),
			fetch(`${apiServer}/v1/stop_pics/pano/all`, {
				headers: {
					Authorization: `Bearer ${$token}`
				}
			})
				.then((r) => r.json())
				.then((r) => {
					$panoramas = r;
					panosLoaded = true;
				})
		]);
	}

	loadData().then(async () => {
		console.log('data loaded');
		await loadMissing();
	});

	let projection = new EquirectProjection({
		src: '/bru.jpeg'
	});

	function updateData() {
		if (!mapLoaded) {
			return;
		}

		map.getSource('stops').setData({
			type: 'FeatureCollection',
			features: Object.values($stops).map((stop) => {
				return {
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: [stop.lon, stop.lat]
					},
					properties: {
						id: stop.id,
						name: stop.name || stop.osm_name
					}
				};
			})
		});

		map.getSource('predecessors').setData({
			type: 'FeatureCollection',
			features:
				$panoOnion?.predecessors
					?.filter((successor) => successor.lat && successor.lon)
					.map((predecessor, index) => {
						return {
							type: 'Feature',
							geometry: {
								type: 'Point',
								coordinates: [predecessor.lon, predecessor.lat]
							},
							properties: {
								index: index
							}
						};
					}) || []
		});

		map.getSource('successors').setData({
			type: 'FeatureCollection',
			features:
				$panoOnion?.successors
					?.filter((successor) => successor.lat && successor.lon)
					.map((successor, index) => {
						return {
							type: 'Feature',
							geometry: {
								type: 'Point',
								coordinates: [successor.lon, successor.lat]
							},
							properties: {
								index: index
							}
						};
					}) || []
		});

		let relFeatures = [];
		if ($selectedPano && $selectedPano.lat && $selectedPano.lon && $selectedPano.stop_id) {
			let stop = $stops[$selectedPano.stop_id];
			relFeatures.push({
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: [
						[$selectedPano.lon, $selectedPano.lat],
						[stop.lon, stop.lat]
					]
				}
			});
		}

		map.getSource('relations').setData({
			type: 'FeatureCollection',
			features: relFeatures
		});
	}

	function addSourcesAndLayers() {
		map.addSource('relations', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});
		map.addLayer({
			id: 'relations',
			type: 'line',
			source: 'relations',
			paint: {
				'line-color': 'rgb(200, 150, 230)',
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
				'text-field': ['get', 'name'],
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
						[18, 7]
					]
				}
			}
		});

		map.addSource('pics', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});
		map.addLayer({
			id: 'pics',
			type: 'circle',
			source: 'pics',
			paint: {
				'circle-color': 'rgb(230, 210, 150)',
				'circle-radius': {
					base: 1.2,
					stops: [
						[0, 1.5],
						[11, 2],
						[18, 7]
					]
				}
			}
		});

		map.addSource('predecessors', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});

		map.addLayer({
			id: 'predecessors',
			type: 'circle',
			source: 'predecessors',
			paint: {
				'circle-color': [
					'interpolate',
					['linear'],
					['get', 'index'],
					0,
					'rgba(255, 100, 120, 0.6)',
					9,
					'rgba(200, 150, 180, 0.6)'
				],
				'circle-radius': {
					base: 1.2,
					stops: [
						[11, 10],
						[18, 15]
					]
				}
			}
		});

		map.addSource('successors', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});

		map.addLayer({
			id: 'successors',
			type: 'circle',
			source: 'successors',
			paint: {
				'circle-color': [
					'interpolate',
					['linear'],
					['get', 'index'],
					0,
					'rgba(100, 255, 120, 0.6)',
					9,
					'rgba(150, 200, 180, 0.6)'
				],
				'circle-radius': {
					base: 1.2,
					stops: [
						[11, 10],
						[18, 15]
					]
				}
			}
		});
	}

	let markerMoved = (e) => {
		let targetLoc = e.target.getLngLat();
		if (!$selectedPano) {
			return;
		}
		$selectedPano.lon = targetLoc.lng;
		$selectedPano.lat = targetLoc.lat;
	};

	function addEvents() {
		const canvas = map.getCanvasContainer();
		map.on('mouseenter', 'pics', () => {
			canvas.style.cursor = 'pointer';
		});
		map.on('mouseleave', 'pics', () => {
			canvas.style.cursor = '';
		});
		map.on('mouseenter', 'stops', () => {
			canvas.style.cursor = 'pointer';
		});
		map.on('mouseleave', 'stops', () => {
			canvas.style.cursor = '';
		});

		map.on('click', 'stops', (e) => {
			e.originalEvent.preventDefault();
			let stopId = e.features[0].properties.id;
			if ($selectedPano) {
				$selectedPano.stop_id = stopId;
			}
		});

		map.on('click', function (e) {
			if (e.originalEvent.defaultPrevented) {
				return;
			}
			if ($selectedPano) {
				if (marker) {
					marker.setLngLat(e.lngLat);
				} else {
					marker = new Marker({ draggable: true })
						.setLngLat(e.lngLat)
						.setDraggable(true)
						.addTo(map);
					marker.on('dragend', markerMoved);
				}

				$selectedPano.lon = e.lngLat.lng;
				$selectedPano.lat = e.lngLat.lat;
			}
		});
	}

	onMount(() => {
		map = new Maplibre({
			container: mapEl,
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

		map.addControl(new NavigationControl(), 'top-right');
		map.addControl(new GeolocateControl(), 'top-right');

		map.on('load', function () {
			addSourcesAndLayers();
			addEvents();

			mapLoaded = true;
			updateData();

			map.easeTo({
				padding: { left: 500 },
				duration: 750
			});
		});
	});

	onDestroy(() => {
		mapLoaded = false;
		map.remove();
	});
</script>

<svelte:head>
	<title>Intermodal - Editor - Panoramas</title>
	<meta name="description" content="Catalogo de imagens" />
</svelte:head>

<div bind:this={mapEl} class="w-full h-full">
	{#if loading}
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
					>Panoramas: <progress
						class="progress progress-primary w-full"
						value={panosLoaded ? 100 : 0}
						max="100"
					/></span
				>
			</div>
		</div>
	{/if}
	<div class="absolute left-0 z-20 flex flex-col justify-center h-full">
		<div
			class="w-[500px] h-full lg:h-[95%] overflow-y-scroll p-2 bg-base-100 flex flex-col gap-2 lg:rounded-r-xl shadow-md"
		>
			<div class="flex flex-col gap-1">
				{#each $untaggedPanos as pano}
					<div
						class="border-2 rounded-lg p-2 hover:bg-base-200 cursor-pointer"
						class:border-primary={pano.id === $selectedPano?.id}
						on:click={() => {
							if ($selectedPano?.id !== pano.id) {
								$selectedPano = pano;
							}
						}}
						on:keypress={() => {
							if ($selectedPano?.id !== pano.id) {
								$selectedPano = pano;
							}
						}}
					>
						<h2>
							<span class="text-md font-bold">#{pano.id}</span>
							<span class="text-sm">{pano.capture_date}</span>
						</h2>

						{#if $selectedPano?.id === pano.id}
							<View360
								class="is-16by9"
								bind:projection
								disableContextMenu={true}
								plugins={[
									new ControlBar({ fullscreenButton: true, pieView: false, gyroButton: false }),
									new LoadingSpinner()
								]}
							/>
							<div class="flex gap-2 align-middle">
								<label
									class="btn btn-success btn-sm w-32"
									class:btn-error={$selectedPano.sensitive}
									for="is-sensitive"
								>
									{#if $selectedPano.sensitive}Sensivel{:else}Não sensivel{/if}
									<input
										id="is-sensitive"
										type="checkbox"
										class="hidden"
										bind:checked={$selectedPano.sensitive}
									/>
								</label>
								<div class="flex">
									{#if $selectedPano.lat && $selectedPano.lon}
										<span class="badge badge-info badge-outline">
											{$selectedPano.lat.toFixed(6)}
										</span>
										<span class="badge badge-info badge-outline">
											{$selectedPano.lon.toFixed(6)}
										</span>
									{:else}
										<span class="badge badge-error">No coords</span>
									{/if}
								</div>
								{#if $selectedPano.stop_id}
									<span class="badge badge-info badge-outline">
										Stop {$selectedPano.stop_id}
									</span>
								{:else}
									<span class="badge badge-error">No stop</span>
								{/if}
							</div>
							<div class="flex justify-end">
								<div class="btn btn-primary btn-sm w-32">Guardar</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
