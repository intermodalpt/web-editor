<script>
	import { derived } from 'svelte/store';
	import { isDeepEqual, isEmpty, needlemanWunsch } from '$lib/utils.js';
	import { subrouteTitle } from '../aux.js';

	export let route;
	export let routeStops;

	const validationInfo = derived([route, routeStops], ([$route, $routeStops]) => {
		if (!route || !$routeStops) return;

		const pairedSubroutes = [];
		const unpairedSubroutes = [];
		const unpairedGtfs = $route.validation?.unmatched.map((gtfs) => {
			return {
				stops: gtfs.stops ?? [],
				headsigns: gtfs.headsigns ?? [],
				patterns: gtfs.pattern_ids ?? []
			};
		});

		for (const subroute of $route.subroutes) {
			const currentImlStops = $routeStops[subroute.id] || [];

			if (subroute.validation && !isEmpty(subroute.validation)) {
				let [imlSeq, gtfsSeq] = needlemanWunsch(currentImlStops, subroute.validation.iml_stops);

				pairedSubroutes.push({
					subroute: subroute,
					imlStops: currentImlStops,
					gtfsImlStops: subroute.validation.iml_stops,
					gtfsHeadsigns: subroute.validation.gtfs_headsigns,
					gtfsPatterns: subroute.validation.gtfs_pattern_ids,
					// Sequence aligned to match
					alignedIml: imlSeq,
					alignedGtfs: gtfsSeq,
					sameImlStops: isDeepEqual(subroute.validation.iml_stops, currentImlStops)
				});
			} else {
				unpairedSubroutes.push({
					subroute: subroute,
					imlStops: currentImlStops
				});
			}
		}

		return {
			paired: pairedSubroutes,
			unpairedSubroutes: unpairedSubroutes,
			unpairedGtfs: unpairedGtfs
		};
	});
</script>

{#if $validationInfo}
	{#each $validationInfo.paired as pairing}
		<div class="flex flex-col rounded-md border-[1px] p-1 bg-green-50">
			<div class="flex flex-row w-full gap-2 items-center">
				<div
					class="h-6 w-12 rounded-xl flex items-center justify-center font-bold bg-blue-500 text-white"
				>
					{pairing.subroute.id}
				</div>
				<span>
					{subrouteTitle(pairing.subroute)}
				</span>
				<div class="h-6 w-6 rounded-xl flex items-center justify-center font-bold bg-base-300">
					»
				</div>
				<div class="flex flex-wrap gap-1">
					{#each pairing.gtfsPatterns as pattern}
						<div class="badge bg-orange-300">pat: {pattern}</div>
					{/each}
					{#each pairing.gtfsHeadsigns as headsign}
						<div class="badge bg-orange-400">{headsign}</div>
					{/each}
				</div>
			</div>
			<table>
				<tbody>
					<tr>
						{#each pairing.alignedIml as stopId, i}
							<td
								class="badge badge-sm border-2 border-blue-500 text-white font-bold"
								class:badge-success={pairing.alignedGtfs[i] == stopId}
								class:badge-warning={pairing.alignedGtfs[i] == null}
								class:badge-error={pairing.alignedGtfs[i] != stopId &&
									pairing.alignedGtfs[i] != null}>{stopId}</td
							>
						{/each}
					</tr>
					<tr>
						{#each pairing.alignedGtfs as stopId, i}
							<td
								class="badge badge-sm border-2 border-orange-500 text-white font-bold"
								class:badge-success={pairing.alignedIml[i] == stopId}
								class:badge-warning={pairing.alignedIml[i] == null}
								class:badge-error={pairing.alignedIml[i] != stopId && pairing.alignedIml[i] != null}
								>{stopId}</td
							>
						{/each}
					</tr>
				</tbody>
			</table>
		</div>
	{/each}
	{#each $validationInfo.unpairedSubroutes as unpaired}
		<div class="flex flex-col rounded-md border-[1px] p-1 bg-blue-50">
			<div class="flex flex-row w-full gap-2 items-center">
				<div
					class="h-6 w-12 rounded-xl flex items-center justify-center font-bold bg-blue-500 text-white"
				>
					{unpaired.subroute.id}
				</div>
				<span>
					{subrouteTitle(unpaired.subroute)}
				</span>
			</div>
			<table>
				<tbody>
					<tr>
						{#each unpaired.imlStops as stopId}
							<td class="badge badge-sm border-y-2 bg-blue-200 font-bold">
								{stopId}
							</td>
						{/each}
					</tr>
				</tbody>
			</table>
		</div>
	{/each}
	{#each $validationInfo.unpairedGtfs as gtfs}
		<div class="flex flex-col rounded-md border-[1px] p-1 bg-orange-50">
			<div class="flex flex-row w-full gap-2 items-center">
				<div class="flex flex-wrap gap-1">
					{#each gtfs.patterns as pattern}
						<div class="badge bg-orange-300">pat:{pattern}</div>
					{/each}
					{#each gtfs.headsigns as headsign}
						<div class="badge bg-orange-400">hs:{headsign}</div>
					{/each}
				</div>
			</div>
			<table>
				<tbody>
					<tr>
						{#each gtfs.stops as stopId}
							<td class="badge badge-sm border-y-2 bg-orange-200 font-bold">
								{stopId}
							</td>
						{/each}
					</tr>
				</tbody>
			</table>
		</div>
	{/each}
{/if}
