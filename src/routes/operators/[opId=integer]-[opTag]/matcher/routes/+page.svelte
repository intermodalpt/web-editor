<script>
	import { onDestroy, onMount } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import { Map as Maplibre, NavigationControl, LngLatBounds } from 'maplibre-gl?client';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import Select from 'svelte-select';
	import polyline from '@mapbox/polyline';
	import { progressiveSequenceAlignment, longestCommonSubsequence } from '$lib/utils';
	import { apiServer, osrmServer, tileStyle } from '$lib/settings';

	/** @type {import('./$types').PageData} */
	export let data;

	let gtfsStops = data.gtfsStops;
	let gtfsRoutes = data.gtfsRoutes;
	let stops = data.stops;
	let routes = data.routes;

	const routeOptions = routes
		.sort((a, b) => a.code?.localeCompare(b.code))
		.map((route) => {
			return {
				value: route.id,
				label: `${route.code} - ${route.name}`
			};
		});

	const gtfsRouteOptions = gtfsRoutes
		.sort((a, b) => a.id.localeCompare(b.id))
		.map((route) => {
			return {
				value: route.id,
				label: `${route.id} - ${route.name}`
			};
		});

	let selectedRoute = writable(null);
	let selectedGtfsRoute = writable(null);

	let directionTab = writable(0);

	const crossRoute = derived(
		[selectedRoute, selectedGtfsRoute],
		async ([$selectedRoute, $selectedGtfsRoute], set) => {
			if (!$selectedRoute || !$selectedGtfsRoute) {
				set(undefined);
				return;
			}

			// Attach stops for this route if they have not been loaded yet
			if (!$selectedRoute.subroutes.every((subroute) => subroute.stops)) {
				await fetch(`${apiServer}/v1/routes/${$selectedRoute.id}/stops`)
					.then((r) => r.json())
					.then((subrouteStops) => {
						for (const subroute of $selectedRoute.subroutes) {
							const stopIds = subrouteStops.find((e) => e.subroute === subroute.id)?.stops;
							if (stopIds) {
								subroute.stopsIds = stopIds;
								subroute.stops = stopIds.map((id) => stops[id]);
								subroute.gtfsIds = subroute.stops.map((s) => s.gtfsId);
							} else {
								alert(`Stops not found for subroute ${subroute.id}`);
							}
						}
					});
			}

			// Remap every stop to different IDs
			let seqId = 1;
			const imlToSeq = {};
			const gtfsToSeq = {};
			const seenImlIds = new Set();
			const seenGtfsIds = new Set();

			for (const subroute of $selectedRoute.subroutes) {
				for (const stopId of subroute.stopsIds) {
					if (seenImlIds.has(stopId)) {
						continue;
					}

					seenImlIds.add(stopId);
					imlToSeq[stopId] = seqId;
					seqId++;
				}

				for (const gtfsId of subroute.gtfsIds) {
					if (!gtfsId || seenGtfsIds.has(gtfsId)) {
						continue;
					}

					seenGtfsIds.add(gtfsId);
					gtfsToSeq[gtfsId] = seqId;
					seqId++;
				}
			}

			for (const trip of $selectedGtfsRoute.trips) {
				for (const stopId of trip.stops) {
					if (seenGtfsIds.has(stopId)) {
						continue;
					}

					seenGtfsIds.add(stopId);
					gtfsToSeq[stopId] = seqId;
					seqId++;
				}
			}

			const directionClusters = [];

			for (const trip of $selectedGtfsRoute.trips) {
				if (directionClusters.length === 0) {
					directionClusters.push({ trips: [trip], subroutes: [] });
				} else {
					let found = false;
					for (const cluster of directionClusters) {
						// At least 5 continuous stops in common tells us that this is the same direction
						if (longestCommonSubsequence(cluster.trips[0].stops, trip.stops).length > 5) {
							cluster.trips.push(trip);
							found = true;
							break;
						}
					}
					if (!found) {
						directionClusters.push({ trips: [trip], subroutes: [] });
					}
				}
			}

			if (directionClusters.length > 2) {
				alert(
					'More than 2 directions found in the GTFS.\nSomething funny going on with this route.\nProceed with caution.'
				);
			}

			const unmatchedSubroutes = [];
			for (const subroute of $selectedRoute.subroutes) {
				let found = false;
				// let sequencedImlStops = subroute.stopIds.map((id) => imlToSeq[id]);
				let sequencedImlGtfsStops = subroute.gtfsIds.map((id) => gtfsToSeq[id]);

				for (const cluster of directionClusters) {
					// At least 5 continuous stops in common tells us that this is the same direction
					let sequencedGtfsStops = cluster.trips[0].stops.map((id) => gtfsToSeq[id]);

					if (longestCommonSubsequence(sequencedImlGtfsStops, sequencedGtfsStops).length > 5) {
						cluster.subroutes.push(subroute);
						found = true;
						break;
					}
				}

				if (!found) {
					unmatchedSubroutes.push(subroute);
				}
			}

			for (const cluster of directionClusters) {
				const stopSequences = [];
				for (const subroute of cluster.subroutes) {
					stopSequences.push(
						subroute.stops.map((stop) => {
							if (stop.gtfsId) {
								return gtfsToSeq[stop.gtfsId];
							} else {
								return imlToSeq[stop.id];
							}
						})
					);
				}
				for (const trip of cluster.trips) {
					stopSequences.push(trip.stops.map((id) => gtfsToSeq[id]));
				}

				// We take the alignment and reverse it back to stops
				const idAlignment = progressiveSequenceAlignment(stopSequences);
				const stopAlignment = [];

				let alignmentIdx = 0;
				for (const subroute of cluster.subroutes) {
					const alignmentRow = idAlignment[alignmentIdx];
					let stopIdx = 0;

					stopAlignment.push(
						alignmentRow.map((id) => {
							if (id && id !== '-') {
								const stop = subroute.stops[stopIdx];
								stopIdx++;

								return {
									type: 'iml',
									imlStop: stop,
									gtfsId: stop.gtfsId,
									gtfsStop: stop.gtfsStop
								};
							} else {
								return null;
							}
						})
					);
					alignmentIdx++;
				}
				for (const trip of cluster.trips) {
					const alignmentRow = idAlignment[alignmentIdx];
					let stopIdx = 0;

					stopAlignment.push(
						alignmentRow.map((id) => {
							if (id && id !== '-') {
								const gtfsId = trip.stops[stopIdx];
								stopIdx++;
								return {
									type: 'gtfs',
									gtfsId: gtfsId,
									gtfsStop: gtfsStops[gtfsId]
								};
							} else {
								return null;
							}
						})
					);
					alignmentIdx++;
				}

				// We do transpose the matrix in stopAlignment for it to be shown as a table
				const transposedAlignment = Array.from({ length: stopAlignment[0].length }, (_, i) =>
					stopAlignment.map((row) => row[i])
				);

				const collapsedTransposedAlignment = [];
				for (const row of transposedAlignment) {
					let previousElem = null;
					const collapsedRow = [];

					for (const elem of row) {
						if (!previousElem) {
							if (elem) {
								elem.colSpan = 1;
							}
							collapsedRow.push(elem);
							previousElem = elem;
							continue;
						}

						if (!elem) {
							collapsedRow.push(elem);
							previousElem = elem;
							continue;
						}

						if (previousElem.gtfsId === elem.gtfsId) {
							if (previousElem.type !== elem.type) {
								previousElem.type = 'both';
								previousElem.gtfsStop = previousElem.gtfsStop || elem.gtfsStop;
								previousElem.imlStop = previousElem.imlStop || elem.imlStop;
							}
							previousElem.colSpan++;
						} else {
							elem.colSpan = 1;
							collapsedRow.push(elem);
							previousElem = elem;
						}
					}
					collapsedTransposedAlignment.push(collapsedRow);
				}

				cluster.formatted = collapsedTransposedAlignment;
			}

			set({
				clusters: directionClusters,
				unmatched: unmatchedSubroutes
			});
		}
	);

	const unmatchedSubroutes = derived(crossRoute, ($crossRoute) => $crossRoute?.unmatched || []);
	const directionClusters = derived(crossRoute, ($crossRoute) => $crossRoute?.clusters || []);

	const selectedDirection = derived(
		[directionClusters, directionTab],
		([$directionClusters, $directionTab]) => {
			if (!$directionClusters || $directionTab > $directionClusters.length) {
				return null;
			}
			return $directionClusters[$directionTab];
		}
	);

	selectedDirection.subscribe(($selectedDirection) => {
		if (!$selectedDirection) {
			return [];
		}

		const paths = [];

		let subroutePaths = $selectedDirection.subroutes.map((s) => s.stops.map((s) => [s.lon, s.lat]));
		let tripPaths = $selectedDirection.trips.map((s) =>
			s.stops.map((s) => [gtfsStops[s].lon, gtfsStops[s].lat])
		);

		Promise.all([
			Promise.all(
				subroutePaths.map((path) => {
					const pointString = path.map((pair) => pair.join(',')).join(';');
					return fetch(
						`${osrmServer}/route/v1/driving/${pointString}?overview=full&alternatives=false&steps=false&geometries=polyline6`
					)
						.then((res) => res.json())
						.then((res) => {
							return polyline.decode(res.routes[0].geometry, 6);
						});
				})
			),
			Promise.all(
				tripPaths.map((path) => {
					const pointString = path.map((pair) => pair.join(',')).join(';');
					return fetch(
						`${osrmServer}/route/v1/driving/${pointString}?overview=full&alternatives=false&steps=false&geometries=polyline6`
					)
						.then((res) => res.json())
						.then((res) => {
							return polyline.decode(res.routes[0].geometry, 6);
						});
				})
			)
		]).then(([subrouteRoutedPaths, tripRoutedPaths]) => {
			const subroutePaths = subrouteRoutedPaths.map((points) => points.map((p) => p.reverse()));
			const tripPaths = tripRoutedPaths.map((points) => points.map((p) => p.reverse()));

			map.getSource('subroutes').setData({
				type: 'FeatureCollection',
				features: [
					{
						type: 'Feature',
						properties: {},
						geometry: {
							type: 'MultiLineString',
							coordinates: subroutePaths
						}
					}
				]
			});

			map.getSource('trips').setData({
				type: 'FeatureCollection',
				features: [
					{
						type: 'Feature',
						properties: {},
						geometry: {
							type: 'MultiLineString',
							coordinates: tripPaths
						}
					}
				]
			});
		});

		flyToSubroutePaths(subroutePaths);

		return paths;
	});

	let map;

	function flyToSubroutePaths(subroutePaths) {
		const bounds = new LngLatBounds();
		subroutePaths.forEach((path) => path.forEach((point) => bounds.extend(point)));

		if (bounds.isEmpty()) {
			return;
		}

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

	function flyToImlStop(stop) {
		map.flyTo({
			center: [stop.lon, stop.lat],
			zoom: 17.5
		});
	}

	function handleGTFSSelect(event) {
		const gtfsRouteId = event.detail.value;
		$selectedGtfsRoute = gtfsRoutes.find((r) => r.id === gtfsRouteId);
	}

	function handleSelect(event) {
		const routeId = event.detail.value;
		$selectedRoute = routes.find((r) => r.id === routeId);
	}

	function addSourcesAndLayers() {
		map.addSource('subroutes', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});
		map.addLayer({
			id: 'subroutes',
			type: 'line',
			source: 'subroutes',
			paint: {
				'line-color': '#3296DC',
				'line-width': 5
			}
		});
		map.addSource('trips', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});
		map.addLayer({
			id: 'trips',
			type: 'line',
			source: 'trips',
			paint: {
				'line-color': '#DC9632',
				'line-width': 2.5
			}
		});

		map.addSource('imlstops', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});
		map.addLayer({
			id: 'imlstops',
			type: 'circle',
			source: 'imlstops',
			paint: {
				'circle-color': '#3296DC',
				'circle-radius': {
					base: 1.75,
					stops: [
						[0, 1.5],
						[11, 2],
						[18, 5]
					]
				},
				'circle-radius': 2,
				'circle-stroke-width': 1,
				'circle-stroke-color': '#fff'
			}
		});

		map.addSource('gtfsstops', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});
		map.addLayer({
			id: 'gtfsstops',
			type: 'circle',
			source: 'gtfsstops',
			paint: {
				'circle-color': '#DC9632',
				'circle-radius': {
					base: 1.75,
					stops: [
						[0, 1.5],
						[11, 2],
						[18, 5]
					]
				},
				'circle-radius': 2,
				'circle-stroke-width': 1,
				'circle-stroke-color': '#fff'
			}
		});
	}

	function addEvents() {}

	onMount(() => {
		map = new Maplibre({
			container: 'map',
			style: tileStyle,
			center: [-9.0, 38.605],
			zoom: 11,
			minZoom: 8,
			maxZoom: 20,
			maxBounds: [
				[-10.0, 38.3],
				[-8.0, 39.35]
			]
		});

		map.addControl(new NavigationControl(), 'top-right');
		map.on('load', () => {
			addSourcesAndLayers();
			addEvents();

			// Add stops to the map
			map.getSource('imlstops').setData({
				type: 'FeatureCollection',
				features: Object.values(stops).map((stop) => ({
					type: 'Feature',
					properties: {},
					geometry: {
						type: 'Point',
						coordinates: [stop.lon, stop.lat]
					}
				}))
			});

			map.getSource('gtfsstops').setData({
				type: 'FeatureCollection',
				features: Object.values(gtfsStops).map((stop) => ({
					type: 'Feature',
					properties: {},
					geometry: {
						type: 'Point',
						coordinates: [stop.lon, stop.lat]
					}
				}))
			});
		});
	});

	onDestroy(() => {
		map.remove();
	});
</script>

<div class="grid grid-cols-1 h-full relative" style="grid-template-rows: 1fr 600px">
	<div id="map" />
	<div class="overflow-auto">
		<div class="grid grid-cols-2 col-span-2">
			<h2>GTFS</h2>
			<h2>Intermodal</h2>
			<Select
				items={gtfsRouteOptions}
				on:select={handleGTFSSelect}
				isClearable={false}
				placeholder="Rota"
			/>
			<Select
				items={routeOptions}
				on:select={handleSelect}
				isClearable={false}
				placeholder="Rota"
			/>
		</div>
		<div>
			{#if $crossRoute}
				<div class="btn-group">
					{#each Array.from(Array($directionClusters.length + $unmatchedSubroutes.length).keys()) as i}
						<button
							class="btn btn-sm"
							class:btn-active={$directionTab === i}
							on:click={() => {
								$directionTab = i;
							}}>Dir {i}</button
						>
					{/each}
				</div>
			{/if}
		</div>
		{#if $crossRoute?.clusters[$directionTab]}
			<table class="table table-compact min-w-full">
				<thead class="pb-2">
					<tr>
						{#each $crossRoute.clusters[$directionTab].subroutes as subroute}
							<td class="bg-blue-200 rounded-lg">
								{subroute.id}
								{subroute.flag}
							</td>
						{/each}
						{#each $crossRoute.clusters[$directionTab].trips as trip}
							<td class="bg-orange-200 rounded-lg">
								{trip.id}
								{trip.headsign}
							</td>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each $crossRoute.clusters[$directionTab].formatted as row}
						<tr>
							{#each row as entry}
								{#if entry === null}
									<td>-</td>
								{:else if entry.type === 'both'}
									<td colspan={entry.colSpan} class="bg-success">
										<div class="w-full flex gap-1">
											<div class="flex flex-col grow">
												<span class="font-semibold">
													<span class="px-2 mr-1 bg-blue-600 rounded-full" />
													{entry.imlStop.name}
												</span>
												<span>
													<span class="px-2 mr-1 bg-orange-600 rounded-full" />{entry.gtfsStop
														.stop_name}
												</span>
											</div>
											<button
												class="btn btn-xs bg-orange-200 hover:bg-orange-200 text-orange-950"
												on:click={() => {
													flyToGtfsStop(entry.gtfsStop);
												}}>{entry.gtfsStop.id}</button
											>
											<button
												class="btn btn-xs bg-blue-200 hover:bg-blue-200 text-blue-950"
												on:click={() => {
													flyToImlStop(entry.imlStop);
												}}>{entry.imlStop.id}</button
											>
										</div>
									</td>
								{:else if entry.type === 'iml'}
									<td
										colspan={entry.colSpan}
										class="rounded-lg"
										class:bg-warning={entry.colSpan > 1}
									>
										<div class="flex flex-col w-full">
											<div class="flex gap-1">
												<button
													class="btn btn-xs bg-blue-200 hover:bg-orange-200 text-blue-950"
													on:click={() => {
														flyToImlStop(entry.imlStop);
													}}>{entry.imlStop.id}</button
												>
												<span class="font-semibold">
													{entry.imlStop.name}
												</span>
											</div>
											{#if entry.gtfsStop}
												<div class="flex gap-1 rounded-lg">
													<button
														class="btn btn-xs bg-orange-200 hover:bg-orange-200 text-orange-950"
														on:click={() => {
															flyToGtfsStop(entry.gtfsStop);
														}}>{entry.gtfsStop.id}</button
													>
													<span class="font-semibold">
														{entry.gtfsStop.stop_name}
													</span>
												</div>
											{/if}
										</div>
									</td>
								{:else if entry.type === 'gtfs'}
									<td colspan={entry.colSpan}>
										<div class="w-full flex gap-1 rounded-lg">
											<button
												class="btn btn-xs bg-orange-200 hover:bg-orange-200 text-orange-950"
												on:click={() => {
													flyToGtfsStop(entry.gtfsStop);
												}}>{entry.gtfsStop.id}</button
											>
											<span class="font-semibold">
												{entry.gtfsStop.stop_name}
											</span>
										</div>
									</td>
								{/if}
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>
