<script>
	import { derived } from 'svelte/store';
	import { isDeepEqual, isEmpty, needlemanWunsch } from '$lib/utils.js';
	import { toast } from '$lib/stores.js';
	import { apiServer } from '$lib/settings.js';
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
			const unpairedGtfs = $route.validation?.unmatched.map((subroute) => {
				return {
					stops: subroute.gtfs_cluster.stops ?? [],
					headsigns: subroute.gtfs_cluster.headsigns ?? [],
					patterns: subroute.gtfs_cluster.patterns ?? []
				};
			});

			for (const subroute of $route.subroutes) {
				const currentImlStops = $routeStops[subroute.id] || [];
				const currentGtfsStops = currentImlStops.map(
					(stopId) =>
						$stops[stopId]?.operators?.find((op) => op.operator_id == operatorId)?.stop_ref || '?'
				);

				if (subroute.validation.gtfs) {
					let [imlSeq, gtfsSeq] = needlemanWunsch(
						currentImlStops,
						subroute.validation.correspondence
					);

					const stopsCacheMatches = isDeepEqual(currentImlStops, subroute.validation.current);
					const stopsCacheMatchesGtfs = isDeepEqual(
						currentGtfsStops,
						subroute.validation.gtfs.stops
					);

					const everyCorrespondedStopExists = subroute.validation.correspondence.every(
						(stopId) => $stops[stopId]
					);

					const isCorrespondenceValidated = isDeepEqual(
						subroute.validation.correspondence,
						subroute.validation.correspondence_ack
					);
					const isCurrentValidated = isDeepEqual(
						subroute.validation.current,
						subroute.validation.current_ack
					);
					const isValidated = isCorrespondenceValidated && isCurrentValidated;

					pairedSubroutes.push({
						subroute: subroute,
						imlStops: subroute.validation.current,
						gtfsImlStops: subroute.validation.correspondence,
						gtfsStops: subroute.validation.gtfs.stops,
						gtfsHeadsigns: subroute.validation.gtfs.headsigns,
						gtfsPatterns: subroute.validation.gtfs.patterns,
						// Sequences aligned to match
						alignedIml: imlSeq, // Aligned IML ids
						alignedGtfs: gtfsSeq, // Aligned IML-GTFS ids
						matches: isDeepEqual(subroute.validation.correspondence, currentImlStops),
						isCorrespondenceValidated: isCorrespondenceValidated,
						isCurrentValidated: isCurrentValidated,
						isValidated: isValidated,
						hasCacheDisagreement: !stopsCacheMatches || !stopsCacheMatchesGtfs
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

	async function handleGtfsAck(e) {
		if (!confirm('Confirmar os ids de GTFS?')) return;

		const subroute = e.detail.pairing.subroute;

		const res = await fetch(
			`${apiServer}/v1/subroutes/${subroute.id}/validation/correspondence_ack`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					from_stop_ids: subroute.validation.correspondence_ack,
					to_stop_ids: subroute.validation.correspondence
				})
			}
		);

		if (res.ok) {
			toast(`Ids GTFS confirmados para ${subroute.id}`, 'info');
			subroute.validation.correspondence_ack = subroute.validation.correspondence;
		} else {
			toast(`Erro a confirmar ids`, 'error');
			console.error(res);
		}
	}

	async function handleImlAck(e) {
		if (!confirm('Confirmar os ids IML?')) return;

		const subroute = e.detail.pairing.subroute;

		const res = await fetch(`${apiServer}/v1/subroutes/${subroute.id}/validation/current_ack`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({
				from_stop_ids: subroute.validation.current_ack,
				to_stop_ids: subroute.validation.current
			})
		});

		if (res.ok) {
			toast(`Ids IML confirmados para ${subroute.id}`, 'info');
			subroute.validation.current_ack = subroute.validation.current;
		} else {
			toast(`Erro a confirmar ids`, 'error');
			console.error(res);
		}
	}

	async function handleGtfsReplace(e) {
		if (!confirm('Substituir IML por GTFS?')) return;

		const subroute = e.detail.pairing.subroute;

		const res = await fetch(`${apiServer}/v1/subroutes/${subroute.id}/stops`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({
				from: subroute.validation.current,
				to: subroute.validation.correspondence
			})
		});

		if (res.ok) {
			toast(`Paragens de ${subroute.id} sincronizadas com GTFS`, 'info');
			subroute.validation.current_ack = subroute.validation.current;
		} else {
			toast(`Erro a sincronizar (${subroute.id})`, 'error');
			console.error(res);
		}
	}

	async function handlePair(e) {
		const subroute = e.detail.subroute;
		const pairRef = e.detail.pairRef;

		if (!confirm(`Emparelhar IML ${subroute.id} com GTFS ${pairRef}?`)) return;

		const res = await fetch(`${apiServer}/v1/routes/${$route.id}/assign_unmatched_validation`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({
				subroute_id: subroute.id,
				pattern_id: pairRef,
				sync: true
			})
		});

		if (res.ok) {
			toast(`Subrota ${subroute.id} emparelhada com GTFS ${pairRef}`, 'info');
		} else {
			toast(`Erro a emparelhar`, 'error');
			console.error(res);
		}
	}
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
	<div class="flex flex-col gap-2">
		<h2 class="text-lg">Emparelhadas com GTFS</h2>
		{#each $validationInfo.paired as pairing}
			<Matched
				{pairing}
				{stops}
				{showName}
				{idType}
				{canEdit}
				on:gtfs-ack={handleGtfsAck}
				on:iml-ack={handleImlAck}
				on:gtfs-replace={handleGtfsReplace}
			/>
		{/each}
		<h2 class="text-lg" class:hidden={$validationInfo.unpairedSubroutes.length == 0}>
			Intermodal sem correspondente
		</h2>
		{#each $validationInfo.unpairedSubroutes as unpaired}
			<UnmatchedIml
				{unpaired}
				unpairedGtfs={$validationInfo.unpairedGtfs}
				{stops}
				{showName}
				{idType}
				{canEdit}
				on:pair={handlePair}
			/>
		{/each}
		<h2 class="text-lg" class:hidden={$validationInfo.unpairedGtfs.length == 0}>
			GTFS sem correspondente
		</h2>
		{#each $validationInfo.unpairedGtfs as unpaired}
			<UnmatchedGtfs {unpaired} {stops} {stopsByRef} {showName} {idType} {canEdit} />
		{/each}
	</div>
{/if}
