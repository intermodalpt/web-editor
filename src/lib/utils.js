export function calc_route_multipoly(stops, route_stops) {
	let segments = [];

	let current_segment = [];
	for (let i = 0; i < route_stops.length - 1; i++) {
		let firstStopId = route_stops[i];
		let secondStopId = route_stops[i + 1];
		if (stops[firstStopId].lon && stops[secondStopId].lon) {
			if (current_segment.length === 0) {
				current_segment.push([stops[firstStopId].lat, stops[firstStopId].lon]);
			}
			current_segment.push([stops[secondStopId].lat, stops[secondStopId].lon]);
		} else {
			if (current_segment.length !== 0) {
				segments.push(current_segment);
				current_segment = [];
			}
		}
	}

	if (current_segment.length !== 0) {
		segments.push(current_segment);
	}

	return segments;
}

function randomInteger(max) {
	return Math.floor(Math.random() * (max + 1));
}

function randomRgbColor() {
	let r = randomInteger(255);
	let g = randomInteger(255);
	let b = randomInteger(255);
	return [r, g, b];
}

export function randomHexColor() {
	let [r, g, b] = randomRgbColor();

	let hr = r.toString(16).padStart(2, '0');
	let hg = g.toString(16).padStart(2, '0');
	let hb = b.toString(16).padStart(2, '0');

	return '#' + hr + hg + hb;
}

export function weekdayName(weekday) {
	switch (weekday) {
		case 0:
			return 'Mon';
		case 1:
			return 'Tue';
		case 2:
			return 'Wed';
		case 3:
			return 'Thu';
		case 4:
			return 'Fri';
		case 5:
			return 'Sat';
		case 6:
			return 'Sun';
		default:
			return '???';
	}
}

function conditionName(condition) {
	switch (condition.condition) {
		case 'Holiday':
			return 'holidays';
		case 'Summer':
			return 'summer';
		case 'School':
			return 'school';
		case 'Nth':
			switch (condition.nth) {
				case 1:
					return "(month's) 1st";
				case 2:
					return "(month's) 2nd";
				case 3:
					return "(month's) 3rd";
				case 4:
					return "(month's) 4th";
				case 5:
					return "(month's) 5th";
				default:
					return '???';
			}
		case 'Range':
			return `between ${condition.start} and ${condition.end}`;
		default:
			return '???';
	}
}

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [0, 1, 2, 3, 4];
const WEEKEND = [5, 6];

export function calendarStr(calendar) {
	if (isDeepEqual(calendar, { weekdays: WEEKDAYS, except_if: [{ condition: 'Holiday' }] })) {
		return 'Workdays';
	}
	if (
		isDeepEqual(calendar, {
			weekdays: WEEKDAYS,
			except_if: [{ condition: 'Holiday' }],
			only_if: [{ condition: 'School' }]
		})
	) {
		return 'School workdays';
	}

	let namedWeekdays;
	if (calendar.weekdays === EVERY_DAY) {
		namedWeekdays = 'Everyday';
	} else if (calendar.weekdays === WEEKDAYS) {
		namedWeekdays = 'Business weekdays';
	} else if (calendar.weekdays === WEEKEND) {
		namedWeekdays = 'Weekend';
	} else {
		namedWeekdays = calendar.weekdays.map((day) => weekdayName(day)).join(', ');
	}

	let conditions = [];
	if (calendar.only_if.length > 0) {
		conditions.push(
			'that are ' +
			calendar.only_if
				.map((condition) => {
					return conditionName(condition);
				})
				.join(', ')
		);
	}
	if (calendar.also_if.length > 0) {
		conditions.push(
			'plus ' +
			calendar.also_if
				.map((condition) => {
					return conditionName(condition);
				})
				.join(', ')
		);
	}
	if (calendar.except_if.length > 0) {
		conditions.push(
			'except ' +
			calendar.except_if
				.map((condition) => {
					return conditionName(condition);
				})
				.join(', ')
		);
	}

	return `${namedWeekdays} ${conditions.join(', ')}`;
}

export const timestampToTime = (timestamp) => {
	return `${String(Math.floor(timestamp / 60) % 24).padStart(2, '0')}:${String(
		Math.floor(timestamp % 60)
	).padStart(2, '0')}`;
};

export function timeToTimestamp(time) {
	let hour = parseInt(time.split(':')[0]);
	if (hour < 4) {
		hour += 24;
	}
	let minute = parseInt(time.split(':')[1]);

	return hour * 60 + minute;
}

const isObject = (object) => {
	return object != null && typeof object === 'object';
};

export const isDeepEqual = (object1, object2) => {
	const objKeys1 = Object.keys(object1);
	const objKeys2 = Object.keys(object2);

	if (objKeys1.length !== objKeys2.length) return false;

	for (var key of objKeys1) {
		const value1 = object1[key];
		const value2 = object2[key];

		const isObjects = isObject(value1) && isObject(value2);

		if ((isObjects && !isDeepEqual(value1, value2)) || (!isObjects && value1 !== value2)) {
			return false;
		}
	}
	return true;
};

// Duplicates an object, including subfield
export function deepCopy(object) {
	return JSON.parse(JSON.stringify(object));
}

export function isEmpty(obj) {
	for (const prop in obj) {
		if (Object.hasOwn(obj, prop)) {
			return false;
		}
	}

	return true;
}

export function parseJwt(token) {
	var base64Url = token.split('.')[1];
	var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
	var jsonPayload = decodeURIComponent(
		window
			.atob(base64)
			.split('')
			.map(function (c) {
				return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
			})
			.join('')
	);

	return JSON.parse(jsonPayload);
}

export function listDifferences(original, patch) {
	const changes = [];
	for (const [key, value] of Object.entries(patch)) {
		if (value === null) {
			continue;
		}
		if (original[key] !== value) {
			changes.push({ key, original: original[key], new: value });
		}
	}
	return changes;
}

export function distance(lat1, lon1, lat2, lon2) {
	var p = 0.017453292519943295; // Math.PI / 180
	var c = Math.cos;
	var a =
		0.5 - c((lat2 - lat1) * p) / 2 + (c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))) / 2;

	return 12742 * Math.asin(Math.sqrt(a)) * 1000; // 2 * R; R = 6371 km
}

export function getNearestStops(stopList, lat, lon, n = 30) {
	stopList.sort((a, b) => {
		let distA = distance(lat, lon, a.lat, a.lon);
		let distB = distance(lat, lon, b.lat, b.lon);
		return distA - distB;
	});

	return stopList.slice(0, n);
}

export function needlemanWunsch(seq1, seq2) {
	const n = seq1.length;
	const m = seq2.length;
	const gapPenalty = -1;
	const matchScore = 1;
	const mismatchScore = -1;

	// Initialize the matrix with zeros
	const matrix = Array.from(Array(n + 1), () => new Array(m + 1).fill(0));

	// Initialize the first row and column with gap penalties
	for (let i = 0; i <= n; i++) {
		matrix[i][0] = i * gapPenalty;
	}

	for (let j = 0; j <= m; j++) {
		matrix[0][j] = j * gapPenalty;
	}

	// Fill in the rest of the matrix
	for (let i = 1; i <= n; i++) {
		for (let j = 1; j <= m; j++) {
			const match =
				matrix[i - 1][j - 1] + (seq1[i - 1] === seq2[j - 1] ? matchScore : mismatchScore);
			const deleteScore = matrix[i - 1][j] + gapPenalty;
			const insertScore = matrix[i][j - 1] + gapPenalty;
			matrix[i][j] = Math.max(match, deleteScore, insertScore);
		}
	}

	// Traceback to find the alignment
	let alignedSeq1 = [];
	let alignedSeq2 = [];

	let i = n;
	let j = m;

	while (i > 0 || j > 0) {
		if (
			i > 0 &&
			j > 0 &&
			//
			matrix[i][j] ===
			matrix[i - 1][j - 1] + (seq1[i - 1] === seq2[j - 1] ? matchScore : mismatchScore)
		) {
			// Diagonal, no space added
			alignedSeq1.push(seq1[i - 1]);
			alignedSeq2.push(seq2[j - 1]);
			i--;
			j--;
		} else if (i > 0 && matrix[i][j] === matrix[i - 1][j] + gapPenalty) {
			// Up, space added to seq2
			alignedSeq1.push(seq1[i - 1]);
			alignedSeq2.push('-');
			i--;
		} else {
			// Left, space added to seq1
			alignedSeq1.push('-');
			alignedSeq2.push(seq2[j - 1]);
			j--;
		}
	}

	return [alignedSeq1.reverse(), alignedSeq2.reverse(), matrix];
}

export function progressiveSequenceAlignment(sequences) {
	// I'm pretty darn sure that this function can be improved
	// And I'm pretty darn sure that nobody will ever notice a real
	// difference between this and the improved version, at least for what we're doing

	const gapPenalty = -1;
	const matchScore = 1;
	const mismatchScore = -1;

	let n = sequences.length;
	if (n === 1) {
		return sequences;
	}

	//############################ PICK THE INITIAL PAIR ############################

	// Initialize the matrix with zeros
	let crossAlignmentScores = Array.from(Array(n), () => new Array(n).fill(0));

	// Find how well sequences match amongst themselves
	for (let i = 0; i < n; i++) {
		for (let j = i + 1; j < n; j++) {
			const [alignedSeq1, alignedSeq2] = needlemanWunsch(sequences[i], sequences[j]);
			const score = calculateScore(alignedSeq1, alignedSeq2, gapPenalty, matchScore, mismatchScore);
			// Supperior triangle
			crossAlignmentScores[i][j] = score;
			// Inferior triangle
			crossAlignmentScores[j][i] = score;
		}
	}

	let bestSeenScore = -Infinity;
	let bestMatchRow = 0;
	let bestMatchCol = 0;

	// Pick the best two matches
	for (let i = 0; i < n; i++) {
		for (let j = i + 1; j < n; j++) {
			if (crossAlignmentScores[i][j] > bestSeenScore) {
				bestSeenScore = crossAlignmentScores[i][j];
				bestMatchRow = i;
				bestMatchCol = j;
			}
		}
	}

	const [alignedSeq1, alignedSeq2] = needlemanWunsch(
		sequences[bestMatchRow],
		sequences[bestMatchCol]
	);

	// Attach original indices so we can sort the output back later
	sequences = sequences.map((seq, idx) => [seq, idx]);
	const ordering = [bestMatchRow, bestMatchCol];

	// Remove the aligned sequences (PS: j>i)
	sequences.splice(bestMatchCol, 1);
	sequences.splice(bestMatchRow, 1);

	let alignedSequences = [alignedSeq1, alignedSeq2];

	n = sequences.length;
	if (n === 0) {
		return alignedSequences;
	}

	//############################ PROGRESSIVE ALIGNMENT ############################
	while (n > 0) {
		const currentConsensus = sequencesConsensus(alignedSequences);

		let bestAlignmentSeq;
		let bestAlignmentSeqOriIdx;
		let bestAlignmentMatrix;
		let bestScore = -Infinity;
		// Find how well sequences match amongst themselves
		for (let i = 0; i < n; i++) {
			const [alignedSeq1, alignedSeq2, alignmentMatrix] = needlemanWunsch(
				currentConsensus,
				sequences[i][0]
			);
			const score = calculateScore(alignedSeq1, alignedSeq2, gapPenalty, matchScore, mismatchScore);

			if (score > bestScore) {
				bestScore = score;
				// This is sequences[i] aligned
				bestAlignmentSeq = alignedSeq2;
				// We need this to calculate the new gaps to add to the current alignments
				bestAlignmentMatrix = alignmentMatrix;

				bestAlignmentSeqOriIdx = i;
			}
		}

		// Now we insert the gaps introduced in this alignment to the previous alignments
		// alignmentMatrix is currentConsensus.length x sequences[bestAlignmentSeqOriIdx].length
		let i = currentConsensus.length;

		let seq1 = currentConsensus;
		let seq2 = sequences[bestAlignmentSeqOriIdx][0];
		let j = seq2.length;

		let paddedIndexes = [];

		while (i > 0 || j > 0) {
			if (
				i > 0 &&
				j > 0 &&
				bestAlignmentMatrix[i][j] ===
				bestAlignmentMatrix[i - 1][j - 1] +
				(seq1[i - 1] === seq2[j - 1] ? matchScore : mismatchScore)
			) {
				// Diagonal, no space added
				i--;
				j--;
			} else if (
				i > 0 &&
				bestAlignmentMatrix[i][j] === bestAlignmentMatrix[i - 1][j] + gapPenalty
			) {
				// Up, space added to seq2
				i--;
			} else {
				// Left, space added to seq1
				paddedIndexes.push(i);
				j--;
			}
		}

		// Add the gaps to the previous alignments
		alignedSequences.forEach((seq) => {
			for (const idx of paddedIndexes) {
				// Insert a gap in the idx position
				seq.splice(idx, 0, '-');
			}
		});

		// And add the new alignment there
		alignedSequences.push(bestAlignmentSeq);
		ordering.push(sequences[bestAlignmentSeqOriIdx][1]);
		sequences.splice(bestAlignmentSeqOriIdx, 1);
		n = sequences.length;
	}

	// Sort the output back to the original order
	const reorderedSequences = alignedSequences
		.map((seq, i) => [seq, ordering[i]])
		.sort((a, b) => a[1] - b[1])
		.map(([seq]) => seq);
	return reorderedSequences;
}

function calculateScore(seq1, seq2, gapPenalty, matchScore, mismatchScore) {
	let score = 0;

	for (let i = 0; i < seq1.length; i++) {
		if (seq1[i] === '-' || seq2[i] === '-') {
			score += gapPenalty;
		} else if (seq1[i] === seq2[i]) {
			score += matchScore;
		} else {
			score += mismatchScore;
		}
	}
	return score;
}

function sequencesConsensus(sequences) {
	const n = sequences[0].length;

	let consensus = [];

	for (let i = 0; i < n; i++) {
		const firstElem = sequences[0][i];
		if (sequences.every((seq) => seq[i] === firstElem)) {
			consensus.push(firstElem);
		} else {
			consensus.push('-');
		}
	}
	return consensus;
}

export function longestCommonSubsequence(arr1, arr2) {
	const m = arr1.length;
	const n = arr2.length;
	const lcs = new Array(m + 1).fill(null).map(() => new Array(n + 1).fill(0));

	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			if (arr1[i - 1] === arr2[j - 1]) {
				lcs[i][j] = 1 + lcs[i - 1][j - 1];
			} else {
				lcs[i][j] = Math.max(lcs[i][j - 1], lcs[i - 1][j]);
			}
		}
	}

	let result = [];
	let i = m,
		j = n;

	while (i > 0 && j > 0) {
		if (arr1[i - 1] === arr2[j - 1]) {
			result.unshift(arr1[i - 1]);
			i--;
			j--;
		} else if (lcs[i][j - 1] > lcs[i - 1][j]) {
			j--;
		} else {
			i--;
		}
	}

	return result;
}

export function regionMapParams(region) {
	let centerLon = region?.center_lon;
	let centerLat = region?.center_lat;


	let zoom = region?.zoom ?? 9;
	if (!centerLon || !centerLat) {
		// Default to Lisbon
		centerLat = 38.75;
		centerLon = -9.136;
	}

	return { center: [centerLon, centerLat], zoom };
}

export function isValidUri(uri) {
	try {
		new URL(uri);
	} catch (_) {
		return false;
	}

	return true;
}

export function isValidEmail(email) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}