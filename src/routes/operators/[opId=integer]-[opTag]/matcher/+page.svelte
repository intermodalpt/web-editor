<script>
	import { onDestroy, tick } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import * as turf from '@turf/turf';
	import { softInvalidateStops, selectedRegion } from '$lib/db';
	import { regionMapParams } from '$lib/utils.js';
	import { decodedToken, token, toast } from '$lib/stores.js';
	import { apiServer, credibleSources } from '$lib/settings.js';
	import MatchViewer from './MatchViewer.svelte';
	import MatcherMap from './MatcherMap.svelte';

	/** @type {import('./$types').PageData} */
	export let data;

	const operator = data.operator;
	const operatorId = operator.id;

	// IML stops that are linked
	const operatorStopRels = writable(data.operatorStopRels);
	// IML stops in the region (which might or might not be linked)
	const regionStops = writable(data.regionStops);
	const gtfsStops = writable(data.gtfsStops);
	const gtfsRoutes = writable(data.gtfsRoutes);
	const osmStops = writable({});

	const knownGtfsIds = new Set(Object.values(data.gtfsStops).map((stop) => stop.stop_id));

	let map;

	let stopsLoaded = true;
	let mapLoaded = false;
	// Get rid of these if we decide to stay with page.js's load()
	let gtfsStopsLoaded = true;
	let gtfsTripsLoaded = true;
	let osmStopsLoaded = false;
	$: loading = !stopsLoaded || !gtfsStopsLoaded || !gtfsTripsLoaded || !mapLoaded;

	async function loadData() {
		Promise.all([
			fetch(`${apiServer}/v1/osm/stops`)
				.then((r) => r.json())
				.then((r) => {
					$osmStops = Object.fromEntries(r.map((stop) => [stop.id, stop]));
					console.log('Sup?');
					osmStopsLoaded = true;
				})
		])
			.then(async ([osmStops]) => {
				if (mapLoaded) {
					// loadStops();
					loadOsmStops();
				}
			})
			.catch((e) => {
				toast('Failed to load the OSM stops', 'error');
				console.log(e);
			})
			.then(async () => {
				console.log('data loaded');
				await loadMissing();
			});
	}

	loadData().then(async () => {
		console.log('data loaded');
		await loadMissing();
	});

	const genericNames = derived(regionStops, ($regionStops) => {
		if (!$regionStops) return {};
		return Object.fromEntries($regionStops.map((stop) => [stop.id, stop.name]));
	});

	// Every stop ID that is matched with a GTFS stop
	// TODO make this reactive
	const usedStopIds = new Set(data.operatorStopRels.map((stop) => stop.id));

	const stopIndex = derived(
		[regionStops, operatorStopRels],
		([$regionStops, $operatorStopRels]) => {
			if (!$regionStops || !$operatorStopRels) return {};

			const opStops = $operatorStopRels.map((stop) => {
				return {
					id: stop.id,
					name: $genericNames[stop.id] || stop.official_name || '{?}',
					official_name: stop.official_name,
					stop_ref: stop.stop_ref,
					gtfsStop: $gtfsStops[stop.stop_ref],
					source: stop.source,
					lat: stop.lat,
					lon: stop.lon,
					_ori: stop
				};
			});

			const regStops = $regionStops.map((stop) => {
				return {
					id: stop.id,
					name: stop.name,
					lat: stop.lat,
					lon: stop.lon,
					stop_ref: null,
					source: null,
					_ori: stop
				};
			});

			// Merge them into a single object where the operatorStops have precedence
			return Object.fromEntries([...regStops, ...opStops].map((stop) => [stop.id, stop]));
		}
	);

	// IML stops that are not linked
	const unusedRegionStops = derived(regionStops, ($regionStops) => {
		if (!$regionStops) return [];

		return Object.values($regionStops).filter((stop) => !usedStopIds.has(stop.id));
	});

	const selectedOperatorStop = writable(null);
	const selectedUnusedStop = writable(null);
	const selectedGtfsStop = writable(null);
	const selectedOsmStop = writable(null);

	$: areStopsSelected =
		$selectedGtfsStop || $selectedUnusedStop || $selectedOperatorStop || $selectedOsmStop;

	const previewedTrip = writable(null);

	selectedGtfsStop.subscribe((gtfsStop) => {
		previewedTrip.set(null);

		if (!map) return;

		map.increaseSidePadding(gtfsStop || $selectedOperatorStop || $selectedUnusedStop);
	});

	selectedOperatorStop.subscribe((selectedOperatorStop) => {
		if (selectedOperatorStop) $selectedUnusedStop = null;

		if (!map) return;

		map.increaseSidePadding($selectedGtfsStop || selectedOperatorStop || $selectedUnusedStop);
	});

	selectedUnusedStop.subscribe((selectedUnusedtop) => {
		if (selectedUnusedtop) $selectedOperatorStop = null;

		if (!map) return;

		map.increaseSidePadding($selectedGtfsStop || $selectedOperatorStop || selectedUnusedtop);
	});

	const stopSearchInput = writable(null);

	const stopSearchResults = derived(
		[stopSearchInput, stopIndex, gtfsStops],
		([$stopSearchInput, $stopIndex, $gtfsStops]) => {
			if (!$stopSearchInput || $stopSearchInput.length < 3) {
				return;
			}

			const lowerInput = $stopSearchInput.toLowerCase();

			const results = Object.values($stopIndex)
				.filter((stop) => {
					return (
						('' + stop.id).includes($stopSearchInput) ||
						stop.stop_ref?.toLowerCase().includes(lowerInput) ||
						stop.name?.toLowerCase().includes(lowerInput) ||
						stop.official_name?.toLowerCase().includes(lowerInput)
					);
				})
				.map((stop) => {
					return {
						id: stop.id,
						stopRef: stop.stop_ref,
						type: 'iml',
						name: stop.name,
						lat: stop.lat,
						lon: stop.lon
					};
				});

			const gtfs_results = Object.values($gtfsStops)
				.filter((stop) => {
					return (
						stop.stop_id.toLowerCase().includes(lowerInput) ||
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

			return results.concat(gtfs_results).sort((a, b) => {
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

		let unvStops = $operatorStopRels.filter(
			(stop) => stop.source && !credibleSources.includes(stop.source) && stop.gtfsStop
		);
		let verStops = $operatorStopRels.filter(
			(stop) => stop.source && credibleSources.includes(stop.source) && stop.gtfsStop
		);

		map.redrawMatches(unvStops, verStops);

		const usedFeatures = $operatorStopRels.map((stop) => {
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

	function loadOsmStops() {
		const lines = [];

		for (const osmStop of Object.values($osmStops)) {
			if (osmStop.lon == 0.0) {
				continue;
			}
			if (osmStop.iml_id) {
				const imlStop = $stopIndex[osmStop.iml_id];
				if (imlStop) {
					lines.push([
						[osmStop.lon, osmStop.lat],
						[imlStop.lon, imlStop.lat]
					]);
				}
			}
		}

		map.redrawOsmStops(Object.values($osmStops), lines);
	}

	async function handlePairStop(e) {
		const stop = e.detail.stop;
		const pairing = e.detail.pairing;

		if (usedStopIds.has(stop.id)) {
			const originalStop = $operatorStopRels.find((s) => s.id == stop.id);
			const gtfsStop = stop.gtfsStop;

			if (
				!confirm(
					gtfsStop
						? `De certeza que quer desligar\n#${stop.id}:${stop.name} de\nG${gtfsStop.stop_id}:${gtfsStop.stop_name}?`
						: `De certeza que quer desligar\n#${stop.id}:${stop.name} de\n${originalStop.stop_ref}:${originalStop.official_name}?`
				)
			) {
				return;
			}
		}

		fetch(`${apiServer}/v1/operators/${operatorId}/stops/${stop.id}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				authorization: `Bearer ${$token}`
			},
			body: JSON.stringify({
				official_name: pairing.official_name,
				stop_ref: pairing.stop_ref,
				source: 'h1'
			})
		}).then(async (r) => {
			if (r.ok) {
				toast('Informação guardada', 'success');

				if (usedStopIds.has(stop.id)) {
					$operatorStopRels = $operatorStopRels.filter((s) => s.id != stop.id);
					usedStopIds.delete(stop.id);
				}

				// Add the stop to the "used" collections
				$operatorStopRels.push({
					id: stop.id,
					official_name: pairing.official_name,
					stop_ref: pairing.stop_ref,
					source: 'h1',
					lat: stop.lat,
					lon: stop.lon,
					gtfsStop: $gtfsStops[pairing.stop_ref]
				});
				usedStopIds.add(stop.id);
				// Force the recalculation of the unused stops
				$regionStops = $regionStops;
				// Change the selected stop to the non-operator one
				// Do it this way to prevent a data race with the user changing stops in the meantime
				if ($selectedOperatorStop && $selectedOperatorStop.id == stop.id) {
					$selectedOperatorStop = $stopIndex[stop.id];
				} else if ($selectedUnusedStop && $selectedUnusedStop.id == stop.id) {
					$selectedOperatorStop = $stopIndex[stop.id];
				}
				// Redraw
				refreshStops();

				await softInvalidateStops();
			} else {
				alert('Erro a atualizar o ID da paragem.\nRecarregue e tente novamente.');
				console.error(r);
			}
		});
	}

	function unpairStop(stop) {
		const originalStop = stop._ori;
		const gtfsStop = stop.gtfsStop;
		if (!originalStop) {
			console.error('BUG: No original stop found');
			return;
		}

		if (gtfsStop) {
			if (
				!confirm(
					gtfsStop
						? `De certeza que quer desligar\n#${stop.id}:${stop.name} de\nG${gtfsStop.stop_id}:${gtfsStop.stop_name}?`
						: `De certeza que quer desligar\n#${stop.id}:${stop.name} de\n${originalStop.stop_ref}:${originalStop.official_name}?`
				)
			) {
				return;
			}
		}

		fetch(`${apiServer}/v1/operators/${operatorId}/stops/${stop.id}`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				authorization: `Bearer ${$token}`
			}
		}).then(async (r) => {
			if (r.ok) {
				toast('Informação guardada', 'info');
				// Drop the stop from the "used" collections
				$operatorStopRels = $operatorStopRels.filter((stop) => stop.id != originalStop.id);
				usedStopIds.delete(originalStop.id);
				// Force the recalculation of the unused stops
				$regionStops = $regionStops;
				// Change the selected stop to the non-operator one
				$selectedUnusedStop = $stopIndex[originalStop.id];
				// Redraw
				refreshStops();

				await softInvalidateStops();
			} else {
				alert('Erro a desligar paragens.\nRecarregue e tente novamente.');
			}
		});
	}

	async function handleCreateStop(e) {
		console.log(e);

		const newStop = {
			lat: e.detail.stop.lat,
			lon: e.detail.stop.lon,
			name: e.detail.stop.name,
			license: e.detail.stop.license,
			is_ghost: e.detail.stop.isGhost,
			osm_id: e.detail.stop.osmId
		};

		const pairing = {
			official_name: e.detail.stop.officialName,
			stop_ref: e.detail.stop.ref,
			source: 'h1'
		};

		let res = await fetch(`${apiServer}/v1/stops`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				authorization: `Bearer ${$token}`
			},
			body: JSON.stringify(newStop)
		});

		if (res.ok) {
			toast('Paragem criada', 'success');

			await softInvalidateStops();
			let dummy = await res.json();
			newStop.id = dummy.id;

			console.log(dummy);
			console.log(newStop);

			$regionStops.push({
				id: newStop.id,
				lat: newStop.lat,
				lon: newStop.lon,
				name: newStop.name
			});

			// Force the recalculation of the unused stops
			$regionStops = $regionStops;
		} else {
			toast('Erro a criar a paragem', 'error');
			console.error(res);
			return;
		}

		console.log('A associar à região');
		res = await fetch(`${apiServer}/v1/regions/${$selectedRegion.id}/stops/${newStop.id}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${$token}`
			}
		});

		if (res.ok) {
			toast('Paragem associada à região', 'success');
		} else {
			toast('Erro a associar paragem à região', 'error');
			console.error(res);
			return;
		}

		if (e.detail.tagUnverified) {
			console.log('A colocar como não verificado');
			res = await fetch(`${apiServer}/v1/stops/${newStop.id}/todo`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					authorization: `Bearer ${$token}`
				},
				body: JSON.stringify(['verifyLocation'])
			});

			if (res.ok) {
				toast('Paragem marcada como pendente de verificação', 'success');
			} else {
				toast('Erro a ligar a paragem', 'error');
				console.error(res);
				return;
			}
		}

		if (e.detail.pair) {
			res = await fetch(`${apiServer}/v1/operators/${operatorId}/stops/${newStop.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					authorization: `Bearer ${$token}`
				},
				body: JSON.stringify({
					official_name: e.detail.stop.officialName,
					stop_ref: e.detail.stop.ref,
					source: 'h1'
				})
			});

			if (res.ok) {
				toast('Paragem ligada', 'success');

				const gtfsStop = $gtfsStops[e.detail.stop.ref];
				gtfsStop.seen = true;

				// Add the stop to the "used" collections
				$operatorStopRels.push({
					id: newStop.id,
					official_name: e.detail.stop.officialName,
					stop_ref: e.detail.stop.ref,
					source: 'h1',
					lat: newStop.lat,
					lon: newStop.lon,
					gtfsStop: gtfsStop
				});
				usedStopIds.add(newStop.id);

				if (usedStopIds.has(stop.id)) {
					$operatorStopRels = $operatorStopRels.filter((s) => s.id != stop.id);
					usedStopIds.delete(stop.id);
				}
			} else {
				toast('Erro a ligar a paragem', 'error');
				console.error(res);
				return;
			}
		}

		// Force the recalculation of the unused stops
		$regionStops = $regionStops;

		// Change the selected stop to the non-operator one
		// Do it this way to prevent a data race with the user changing stops in the meantime
		$selectedOperatorStop = $stopIndex[newStop.id];
		// Redraw
		refreshStops();
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
	mapParams={regionMapParams($selectedRegion)}
	on:load={async () => {
		mapLoaded = true;
		await tick();

		if (!loading) {
			refreshStops();
			loadOsmStops();
		}
	}}
	on:used-click={(e) => ($selectedOperatorStop = $stopIndex[e.detail.id])}
	on:unused-click={(e) => ($selectedUnusedStop = $stopIndex[e.detail.id])}
	on:gtfs-click={(e) => {
		$selectedGtfsStop = $gtfsStops[e.detail.id];
		refreshGtfsStopFlows();
	}}
	on:osm-click={(e) => {
		$selectedOsmStop = $osmStops[e.detail.id];
		console.log(e.detail.id);
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
			class="h-full lg:h-[95%] overflow-y-scroll p-2 bg-base-100 flex flex-col shrink gap-2 lg:rounded-r-xl shadow-md transition-all duration-300"
			class:w-[350px]={areStopsSelected}
			class:w-[300px]={!areStopsSelected}
		>
			<MatchViewer
				canEdit={$decodedToken?.permissions?.is_admin}
				{operator}
				gtfsStops={$gtfsStops}
				{selectedGtfsStop}
				{selectedOperatorStop}
				{selectedUnusedStop}
				{selectedOsmStop}
				{credibleSources}
				{previewedTrip}
				on:fly-to={(e) => map.flyTo(...e.detail)}
				on:fly-to-trip={(e) => {
					const trip = e.detail.trip;
					map.flyToTrip(trip.stops.map((s) => $gtfsStops[s]));
				}}
				on:pair={handlePairStop}
				on:unpair={handleUnpairStop}
				on:create-stop={handleCreateStop}
			/>
			<button class="btn btn-sm btn-outline">Mostrar OSM</button>
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
