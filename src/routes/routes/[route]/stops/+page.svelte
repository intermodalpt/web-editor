<script>
	import { onDestroy, onMount } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import { Map as Maplibre, NavigationControl, LngLatBounds } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import * as turf from '@turf/turf';
	import { decodedToken, token } from '$lib/stores.js';
	import { apiServer } from '$lib/settings.js';
	export let data = null;

	const credibleSources = ['tml', 'manual', 'flags', 'h1'];

	let stops = data.stops;
	let routeStops = data.routeStops;
	let routes = data.routes;
	let route = data.route;
	console.log(data);
	let map;

	let stopsLoaded = false;
	let gtfsStopsLoaded = false;
	let gtfsTripsLoaded = false;
	let mapLoaded = false;
	$: loading = !stopsLoaded || !gtfsStopsLoaded || !gtfsTripsLoaded || !mapLoaded;

	const selectedStop = writable(null);
	const selectedGtfsStop = writable(null);

	const hasMutualLink = derived(
		[selectedStop, selectedGtfsStop],
		([$selectedStop, $selectedGtfsStop]) => {
			return (
				$selectedStop && $selectedGtfsStop && $selectedStop.tml_id === $selectedGtfsStop.stop_id
			);
		}
	);

	const selectedGtfsStopRoutes = derived(selectedGtfsStop, ($selectedGTFSStop) => {
		if ($selectedGTFSStop == null) return [];
		return Array.from($selectedGTFSStop.routes)
			.sort((a, b) => a.id.localeCompare(b.id))
			.map((r) => {
				const filteredRoute = Object.assign({}, r);
				filteredRoute.trips = filteredRoute.trips.filter((t) =>
					t.stops.includes($selectedGTFSStop.id)
				);
				return filteredRoute;
			});
	});

	const selectedStopRoutes = derived(selectedStop, ($selectedStop, set) => {
		if (!$selectedStop) return null;

		fetch(`${apiServer}/v1/stops/${$selectedStop.id}/spider`)
			.then((r) => r.json())
			.then((r) => {
				set(
					Object.values(r.routes).sort(
						(a, b) => parseInt(a.code) - parseInt(b.code) || a.code.localeCompare(b.code)
					)
				);
			});
	});

	const previewedTrip = writable(null);

	selectedGtfsStop.subscribe((gtfsStop) => {
		previewedTrip.set(null);
		if (!map) return;

		console.log('padding', { left: gtfsStop ? 300 : 0, right: $selectedStop ? 300 : 0 });
		map.easeTo({
			padding: { left: gtfsStop ? 300 : 0, right: $selectedStop ? 300 : 0 },
			duration: 750
		});
		return;
	});

	selectedStop.subscribe((stop) => {
		if (!map) return;

		console.log('padding', { left: $selectedGtfsStop ? 300 : 0, right: stop ? 300 : 0 });
		map.easeTo({
			padding: { left: $selectedGtfsStop ? 300 : 0, right: stop ? 300 : 0 },
			duration: 750
		});
		return;
	});

	previewedTrip.subscribe((trip) => {
		if (!map) return;
		if (!trip) {
			map.getSource('trippreview').setData({
				type: 'LineString',
				coordinates: []
			});
			return;
		}

		map.getSource('trippreview').setData({
			type: 'LineString',
			coordinates: trip.stops.map((stop) => [gtfs_stops[stop].lon, gtfs_stops[stop].lat])
		});
	});

	function refreshMatches() {
		let unvStops = Object.values(stops).filter(
			(stop) => stop.tml_id && !credibleSources.includes(stop.tml_id_source)
		);
		let verStops = Object.values(stops).filter(
			(stop) => stop.tml_id && credibleSources.includes(stop.tml_id_source)
		);

		const matchToFeature = (stop) => {
			let gtfsStop = gtfs_stops[parseInt(stop.tml_id)];

			return {
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: [[stop.lon, stop.lat], gtfsStop ? [gtfsStop.lon, gtfsStop.lat] : [0.0, 90.0]]
				}
			};
		};

		map.getSource('stopmatches-unv').setData({
			type: 'FeatureCollection',
			features: unvStops.map(matchToFeature)
		});
		map.getSource('stopmatches-ver').setData({
			type: 'FeatureCollection',
			features: verStops.map(matchToFeature)
		});
	}

	function loadCurrentWindow(curr_stop, prev_succ_pairs) {
		// Fly to the current stop
		// map.flyTo({
		// 	center: [curr_stop.stop_lon, curr_stop.stop_lat],
		// 	zoom: 16,
		// 	bearing: bearing,
		// 	duration: 2000,
		// 	pitch: 45
		// });
	}

	function refreshStops() {
		refreshMatches();

		map.getSource('stops').setData({
			type: 'FeatureCollection',
			features: Object.values(stops).map((stop) => {
				return {
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: [stop.lon, stop.lat]
					},
					properties: {
						id: stop.id,
						osm_name: stop.osm_name
					}
				};
			})
		});
	}

	function flyToTrip(trip) {
		const bounds = new LngLatBounds();
		trip.stops
			.map((s) => gtfs_stops[s])
			.forEach((stop) => {
				bounds.extend([stop.lon, stop.lat]);
			});
		map.fitBounds(bounds, {
			padding: 50
		});
	}

	function flyToGtfsStop(gtfsStop) {
		map.flyTo({
			center: [gtfsStop.lon, gtfsStop.lat],
			zoom: 17.5
		});
	}

	function flyToStop(stop) {
		map.flyTo({
			center: [stop.lon, stop.lat],
			zoom: 17.5
		});
	}

	function connectStops(stop, gtfsStop) {
		console.log('connecting stops');
		console.log(stop);
		console.log(gtfsStop);

		if (stop.gtfsStop && stop.gtfsStop != gtfsStop) {
			// GTFS changed
			if (
				!credibleSources.includes(stop.tml_id_source) &&
				!confirm('Paragem já está ligada a outra paragem GTFS. Continuar?')
			) {
				return;
			}
		} else if (
			credibleSources.includes(stop.tml_id_source) &&
			!confirm('Paragem já tem um ID confirmado. Alterar?')
		) {
			//GTFS didn't change but the source is going to change
			return;
		}

		const beingUsed = Object.values(stops).some((s) => {
			s != stop && s.gtfsStop == gtfsStop;
		});

		if (beingUsed && !confirm('Paragem GTFS já está ligada a outra paragem. Continuar?')) {
			return;
		}

		const headers = {
			'Content-Type': 'application/json',
			authorization: `Bearer ${$token}`
		};
		fetch(`${apiServer}/v1/tml/match/${stop.id}/${gtfsStop.stop_id}?verified=true&source=h1`, {
			method: 'POST',
			headers: headers
		}).then((r) => {
			if (r.ok) {
				console.log('ID da paragem atualizado com sucesso.');
				stop.gtfsStop = gtfsStop;
				stop.tml_id = gtfsStop.stop_id;
				stop.tml_id_verified = true;
				stop.tml_id_source = 'h1';
				refreshStops();
				// Force data refresh
				$selectedGtfsStop = $selectedGtfsStop;
				$selectedStop = $selectedStop;
			} else {
				alert('Erro a atualizar o ID da paragem.\nRecarregue e tente novamente.');
			}
		});
	}

	function addSourcesAndLayers() {
		map.addSource('routeline', {
			type: 'geojson',
			data: {
				type: 'LineString',
				coordinates: Object.values(routeStops)[0].map((stop) => {
					return [stops[stop].lon, stops[stop].lat];
				})
			}
		});

		map.addLayer({
			id: 'routeline',
			type: 'line',
			source: 'routeline',
			paint: {
				'line-color': 'rgb(229,139,139)',
				'line-width': 5
			}
		});

		map.addSource('stops', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: Object.values(stops).map((stop) => {
					return {
						type: 'Feature',
						geometry: {
							type: 'Point',
							coordinates: [stop.lon, stop.lat]
						},
						properties: {
							id: stop.id,
							osm_name: stop.osm_name
						}
					};
				})
			}
		});

		map.addLayer({
			id: 'stops',
			type: 'circle',
			source: 'stops',
			paint: {
				'circle-color': 'rgb(50, 150, 220)',
				//  change size depending on zoom level
				'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 3, 14, 4, 16, 8, 18, 12, 20, 16],
				'circle-stroke-width': 1,
				'circle-stroke-color': '#fff'
			}
		});

		map.addSource('matchline', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});
	}

  function swapStops(stop1,stop2){
    let index = Object.values(routeStops)[0].indexOf(stop1.id)
    Object.values(routeStops)[0][index] = stop2.id
    // update layer source
    map.getSource('routeline').setData({
      type: 'LineString',
      coordinates: Object.values(routeStops)[0].map((stop) => {
        return [stops[stop].lon, stops[stop].lat];
      })
    })

  }

	function addEvents() {
		const canvas = map.getCanvasContainer();

		map.on('mouseenter', 'stops', () => {
			canvas.style.cursor = 'pointer';
		});
		map.on('mouseleave', 'stops', () => {
			canvas.style.cursor = '';
		});

		let initDragStop = null;
		let hoveredStop = null;
		map.on('click', 'stops', (e) => {
			let stop = stops[e.features[0].properties.id];
      // check is stop is in our route
      console.log(routeStops)
      if (Object.values(routeStops)[0].indexOf(stop.id) == -1) {
        return;
      }

			initDragStop = stops[e.features[0].properties.id];

			map.addLayer({
				id: 'matchline',
				type: 'line',
				source: 'matchline',
				paint: {
					//green
					'line-color': '#2BD4BD',
					'line-width': 5
				}
			});
			$selectedStop = stop;

			map.on('mousemove', onMove);
			map.once('mouseup', onUp);
		});

		function onMove(e) {
			const coords = e.lngLat;

			// Set a UI indicator for dragging.
			canvas.style.cursor = 'grabbing';

			if (hoveredStop) {
				map.getSource('matchline').setData({
					type: 'LineString',
					coordinates: [
						[initDragStop.lon, initDragStop.lat],
						[hoveredStop.lon, hoveredStop.lat]
					]
				});
			} else {
				map.getSource('matchline').setData({
					type: 'LineString',
					coordinates: [
						[initDragStop.lon, initDragStop.lat],
						[coords.lng, coords.lat]
					]
				});
			}
		}

		function onUp(e) {
			canvas.style.cursor = '';
			map.removeLayer('matchline');

			if (hoveredStop) {
				console.log('Matched', hoveredStop);
				console.log('with', initDragStop);


        swapStops(initDragStop, hoveredStop);
				// connectStops(draggedGtfsStop, hoveredStop);
			} else {
				console.log('Unmatched');
			}

			initDragStop = null;

			// Unbind mouse/touch events
			map.off('mousemove', onMove);
			map.off('touchmove', onMove);
		}

		map.on('mousedown', 'gtfs', (e) => {
			// Prevent the default map drag behavior.
			e.preventDefault();

			canvas.style.cursor = 'grab';

			initDragStop = gtfs_stops[e.features[0].properties.id];

			map.addLayer(
				{
					id: 'matchline',
					type: 'line',
					source: 'matchline',
					paint: {
						'line-color': 'grey',
						'line-width': 4
					}
				},
				'gtfs'
			);

			map.on('mousemove', onMove);
			map.once('mouseup', onUp);
		});

		map.on('touchstart', 'gtfs', (e) => {
			if (e.points.length !== 1) return;

			// Prevent the default map drag behavior.
			e.preventDefault();

			initDragStop = gtfs_stops[e.features[0].properties.id];

			map.addLayer(
				{
					id: 'matchline',
					type: 'line',
					source: 'matchline',
					paint: {
						'line-color': 'grey',
						'line-width': 4
					}
				},
				'gtfs'
			);

			map.on('touchmove', onMove);
			map.once('touchend', onUp);
		});

		map.on('mouseenter', 'stops', (e) => {
			hoveredStop = stops[e.features[0].properties.id];
		});
		map.on('mouseleave', 'stops', (e) => {
			hoveredStop = null;
		});
	}

	onMount(() => {
		const coords = Object.values(routeStops)[0].map((s) => [stops[s].lon, stops[s].lat]);
		const bounds = coords.reduce((bounds, coord) => {
			return bounds.extend(coord);
		}, new LngLatBounds(coords[0], coords[0]));
		map = new Maplibre({
			container: 'map',
			style: 'https://tiles.intermodal.pt/styles/positron/style.json',
			center: bounds.getCenter(),
			minZoom: 8,
			maxZoom: 20,
			maxBounds: [
				[-10.0, 38.3],
				[-8.0, 39.35]
			]
		});
		map.fitBounds(bounds, { padding: 50 });

		map.addControl(new NavigationControl(), 'top-right');

		map.on('load', function () {
			addSourcesAndLayers();
			addEvents();

			mapLoaded = true;
			if (!loading) {
				refreshStops();
			}
		});
	});

	onDestroy(() => {
		map.remove();
	});
</script>

<div id="map" class="h-full relative">
	<div
		class="absolute left-0 z-10 flex flex-col justify-center h-full transition duration-750"
		class:-translate-x-[300px]={!$selectedGtfsStop}
	>
		<div
			class="w-[300px] bg-orange-900 grid grid-cols-1 h-full lg:h-[95%] lg:rounded-r-xl border-r-2 border-orange-700"
			style="grid-template-rows: auto 1fr;"
		>
			<div class="flex gap-1 justify-between p-1">
				<span class="text-base-100 font-bold self-center">{$selectedGtfsStop?.stop_name}</span>
				<button
					class="btn btn-circle btn-xs btn-error self-start"
					on:click={() => ($selectedGtfsStop = null)}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/></svg
					>
				</button>
			</div>
			<div class="w-full h-full overflow-y-scroll p-2 bg-base-100 flex flex-col lg:rounded-br-xl">
				<div class="flex gap-2">
					<span class="font-bold">GTFS ID:</span>
					<button
						class="btn btn-xs text-orange-200 bg-orange-600 border-orange-600"
						on:click={() => {
							if ($selectedGtfsStop) {
								flyToGtfsStop($selectedGtfsStop);
							}
						}}
					>
						{$selectedGtfsStop?.stop_id}
					</button>
				</div>
				<div class="flex flex-col">
					<h1 class="text-sm font-semibold self-center">Rotas</h1>
					<ul class="flex flex-col gap-3">
						{#each $selectedGtfsStopRoutes as route}
							<li class="flex flex-col">
								<span class="badge badge-secondary badge-outline">{route.id}</span>
								<ul class="ml-4 flex flex-col gap-2">
									{#each route.trips as trip}
										<li class="flex flex-col">
											<div class="flex">
												<button
													class="btn btn-outline btn-xs !rounded-r-0 grow"
													on:click={() => {
														flyToTrip(trip);
														$previewedTrip = trip;
													}}>{trip.id}</button
												>
												<button
													class="btn btn-outline btn-xs !rounded-l-0"
													class:btn-primary={trip === $previewedTrip}
													on:click={() => {
														$previewedTrip = trip === $previewedTrip ? null : trip;
													}}>Ver</button
												>
											</div>
											<span>Destino: <span class="font-bold">{trip.headsign}</span></span>
										</li>
									{/each}
								</ul>
							</li>
						{/each}
					</ul>
				</div>
			</div>
		</div>
	</div>
	<div
		class="absolute right-0 z-10 flex flex-col justify-center h-full transition duration-750"
		class:translate-x-[300px]={!$selectedStop}
	>
		<div
			class="w-[300px] bg-blue-950 grid grid-cols-1 h-full lg:h-[95%] lg:rounded-l-xl border-l-2 border-blue-700"
			style="grid-template-rows: auto 1fr;"
		>
			<div class="flex gap-1 justify-between p-1">
				<span class="text-base-100 font-bold self-center">{$selectedStop?.osm_name}</span>
				<button
					class="btn btn-circle btn-xs btn-error self-start"
					on:click={() => ($selectedStop = null)}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/></svg
					>
				</button>
			</div>
			<div
				class="w-full h-full overflow-y-scroll p-2 bg-base-100 flex flex-col gap-1 lg:rounded-bl-xl"
			>
				<div class="flex gap-2">
					<span class="font-bold">IML ID:</span>
					<div
						class="btn btn-xs text-blue-200 bg-blue-600 border-blue-600"
						on:click={() => {
							flyToStop($selectedStop);
						}}
					>
						{$selectedStop?.id}
					</div>
				</div>
				<div class="flex gap-2">
					<span class="font-bold">Coord:</span>
					<div class="flex">
						<input
							class="btn btn-primary btn-xs rounded-r-none"
							type="button"
							value={$selectedStop?.lat.toFixed(6)}
							on:click={() => {
								navigator.clipboard.writeText($selectedStop?.lat.toFixed(6));
							}}
						/>
						<input
							class="btn btn-primary btn-xs rounded-l-none"
							type="button"
							value={$selectedStop?.lon.toFixed(6)}
							on:click={() => {
								navigator.clipboard.writeText($selectedStop?.lon.toFixed(6));
							}}
						/>
					</div>
					<input
						class="btn btn-secondary btn-xs"
						type="button"
						value="Copiar"
						on:click={() => {
							navigator.clipboard.writeText(
								$selectedStop?.lat.toFixed(6) + '\t' + $selectedStop?.lon.toFixed(6)
							);
						}}
					/>
				</div>
				{#if $selectedStop?.tml_id}
					<div class="flex gap-1">
						<h1 class="text-xs font-bold">Ligada a</h1>
						{#if $selectedStop.gtfsStop}
							<button
								class="btn btn-xs text-orange-200 bg-orange-600 border-orange-600"
								on:click={() => {
									$selectedGtfsStop = $selectedStop.gtfsStop;
									flyToGtfsStop($selectedStop.gtfsStop);
								}}>{$selectedStop?.tml_id}</button
							>
						{:else}
							<button class="btn btn-xs text-orange-200 bg-orange-600 border-orange-600"
								>⚠️{$selectedStop?.tml_id}</button
							>
							<button class="btn btn-xs btn-error">Apagar erro</button>
						{/if}
					</div>
				{/if}
				<h1 class="text-sm self-center font-semibold">Rotas</h1>
				<ul class="flex flex-col gap-3">
					{#each $selectedStopRoutes || [] as route}
						<li class="flex flex-nowrap gap-1">
							<span class="badge badge-secondary badge-outline">{route.code}</span>
							<span class="font-bold">{route.name}</span>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</div>
	{#if $decodedToken?.permissions?.is_admin}
		<div class="absolute bottom-0 z-10 flex justify-center w-full transition duration-750">
			<div class="flex justify-center gap-4 lg:w-[50%] mb-4">
				<button
					class="btn btn-primary"
					class:hidden={!(
						$selectedStop &&
						$selectedGtfsStop &&
						(!$hasMutualLink || !credibleSources.includes($selectedStop?.tml_id_source)) &&
						!($selectedStop.gtfsStop === $selectedGtfsStop && $selectedStop?.tml_id_source === 'h1')
					)}
					on:click={() => {
						connectStops($selectedStop, $selectedGtfsStop);
					}}>Ligar paragens</button
				>
				<!-- <button class="btn btn-warning">Adicionar alerta</button>
				<button class="btn btn-error" class:hidden={!$hasMutualLink}>Apagar ligação</button> -->
			</div>
		</div>
	{/if}
</div>
