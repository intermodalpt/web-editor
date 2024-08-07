const logFactor = 50.0;

function scoreAttr(truthVal, potentialScore) {
	if (truthVal === undefined || truthVal === null) {
		return 0.0;
	} else {
		return potentialScore;
	}
}

export function logStopScore(stop) {
	return Math.log2(logFactor * linearStopScore(stop) + 1) / Math.log2(logFactor + 1);
}

export function logWeightedStopScore(stop) {
	return Math.log2(logFactor * linearStopScore(stop) + 1) / Math.log2(logFactor + 1);
}

export function linearStopScore(stop) {
	// Number of attrs
	const maximum = 26;
	let score = 0.0;

	const a11y = stop.a11y;

	score += scoreAttr(stop.locality, 1);
	score += scoreAttr(a11y.flags, 1);
	score += scoreAttr(a11y.schedules, 1);
	score += scoreAttr(a11y.has_sidewalk, 1);
	score += scoreAttr(a11y.has_sidewalked_path, 1);
	score += scoreAttr(a11y.has_shelter, 1);
	score += scoreAttr(a11y.has_cover, 1);
	score += scoreAttr(a11y.has_bench, 1);
	score += scoreAttr(a11y.has_trash_can, 1);
	score += scoreAttr(a11y.has_ticket_seller, 1);
	score += scoreAttr(a11y.has_costumer_support, 1);
	score += scoreAttr(a11y.advertisement_qty, 1);
	score += scoreAttr(a11y.has_crossing, 1);
	score += scoreAttr(a11y.has_flat_access, 1);
	score += scoreAttr(a11y.has_wide_access, 1);
	score += scoreAttr(a11y.has_tactile_access, 1);
	score += scoreAttr(a11y.illumination_strength, 1);
	score += scoreAttr(a11y.illumination_position, 1);
	score += scoreAttr(a11y.has_illuminated_path, 1);
	score += scoreAttr(a11y.has_visibility_from_area, 1);
	score += scoreAttr(a11y.has_visibility_from_within, 1);
	score += scoreAttr(a11y.is_visible_from_outside, 1);
	score += scoreAttr(a11y.parking_visibility_impairment, 1);
	score += scoreAttr(a11y.parking_local_access_impairment, 1);
	score += scoreAttr(a11y.parking_area_access_impairment, 1);
	score += scoreAttr(stop.verification_level, 1);

	// Truncate number to 1 decimal place
	return score / maximum || 0.0;
}

export function weightedStopScore(stop) {
	let score = 0.0;
	let maximum = 0.0;

	const a11y = stop.a11y;

	score += scoreAttr(stop.locality, 0.1);
	maximum += 0.1;
	score += scoreAttr(a11y.flags, 2.0);
	maximum += 2.0;
	score += scoreAttr(a11y.schedules, 2.0);
	maximum += 2.0;
	score += scoreAttr(a11y.has_sidewalk, 1.5);
	maximum += 1.5;
	score += scoreAttr(a11y.has_sidewalked_path, 1.0);
	maximum += 1.0;
	score += scoreAttr(a11y.has_shelter, 3.0);
	maximum += 3.0;
	score += scoreAttr(a11y.has_cover, 2.0);
	maximum += 2.0;
	score += scoreAttr(a11y.has_bench, 1.0);
	maximum += 1.0;
	score += scoreAttr(a11y.has_trash_can, 1.0);
	maximum += 1.0;
	score += scoreAttr(a11y.has_ticket_seller, 0.2);
	maximum += 0.2;
	score += scoreAttr(a11y.has_costumer_support, 0.2);
	maximum += 0.2;
	score += scoreAttr(a11y.advertisement_qty, 0.2);
	maximum += 0.2;
	score += scoreAttr(a11y.has_crossing, 3.0);
	maximum += 3.0;
	score += scoreAttr(a11y.has_flat_access, 0.2);
	maximum += 0.2;
	score += scoreAttr(a11y.has_wide_access, 0.2);
	maximum += 0.2;
	score += scoreAttr(a11y.has_tactile_access, 0.2);
	maximum += 0.2;
	score += scoreAttr(a11y.illumination_strength, 1.0);
	maximum += 1.0;
	score += scoreAttr(a11y.illumination_position, 1.0);
	maximum += 1.0;
	score += scoreAttr(a11y.has_illuminated_path, 1.0);
	maximum += 1.0;
	score += scoreAttr(a11y.has_visibility_from_area, 2.0);
	maximum += 2.0;
	score += scoreAttr(a11y.has_visibility_from_within, 0.5);
	maximum += 0.5;
	score += scoreAttr(a11y.is_visible_from_outside, 2.0);
	maximum += 2.0;
	score += scoreAttr(a11y.parking_visibility_impairment, 1.0);
	maximum += 1.0;
	score += scoreAttr(a11y.parking_local_access_impairment, 0.5);
	maximum += 0.5;
	score += scoreAttr(a11y.parking_area_access_impairment, 0.5);
	maximum += 0.5;
	score += scoreAttr(stop.verification_level, 2.0);
	maximum += 2.0;

	// Truncate number to 1 decimal place
	return score / maximum || 0.0;
}
