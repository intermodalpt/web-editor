<script>
	import { onDestroy, tick } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import * as turf from '@turf/turf';
	import { liveQuery } from 'dexie';
	import { fetchStops, getStops, softInvalidateStops, selectedRegion } from '$lib/db';
	import { regionMapParams } from '$lib/utils.js';
	import { decodedToken, token } from '$lib/stores.js';
	import { apiServer, credibleSources } from '$lib/settings.js';
	import MatchViewer from './MatchViewer.svelte';
	import MatcherMap from './MatcherMap.svelte';

	/** @type {import('./$types').PageData} */
	export let data;

	const operator = data.operator;
	const operatorId = operator.id;
	//const operatorStops = data.operatorStops;

	let map;

	let stopsLoaded = false;
	let mapLoaded = false;
	// Get rid of these if we decide to stay with page.js's load()
	let gtfsStopsLoaded = true;
	let gtfsTripsLoaded = true;
	$: loading = !stopsLoaded || !gtfsStopsLoaded || !gtfsTripsLoaded || !mapLoaded;

	const regionStops = liveQuery(() => getStops());

	async function loadData() {
		await fetchStops().then(async () => {
			await tick();
			stopsLoaded = true;
		});
	}

	loadData().then(() => {
		console.log('Data loaded');
	});

	const genericNames = derived(regionStops, ($regionStops) => {
		if (!$regionStops) return {};
		return Object.fromEntries(Object.values($regionStops).map((stop) => [stop.name, stop]));
	});

	const gtfsStops = writable(data.gtfsStops);
	const gtfsRoutes = writable(data.gtfsRoutes);

	const knownGtfsIds = new Set(Object.values(data.gtfsStops).map((stop) => stop.stop_id));
	const usedGtfsIds = new Set(
		data.operatorStops
			.filter((stop) => knownGtfsIds.has(stop.stop_ref))
			.map((stop) => stop.stop_ref)
	);
	const danglingGtfsIds = new Set(
		data.operatorStops
			.filter((stop) => knownGtfsIds.has(stop.stop_ref))
			.map((stop) => stop.stop_ref)
	);

	// Every stop ID that is matched with a GTFS stop
	const usedStopIds = new Set(data.operatorStops.map((stop) => stop.id));

	// IML stops that are linked
	const operatorStops = writable(data.operatorStops);

	const stopIndex = derived([regionStops, operatorStops], ([$regionStops, $operatorStops]) => {
		if (!$regionStops || !$operatorStops) return {};

		const opStops = $operatorStops.map((stop) => {
			return {
				id: stop.id,
				name: stop.official_name || genericNames[stop.id] || '{?}',
				stop_ref: stop.stop_ref,
				source: stop.source,
				lat: stop.lat,
				lon: stop.lon
			};
		});

		const regStops = Object.values($regionStops).map((stop) => {
			return {
				id: stop.id,
				name: stop.name,
				lat: stop.lat,
				lon: stop.lon,
				stop_ref: null,
				source: null
			};
		});

		// Merge them into a single object where the operatorStops have precedence
		return Object.fromEntries([...regStops, ...opStops].map((stop) => [stop.id, stop]));
	});

	// IML stops that are not linked
	const unusedRegionStops = derived(regionStops, ($regionStops) => {
		if (!$regionStops) return [];

		return Object.values($regionStops).filter((stop) => !usedStopIds.has(stop.id));
	});

	const linkedStops = derived([regionStops, gtfsStops], ([$stops, $gtfsStops]) => {
		if (!$stops || !$gtfsStops) return {};

		return Object.fromEntries(
			Object.values($stops).map((stop) => {
				const rel = stop.operators.find((operatorStop) => operatorStop.operator_id === operatorId);
				if (!rel) return [stop.id, stop];
				return [
					stop.id,
					Object.assign(stop, {
						official_name: rel.name,
						source: rel.source,
						gtfsStop: $gtfsStops[rel.stop_ref] || null
					})
				];
			})
		);
	});

	const selectedOperatorStop = writable(null);
	const selectedUnusedStop = writable(null);
	const selectedGtfsStop = writable(null);

	const previewedTrip = writable(null);

	selectedGtfsStop.subscribe((gtfsStop) => {
		previewedTrip.set(null);

		if (!map) return;

		map.toggleSidePadding(gtfsStop || $selectedOperatorStop || $selectedUnusedStop);
	});

	selectedOperatorStop.subscribe((selectedOperatorStop) => {
		if (selectedOperatorStop) {
			$selectedUnusedStop = null;
		}

		if (!map) return;

		map.toggleSidePadding($selectedGtfsStop || selectedOperatorStop || $selectedUnusedStop);
	});

	selectedUnusedStop.subscribe((selectedUnusedtop) => {
		if (selectedUnusedtop) {
			$selectedOperatorStop = null;
		}

		if (!map) return;

		map.toggleSidePadding($selectedGtfsStop || $selectedOperatorStop || selectedUnusedtop);
	});

	const stopSearchInput = writable(null);

	const stopSearchResults = derived(
		[stopSearchInput, linkedStops, gtfsStops],
		([$stopSearchInput, $linkedStops, $gtfsStops]) => {
			if (!$stopSearchInput || $stopSearchInput.length < 3) {
				return;
			}

			let lowerInput = $stopSearchInput.toLowerCase();

			const stop_results = Object.values($linkedStops)
				.filter((stop) => {
					return (
						(stop.id && ('' + stop.id).includes($stopSearchInput)) ||
						stop.operators.some(
							(op) =>
								op.stop_ref?.toLowerCase().includes($stopSearchInput) ||
								op.name?.toLowerCase().includes($stopSearchInput)
						) ||
						(stop.name && stop.name.toLowerCase().includes(lowerInput))
					);
				})
				.map((stop) => {
					return {
						id: stop.id,
						stopRef: stop.operators.find((op) => op.operator_id === operatorId)?.stop_ref,
						type: 'iml',
						name: stop.name,
						lat: stop.lat,
						lon: stop.lon
					};
				});

			const gtfs_results = Object.values($gtfsStops)
				.filter((stop) => {
					return (
						(stop.stop_id && stop.stop_id.includes($stopSearchInput)) ||
						(stop.stop_name && stop.stop_name.toLowerCase().includes(lowerInput))
					);
				})
				.map((stop) => {
					return {
						id: stop.id,
						stopRef: stop.stop_id,
						type: 'gtfs',
						name: stop.stop_name,
						lat: stop.lat,
						lon: stop.lon
					};
				});

			return stop_results.concat(gtfs_results).sort((a, b) => {
				return a.name?.localeCompare(b.name);
			});
		}
	);

	previewedTrip.subscribe((trip) => {
		if (!map) return;

		map.redrawTripPreview(
			trip ? trip.stops.map((stop) => [$gtfsStops[stop].lon, $gtfsStops[stop].lat]) : []
		);
	});

	function refreshGtfsStopFlows() {
		if (!map || !$selectedGtfsStop) return;
		// For each route, for each trip, build a three stop window with the previous, current and next stop
		const windows = new Map();
		$selectedGtfsStop.routes.forEach((route) => {
			for (const trip of route.trips) {
				// Find index of the current stop in the trip
				const idx = trip.stops.findIndex((s) => s === stop.id);
				// If not found, ignore
				if (idx === -1) continue;
				// If found, build a window with the previous, current and next stop
				const tripWindow = JSON.stringify([trip.stops[idx - 1], trip.stops[idx + 1]]);
				// If the window is not in the map, add it, pointing to the current route, trip pair
				if (!windows.has(tripWindow)) {
					windows.set(tripWindow, [[route, trip]]);
				} else {
					// If the window is already in the map, add the current route, trip pair to the list
					windows.get(tripWindow).push([route, trip]);
				}
			}
		});
		// Rebuild window with JSON parsed keys
		const parsedWindows = new Map();
		for (const [key, value] of windows) {
			parsedWindows.set(JSON.parse(key), value);
		}

		// Step 2
		const prevSuccPairs = Array.from(parsedWindows.keys());

		if (prevSuccPairs.length === 0) {
			return;
		}

		const origins = prevSuccPairs.filter((w) => w[0]).map((w) => $gtfsStops[w[0]]);
		const destinations = prevSuccPairs.filter((w) => w[1]).map((w) => $gtfsStops[w[1]]);
		const oriPoints = turf.points(origins.map((s) => [s.stop_lon, s.stop_lat]));
		const dstPoints = turf.points(destinations.map((s) => [s.stop_lon, s.stop_lat]));
		const avgOri = turf.center(oriPoints);
		const avgDst = turf.center(dstPoints);
		const bearing = turf.bearing(avgOri, avgDst);

		const originLines = origins.map((s) => [
			[s.stop_lon, s.stop_lat],
			[stop.stop_lon, stop.stop_lat]
		]);

		const destinationLines = destinations.map((s) => [
			[stop.stop_lon, stop.stop_lat],
			[s.stop_lon, s.stop_lat]
		]);

		redrawFlow(stop.lon, stop.lat, bearing, originLines, destinationLines);
	}

	function refreshStops() {
		if (!map) return;

		let unvStops = $operatorStops.filter(
			(stop) => stop.source && !credibleSources.includes(stop.source) && stop.gtfsStop
		);
		let verStops = $operatorStops.filter(
			(stop) => stop.source && credibleSources.includes(stop.source) && stop.gtfsStop
		);

		map.redrawMatches(unvStops, verStops);

		const usedFeatures = Object.values($operatorStops).map((stop) => {
			return {
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: [stop.lon, stop.lat]
				},
				properties: {
					id: stop.id,
					missing: !knownGtfsIds.has(stop.stop_ref)
				}
			};
		});

		const unusedFeatures = $unusedRegionStops.map((stop) => {
			return {
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: [stop.lon, stop.lat]
				},
				properties: {
					id: stop.id
				}
			};
		});

		const gtfsFeatures = Object.values($gtfsStops).map((stop) => {
			return {
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: [stop.stop_lon, stop.stop_lat]
				},
				properties: {
					id: stop.id,
					id_name: `${stop.id} - ${stop.stop_name}`
				}
			};
		});

		map.redrawStops(usedFeatures, unusedFeatures, gtfsFeatures);
	}

	function connectStops(stop, gtfsStop) {
		const prevOpStopRel = stop.operators.find((rel) => rel.operator_id == operatorId);

		if (
			stop.gtfsStop &&
			stop.gtfsStop != gtfsStop &&
			!confirm('Paragem já está ligada a outra paragem GTFS. Continuar?')
		) {
			// GTFS link conflict
			return;
		}

		if (
			prevOpStopRel &&
			credibleSources.includes(prevOpStopRel.source) &&
			!confirm('Paragem já tem um ID confirmado. Alterar?')
		) {
			//GTFS didn't change but the source is going to change
			return;
		}

		const beingUsed = Object.values(regionStops).some((s) => s != stop && s.gtfsStop == gtfsStop);

		if (beingUsed && !confirm('Paragem GTFS já está ligada a outra paragem. Continuar?')) {
			return;
		}

		fetch(`${apiServer}/v1/operators/${operatorId}/stops/${stop.id}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				authorization: `Bearer ${$token}`
			},
			body: JSON.stringify({
				official_name: gtfsStop.stop_name,
				stop_ref: gtfsStop.stop_id,
				source: 'h1'
			})
		}).then(async (r) => {
			if (r.ok) {
				console.log('ID da paragem atualizado com sucesso.');
				stop.gtfsStop = gtfsStop;

				stop.operators = stop.operators.filter((rel) => rel.operator_id != operatorId);
				stop.operators.push({
					operator_id: operatorId,
					stop_ref: gtfsStop.stop_id,
					name: gtfsStop.stop_name,
					source: 'h1'
				});
				await softInvalidateStops();

				refreshStops();
				// Force data refresh
				$selectedGtfsStop = $selectedGtfsStop;
				$selectedOperatorStop = $selectedOperatorStop;
			} else {
				alert('Erro a atualizar o ID da paragem.\nRecarregue e tente novamente.');
			}
		});
	}

	function disconnectStops(stop, gtfsStop) {
		if (stop.gtfsStop != gtfsStop) {
			console.error('BUG: Tentativa de desligar paragens desligadas');
			return;
		}

		if (!confirm(`De certeza que quer desligar #${stop.id} de GTFS#${gtfsStop.stop_id}?`)) {
			return;
		}

		fetch(`${apiServer}/v1/operators/${operatorId}/stops/${stop.id}`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				authorization: `Bearer ${$token}`
			}
		}).then(async (r) => {
			if (r.ok) {
				console.log('ID da paragem atualizado com sucesso.');
				stop.gtfsStop = undefined;

				stop.operators = stop.operators.filter((rel) => rel.operator_id != operatorId);
				await softInvalidateStops();

				refreshStops();
				// Force data refresh
				$selectedGtfsStop = $selectedGtfsStop;
				$selectedOperatorStop = $selectedOperatorStop;
			} else {
				alert('Erro a desligar paragens.\nRecarregue e tente novamente.');
			}
		});
	}

	selectedRegion.subscribe((region) => {
		if (!map || !region) return;

		const mapParams = regionMapParams(region);
		map.setCenterAndZoom(mapParams.center, mapParams.zoom);
	});

	onDestroy(() => {
		mapLoaded = false;
	});
</script>

<MatcherMap
	bind:this={map}
	{gtfsStops}
	mapParams={regionMapParams($selectedRegion)}
	on:load={async () => {
		console.log('Map loaded');
		mapLoaded = true;
		await tick();

		if (!loading) {
			console.log('Map loaded2');
			refreshStops();
		}
	}}
	on:used-click={(e) => ($selectedOperatorStop = $stopIndex[e.detail.id])}
	on:unused-click={(e) => ($selectedUnusedStop = $stopIndex[e.detail.id])}
	on:gtfs-click={(e) => {
		$selectedGtfsStop = $gtfsStops[e.detail.id];
		refreshGtfsStopFlows();
	}}
>
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
	{/if}
	<div class="absolute left-0 z-20 flex flex-col justify-center h-full">
		<div
			class="w-[300px] h-full lg:h-[95%] overflow-y-scroll p-2 bg-base-100 flex flex-col gap-2 lg:rounded-r-xl shadow-md"
		>
			{$selectedGtfsStop?.stop_id}
			<MatchViewer
				canEdit={$decodedToken?.permissions?.is_admin}
				{operator}
				{selectedGtfsStop}
				{selectedOperatorStop}
				{selectedUnusedStop}
				{credibleSources}
				{previewedTrip}
				on:fly-to={(e) => map.flyTo(...e.detail)}
				on:fly-to-trip={(e) => {
					const trip = e.detail.trip;
					map.flyToTrip(trip.stops.map((s) => $gtfsStops[s]));
				}}
				on:connect={(e) => connectStops(e.detail.operatorStop, e.detail.gtfsStop)}
				on:disconnect={(e) => disconnectStops(e.detail.operatorStop, e.detail.gtfsStop)}
			/>
		</div>
	</div>

	<div
		class="modal-box relative z-30 sm:max-w-5xl grid grid-cols-1"
		style="grid-template-rows: auto 1fr;"
		slot="search-dialog"
	>
		<div>
			<form method="dialog">
				<button class="btn btn-sm btn-circle btn-error absolute right-2 top-2">x</button>
			</form>
			<h3 class="text-lg font-bold">Pesquisar por paragem</h3>
			<input
				type="text"
				class="input input-primary input-bordered w-full"
				placeholder="Nome ou identificador"
				bind:value={$stopSearchInput}
			/>
		</div>
		{#if $stopSearchResults}
			<form method="dialog" class="flex flex-col gap-1 mt-2 overflow-y-scroll">
				{#each $stopSearchResults as result}
					<button
						class="card card-compact w-full bg-base-100 border-2 shadow-sm cursor-pointer"
						on:click={() => map.flyTo(result.lon, result.lat)}
					>
						<div class="card-body">
							<div class="flex gap-1">
								{#if result.type === 'iml'}
									<span class="px-2 mr-1 bg-blue-500 rounded-full" />
									<h2 class="text-md font-semibold">
										<span class="text-md border-b-2 border-blue-500">{result.id}</span>
										{result.name || result.official_name}
									</h2>
									{#if result.stopRef}
										→
										<span class="text-md border-b-2 border-orange-600 self-start">
											{result.stopRef}
										</span>
									{/if}
								{:else}
									<span class="px-2 mr-1 bg-orange-600 rounded-full" />
									<h2 class="text-md font-semibold">
										<span class="text-md border-b-2 border-orange-600">{result.id}</span>
										{result.name || result.official_name}
									</h2>
								{/if}
							</div>
						</div>
					</button>
				{/each}
			</form>
		{/if}
	</div>
</MatcherMap>
