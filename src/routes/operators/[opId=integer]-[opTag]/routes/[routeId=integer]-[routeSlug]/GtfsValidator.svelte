<script>
	import { derived } from 'svelte/store';
	import { isDeepEqual, isEmpty, needlemanWunsch } from '$lib/utils.js';
	import Matched from './gtfscmp/Matched.svelte';
	import UnmatchedIml from './gtfscmp/UnmatchedIml.svelte';
	import UnmatchedGtfs from './gtfscmp/UnmatchedGtfs.svelte';

	export let route;
	export let stops;
	export let routeStops;
	export let operatorId;
	export let canEdit = false;

	let showName = false;
	let idType = 1;

	const stopsByRef = derived(stops, ($stops) => {
		if (!$stops) return;
		return Object.fromEntries(
			Object.values($stops).map((stop) => {
				const opStop = stop.operators.find((op) => op.operator_id == operatorId);
				return [opStop?.stop_ref, stop];
			})
		);
	});

	const validationInfo = derived(
		[route, stopsByRef, routeStops],
		([$route, $stopsByRef, $routeStops]) => {
			if (!$route || !$routeStops || !$stopsByRef) return;

			const pairedSubroutes = [];
			const unpairedSubroutes = [];
			const unpairedGtfs = $route.validation?.unmatched.map((gtfs) => {
				return {
					stops: gtfs.stops ?? [],
					headsigns: gtfs.headsigns ?? [],
					patterns: gtfs.patterns ?? []
				};
			});

			for (const subroute of $route.subroutes) {
				const currentImlStops = $routeStops[subroute.id] || [];
				const currentGtfsStops = currentImlStops.map(
					(stopId) =>
						$stops[stopId]?.operators?.find((op) => op.operator_id == operatorId)?.stop_ref || '?'
				);

				if (subroute.validation && !isEmpty(subroute.validation)) {
					let [imlSeq, gtfsSeq] = needlemanWunsch(currentImlStops, subroute.validation.iml_stops);

					pairedSubroutes.push({
						subroute: subroute,
						imlStops: currentImlStops,
						gtfsStops: currentGtfsStops,
						gtfsImlStops: subroute.validation.iml_stops,
						gtfsHeadsigns: subroute.validation.gtfs_headsigns,
						gtfsPatterns: subroute.validation.gtfs_pattern_ids,
						// Sequence aligned to match
						alignedIml: imlSeq,
						alignedGtfs: gtfsSeq,
						matches: isDeepEqual(subroute.validation.iml_stops, currentImlStops)
					});
				} else {
					unpairedSubroutes.push({
						subroute: subroute,
						imlStops: currentImlStops,
						gtfsStops: currentGtfsStops
					});
				}
			}

			return {
				paired: pairedSubroutes,
				unpairedSubroutes: unpairedSubroutes,
				unpairedGtfs: unpairedGtfs || []
			};
		}
	);
</script>

<div class="flex gap-2 items-center">
	<div class="form-control">
		<label class="input-group">
			<span>Nomes</span>
			<input type="checkbox" bind:checked={showName} class="checkbox" />
		</label>
	</div>

	<div class="form-control">
		<label class="label cursor-pointer">
			<span class="label-text">IML</span>
			<input type="radio" name="id-type" value={1} class="radio" bind:group={idType} />
		</label>
	</div>
	<div class="form-control">
		<label class="label cursor-pointer">
			<span class="label-text">GTFS</span>
			<input type="radio" name="id-type" value={2} class="radio" bind:group={idType} />
		</label>
	</div>
</div>
{#if $validationInfo}
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-2">
		<div class="flex flex-col gap-2">
			<h2 class="text-lg">Emparelhadas com GTFS</h2>
			{#each $validationInfo.paired as pairing}
				<Matched {pairing} {stops} {showName} {idType} />
			{/each}
		</div>
		<div class="flex flex-col gap-2">
			<h2 class="text-lg">Intermodal sem correspondente</h2>
			{#each $validationInfo.unpairedSubroutes as unpaired}
				<UnmatchedIml
					{unpaired}
					unpairedGtfs={$validationInfo.unpairedGtfs}
					{stops}
					{showName}
					{idType}
					{canEdit}
				/>
			{/each}
			<h2 class="text-lg">GTFS sem correspondente</h2>
			{#each $validationInfo.unpairedGtfs as unpaired}
				<UnmatchedGtfs {unpaired} {stops} {stopsByRef} {showName} {idType} />
			{/each}
		</div>
	</div>
{/if}
