import { writable, derived, get } from 'svelte/store';
import { goto } from "$app/navigation";
import { browser } from '$app/environment';
import { apiServer } from '$lib/settings.js';
import { parseJwt } from '$lib/utils.js';

// FIXME this is not safe but it is good enough for now
// export const token = writable(browser ? localStorage.getItem('token') : null);
export const token = writable(null);

export async function loadToken(fetch) {
	if (!browser) {
		return;
	}

	let currentToken = get(token);
	if (currentToken === null) {
		let storedToken = localStorage.getItem('token');
		if (storedToken === null) {
			return null;
		}
		currentToken = storedToken;
		let validityCheck = await fetch(`${apiServer}/v1/auth/check`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				authorization: `Bearer ${storedToken}`
			}
		});
		if (validityCheck.status === 200) {
			token.set(storedToken);
			return storedToken;
		} else {
			return null;
		}
	}

	return currentToken;
}

export const decodedToken = derived(token, ($token) => {
	if ($token) {
		return parseJwt($token);
	}
});

export async function logout() {
	token.set(null);
	localStorage.removeItem('token');
	await goto('/login');
}

export const routes = writable(undefined);
export const stops = writable(undefined);
export const pictures = writable(undefined);
export const stopPicRels = writable([]);
export const calendars = writable(undefined);

export const operators = {
	1: { name: 'Carris Metropolitana', tag: 'cmet' },
	2: { name: 'Transportes Colectivos do Barreiro', tag: 'tcb' },
	3: { name: 'Carris', tag: 'carris' },
	4: { name: 'MobiCascais', tag: 'mobic' },
	5: { name: 'Comboios de Portugal', tag: 'cp' },
	6: { name: 'Fertagus', tag: 'fert' },
	7: { name: 'Metro Transportes do Sul', tag: 'mts' },
	8: { name: 'Metro de Lisboa', tag: 'ml' },
	9: { name: 'Transtejo e Soflusa', tag: 'ttsl' }
};

export const picStopRels = derived(stopPicRels, ($stopPicRels) => {
	const reverseRel = {};
	if ($stopPicRels === undefined) {
		return reverseRel;
	}

	Object.entries($stopPicRels).forEach(([stopIdStr, pics]) => {
		let stopId = parseInt(stopIdStr);
		pics.forEach((picId) => {
			if (reverseRel[picId] === undefined) {
				reverseRel[picId] = [stopId];
			} else {
				reverseRel[picId].push(stopId);
			}
		});
	});

	return reverseRel;
});

export async function loadRoutes(fetch) {
	let routesData = await fetch(`${apiServer}/v1/routes`)
		.then((r) => r.json())
		.then((stopList) => {
			return Object.fromEntries(stopList.map((stop) => [stop.id, stop]));
		});

	routes.set(routesData);
	return routesData;
}

export async function loadStops(fetch) {
	let stopData = await fetch(`${apiServer}/v1/stops?all=true`)
		.then((r) => r.json())
		.then((stopList) => {
			return Object.fromEntries(stopList.map((stop) => [stop.id, stop]));
		});

	stops.set(stopData);
	return stopData;
}

export async function loadPictures(fetch, token) {
	if (!browser) {
		return;
	}

	let headers = {
		headers: {
			authorization: `Bearer ${token}`
		}
	};

	await Promise.all([
		fetch(`${apiServer}/v1/pictures`, headers)
			.then((r) => r.json())
			.then((pics) => {
				return Object.fromEntries(pics.map((pic) => [pic.id, pic]));
			}),
		fetch(`${apiServer}/v1/pictures/rels`, headers).then((r) => r.json())
	]).then(([pics, rels]) => {
		pictures.set(pics);
		stopPicRels.set(rels);
	});
}

export async function loadCalendars(fetch) {
	let calendarsData = await fetch(`${apiServer}/v1/calendars`)
		.then((r) => r.json())
		.then((calendarList) => {
			return Object.fromEntries(calendarList.map((calendar) => [calendar.id, calendar]));
		});
	calendars.set(calendarsData);
	return calendarsData;
}
