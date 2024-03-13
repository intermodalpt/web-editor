import { isDeepEqual } from '$lib/utils.js';

export function getDeparturesAndCalendars(departures, dense = true) {
	let scheduleMats = dense
		? Object.fromEntries(
				departures.map((departure) => [
					departure.calendar_id,
					Object.fromEntries(Array.from(Array(24), (_, i) => i).map((i) => [i + 4, []]))
				])
		  )
		: Object.fromEntries(departures.map((departure) => [departure.calendar_id, {}]));

	for (let e of departures) {
		let scheduleMat = scheduleMats[e.calendar_id];

		let hour = Math.floor(e.time / 60);
		let minute = String(Math.floor(e.time % 60)).padStart(2, '0');
		if (!scheduleMat[hour]) scheduleMat[hour] = [];

		scheduleMat[hour].push({ id: e.id, minute: minute });
	}
	/*let departures = {};

    for (const scheduleMat of Object.values(scheduleMats)) {
        for (const hour of Object.keys(scheduleMat).sort()) {
            departures[hour] = scheduleMat[hour];
        }
    }*/
	return scheduleMats;
}

export function annotateSubroute(sr) {
	// Annotate subroutes
	let aSr = {
		...structuredClone(sr),
		_original: sr,
		_modified: false,
		_deleted: false
	};
	aSr._updateModified = () => {
		aSr._modified =
			aSr._original.group != aSr.group ||
			aSr._original.headsign != aSr.headsign ||
			aSr._original.origin != aSr.origin ||
			aSr._original.destination != aSr.destination ||
			!isDeepEqual(aSr._original.via, aSr.via) ||
			aSr._original.circular != aSr.circular;
	};
	return aSr;
}

export function subrouteTitle(sr) {
	let hasOrigin = sr.origin != null && sr.origin != '';
	let hasDestination = sr.destination != null && sr.destination != '';
	let hasHeadsign = sr.headsign != null && sr.headsign != '';
	let hasFlag = sr.flag != null && sr.flag != '';
	let hasVia = sr.via != null && sr.via.length > 0;

	if (hasOrigin && hasDestination) {
		let viaStr = `via ${sr.via.map((place) => place.name).join(', ')}`;
		return hasVia
			? `${sr.origin} - ${sr.destination} ${viaStr}`
			: `${sr.origin} - ${sr.destination}`;
	} else if (hasFlag) {
		return sr.flag;
	} else if (hasHeadsign) {
		return `-> ${sr.headsign}`;
	} else {
		return '?';
	}
}
