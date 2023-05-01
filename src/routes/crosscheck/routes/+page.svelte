<script>
	import { onDestroy, onMount } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import { Map as Maplibre, NavigationControl, LngLatBounds } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import Select from 'svelte-select';
	import { progressiveSequenceAlignment, longestCommonSubsequence } from '$lib/utils.js';
	import { apiServer } from '$lib/settings.js';

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
								subroute.gtfsIds = subroute.stops.map((s) => parseInt(s.tml_id));
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
							if (stop.tml_id) {
								return gtfsToSeq[parseInt(stop.tml_id)];
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
									gtfsId: parseInt(stop.tml_id) || null,
									imlStop: stop
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

	let map;

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

	function handleGTFSSelect(event) {
		const gtfsRouteId = event.detail.value;
		$selectedGtfsRoute = gtfsRoutes.find((r) => r.id === gtfsRouteId);
	}

	function handleSelect(event) {
		const routeId = event.detail.value;
		$selectedRoute = routes.find((r) => r.id === routeId);
	}

	function addSourcesAndLayers() {}

	function addEvents() {}

	// onMount(() => {
	// 	map = new Maplibre({
	// 		container: 'map',
	// 		style: 'https://tiles2.intermodal.pt/styles/iml/style.json',
	// 		center: [-9.0, 38.605],
	// 		zoom: 11,
	// 		minZoom: 8,
	// 		maxZoom: 20,
	// 		maxBounds: [
	// 			[-10.0, 38.3],
	// 			[-8.0, 39.35]
	// 		]
	// 	});

	// 	map.addControl(new NavigationControl(), 'top-right');
	// });

	// onDestroy(() => {
	// 	map.remove();
	// });
</script>

<div class="flex flex-col">
	<div class="grid grid-cols-2">
		<h2>GTFS</h2>
		<h2>Intermodal</h2>
		<Select
			items={gtfsRouteOptions}
			on:select={handleGTFSSelect}
			isClearable={false}
			placeholder="Rota"
		/>
		<Select items={routeOptions} on:select={handleSelect} isClearable={false} placeholder="Rota" />
	</div>

	{#if $crossRoute}
		<div class="overflow-x-auto">
			{#each $crossRoute.clusters as cluster}
				<table class="table table-compact">
					<thead class="pb-2">
						<tr>
							{#each cluster.subroutes as subroute}
								<td class="bg-blue-200 rounded-lg">
									{subroute.id}
									{subroute.flag}
								</td>
							{/each}
							{#each cluster.trips as trip}
								<td class="bg-orange-200 rounded-lg">
									{trip.id}
									{trip.headsign}
								</td>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each cluster.formatted as row}
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
														{entry.imlStop.official_name ||
															entry.imlStop.name ||
															entry.imlStop.osm_name}
													</span>
													<span>
														<span class="px-2 mr-1 bg-orange-600 rounded-full" />{entry.gtfsStop
															.stop_name}
													</span>
												</div>
												<button class="btn btn-xs bg-orange-200 hover:bg-orange-200 text-orange-950"
													>{entry.gtfsStop.id}</button
												>
												<button class="btn btn-xs bg-blue-200 hover:bg-blue-200 text-blue-950"
													>{entry.imlStop.id}</button
												>
											</div>
										</td>
									{:else if entry.type === 'iml'}
										<td
											colspan={entry.colSpan}
											class="rounded-lg"
											class:bg-warning={entry.colSpan > 1}
										>
											<div class="w-full flex gap-1">
												<button class="btn btn-xs bg-blue-200 hover:bg-orange-200 text-blue-950"
													>{entry.imlStop.id}</button
												>
												<span class="font-semibold">
													{entry.imlStop.official_name ||
														entry.imlStop.name ||
														entry.imlStop.osm_name}
												</span>
											</div>
										</td>
									{:else if entry.type === 'gtfs'}
										<td colspan={entry.colSpan}>
											<div class="w-full flex gap-1 rounded-lg">
												<button class="btn btn-xs bg-orange-200 hover:bg-orange-200 text-orange-950"
													>{entry.gtfsStop.id}</button
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
			{/each}
		</div>
	{/if}
	<!-- <div id="map" class="h-[800px]" /> -->
</div>
