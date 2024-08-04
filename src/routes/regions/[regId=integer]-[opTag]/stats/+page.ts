import { error } from '@sveltejs/kit';
import { getRegion, getRegionParishes, getRegionStops, getStopPicsRels } from '$lib/api';
import { credibleSources } from '$lib/settings';

export async function load({ params, fetch }) {
	const regionId = parseInt(params.regId);

	const [region, parishes, stops, picsByStop] = await Promise.all([
		getRegion(regionId, {
			onError: (res) => {
				error(res.status, 'Falha a carregar a região');
			},
			toJson: true,
			fetch
		}),
		getRegionParishes(regionId, {
			onError: (res) => {
				error(res.status, 'Falha a carregar as freguesias');
			},
			toJson: true,
			fetch
		}),
		getRegionStops(regionId, {
			onError: (res) => {
				error(res.status, 'Falha a carregar as paragens');
			},
			toJson: true,
			fetch
		}),
		getStopPicsRels({
			onError: (res) => {
				error(res.status, 'Falha a carregar as imagens das paragens');
			},
			toJson: true,
			fetch
		})
	]);
	
	const rankedParishes = rankParishes(stops, picsByStop);
	const annotatedParishes = calcAnnotatedParishes(parishes, rankedParishes);

	return {
		region,
		parishes,
		rankedParishes,
		annotatedParishes,
		stops,
		picsByStop
	};
}

function rankParishes(stops, picsByStop) {
	let haveParish = 0;

	let stopsByParish = new Map();

	for (const stop of stops) {
		let currParish = stopsByParish.get(stop.parish);
		if (currParish) {
			currParish.push(stop);
		} else {
			stopsByParish.set(stop.parish, [stop]);
		}
	}

	let dataPerParish = {};
	for (const [parishId, stops] of stopsByParish.entries()) {
		// let currParish = $parishes[parishId];

		haveParish++;

		let totalStops = stops.length;
		let idCount = 0;
		let serviceCount = 0;
		let locationCount = 0;
		let pictureCount = 0;

		stops.forEach((stop) => {
			if (
				stop.operators.length > 0 &&
				stop.operators.every((rel) => credibleSources.includes(rel.source))
			) {
				idCount++;
			}
			if (picsByStop[stop.id]) {
				pictureCount++;
			}
			if (stop.schedules != null || stop.flags != null) {
				serviceCount++;
			}
			if ((stop.verification_level & 0b11000000) === 0b11000000) {
				locationCount++;
			}
		});

		dataPerParish[parishId] = {
			idCount: idCount,
			serviceCount: serviceCount,
			locationCount: locationCount,
			pictureCount: pictureCount,
			totalCount: totalStops
		};
	}

	return dataPerParish;
}

function calcAnnotatedParishes(parishes, rankedParishes) {
	let annotatedParishes = [];

	for (const parish of parishes) {
		let rankedParish = rankedParishes[parish.id];
		annotatedParishes.push({
			...parish,
			...rankedParish
		});
	}

	return annotatedParishes;
}
