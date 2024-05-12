import { writable, derived } from 'svelte/store';
import { Dexie } from 'dexie';
import { apiServer, cacheRefreshTime, cacheInvalidationTime } from '$lib/settings';
import { browser } from '$app/environment';

const REGION_KEY = 'editor-region';
const DB_KEY = 'intermodal-editor';

const db = new Dexie(DB_KEY);

db.version(1).stores({
	regions: '&id',
	operators: '&id',
	stops: '&id',
	routes: '&id',
	calendars: '&id',
	parishes: '&id',
	settings: 'key'
});

let _regionsLoaded;
let _operatorsLoaded;
let _stopsLoaded;
let _routesLoaded;
let _calendarsLoaded;
let _parishesLoaded;

export let regionsLoaded = writable(false);
export let operatorsLoaded = writable(false);
export let stopsLoaded = writable(false);
export let routesLoaded = writable(false);
export let calendarsLoaded = writable(false);
export let parishesLoaded = writable(false);

regionsLoaded.subscribe((v) => (_regionsLoaded = v));
operatorsLoaded.subscribe((v) => (_operatorsLoaded = v));
stopsLoaded.subscribe((v) => (_stopsLoaded = v));
routesLoaded.subscribe((v) => (_routesLoaded = v));
calendarsLoaded.subscribe((v) => (_calendarsLoaded = v));
parishesLoaded.subscribe((v) => (_parishesLoaded = v));

export const regionId = writable(
	browser ? parseInt(localStorage.getItem(REGION_KEY)) || null : null
);
let _regionId = null;
regionId.subscribe((id) => {
	_regionId = id;
});

export async function setRegion(id) {
	if (!id) {
		console.error('Attempted to nullify the region id');
		return;
	}
	if (id == _regionId) {
		// Prevent cache invalidation over nothing
		console.log('Region id unchanged');
		return;
	}
	console.log('Setting region id', id);
	await wipeRegionCachedData();
	localStorage.setItem(REGION_KEY, id);
	regionId.set(id);
}

export const selectedRegion = derived([regionId], ([$regionId], set) => {
	if (!$regionId) {
		return null;
	}

	let regionIdInt = parseInt($regionId);
	if (!regionIdInt) {
		console.error('Invalid region id', $regionId);
		return;
	}

	db.regions.get(regionIdInt).then((r) => set(r));
});

function timestampKey(tableName) {
	return `${tableName}_updated`;
}

async function isCacheInvalidated(tableName) {
	const now = new Date();
	let updateDate = await db.settings.get(timestampKey(tableName));
	if (updateDate !== undefined) {
		updateDate = new Date(updateDate.value);
		const diff = now.getTime() - updateDate.getTime();
		return diff > cacheInvalidationTime;
	}
	return true;
}

async function updateCacheTimestamp(tableName) {
	const now = new Date().toISOString();
	await db.settings.put({ key: timestampKey(tableName), value: now });
}

async function invalidateCacheTimestamp(tableName) {
	await db.settings.delete(timestampKey(tableName));
}

export async function fetchRegions(fetcher = fetch) {
	if (!browser) {
		return;
	}

	const cacheInvalidated = await isCacheInvalidated('regions');
	if (!cacheInvalidated) {
		const count = await db.regions.count();
		if (count > 0) {
			regionsLoaded.set(true);
			return;
		}
	}

	const response = await fetcher(`${apiServer}/v1/regions`);
	const regions = await response.json();
	await db.regions.clear();
	await db.regions.bulkPut(regions);
	updateCacheTimestamp('regions');
	regionsLoaded.set(true);
}

export async function fetchOperators(fetcher = fetch, ifMissing = true) {
	if (!browser) {
		return;
	}

	let cacheInvalidated = true;
	if (!ifMissing) {
		await invalidateCacheTimestamp('operators');
	} else {
		cacheInvalidated = await isCacheInvalidated('operators');
	}

	if (!cacheInvalidated) {
		const count = await db.operators.count();
		if (count > 0 && ifMissing) {
			operatorsLoaded.set(true);
			return;
		}
	}

	const response = await fetcher(`${apiServer}/v1/operators`);
	const operators = await response.json();
	await db.operators.clear();
	await db.operators.bulkPut(operators);
	updateCacheTimestamp('operators');
	operatorsLoaded.set(true);
}

export async function fetchStops(ifMissing = true) {
	if (!browser || !_regionId) {
		return;
	}

	let cacheInvalidated = true;
	if (!ifMissing) {
		await invalidateCacheTimestamp('stops');
	} else {
		cacheInvalidated = await isCacheInvalidated('stops');
	}

	if (!cacheInvalidated) {
		const count = await db.stops.count();
		if (count > 0 && ifMissing) {
			stopsLoaded.set(true);
			return;
		}
	}

	const response = await fetch(`${apiServer}/v1/regions/${_regionId}/stops/full`);
	const stops = await response.json();

	await db.stops.clear();
	await db.stops.bulkPut(stops);
	updateCacheTimestamp('stops');
	stopsLoaded.set(true);
}

export async function fetchRoutes(fetcher = fetch, ifMissing = true) {
	if (!browser || !_regionId) {
		return;
	}

	let cacheInvalidated = true;
	if (!ifMissing) {
		await invalidateCacheTimestamp('routes');
	} else {
		cacheInvalidated = await isCacheInvalidated('routes');
	}

	if (!cacheInvalidated) {
		const count = await db.routes.count();
		if (count > 0 && ifMissing) {
			routesLoaded.set(true);
			return;
		}
	}

	const response = await fetch(`${apiServer}/v1/regions/${_regionId}/routes/full`);
	const routes = await response.json();
	await db.routes.clear();
	await db.routes.bulkPut(routes);
	updateCacheTimestamp('routes');
	routesLoaded.set(true);
}

export async function fetchCalendars(ifMissing = true) {
	if (!browser || !_regionId) {
		return;
	}

	let cacheInvalidated = true;
	if (!ifMissing) {
		await invalidateCacheTimestamp('calendars');
	} else {
		cacheInvalidated = await isCacheInvalidated('calendars');
	}

	if (!cacheInvalidated) {
		const count = await db.calendars.count();
		if (count > 0 && ifMissing) {
			return;
		}
	}

	const response = await fetch(`${apiServer}/v1/calendars`);
	const calendars = await response.json();
	await db.calendars.clear();
	await db.calendars.bulkPut(calendars);
	updateCacheTimestamp('calendars');
	calendarsLoaded.set(true);
}

export async function fetchParishes(ifMissing = true) {
	if (!browser || !_regionId) {
		return;
	}

	let cacheInvalidated = true;
	if (!ifMissing) {
		await invalidateCacheTimestamp('parishes');
	} else {
		cacheInvalidated = await isCacheInvalidated('parishes');
	}

	if (!cacheInvalidated) {
		const count = await db.parishes.count();
		if (count > 0 && ifMissing) {
			parishesLoaded.set(true);
			return;
		}
	}

	const response = await fetch(`${apiServer}/v1/regions/${_regionId}/parishes`);
	const parishes = await response.json();
	await db.parishes.clear();
	await db.parishes.bulkPut(parishes);
	updateCacheTimestamp('parishes');
	parishesLoaded.set(true);
}

export async function getRegions() {
	const regions = await db.regions.toArray();
	const regionsObject = Object.fromEntries(regions.map((r) => [r.id, r]));
	return regionsObject;
}

export async function getOperators() {
	const operators = await db.operators.toArray();
	const operatorsObject = Object.fromEntries(operators.map((o) => [o.id, o]));
	return operatorsObject;
}

export async function getOperator(id) {
	return await db.operators.get(id);
}

export async function getStops() {
	const stops = await db.stops.toArray();
	const stopsObject = Object.fromEntries(stops.map((s) => [s.id, s]));
	return stopsObject;
}

export async function getRoutes() {
	const routes = await db.routes.toArray();
	const routesObject = Object.fromEntries(routes.map((r) => [r.id, r]));
	return routesObject;
}

export async function getRoute(id) {
	return await db.routes.get(id);
}

export async function getCalendars() {
	const calendars = await db.calendars.toArray();
	const calendarsObject = Object.fromEntries(calendars.map((c) => [c.id, c]));
	return calendarsObject;
}

export async function getParishes() {
	const parishes = await db.parishes.toArray();
	const parishesObject = Object.fromEntries(parishes.map((p) => [p.id, p]));
	return parishesObject;
}

export async function softInvalidateStops() {
	await invalidateCacheTimestamp('stops');
}

export async function softInvalidateRoutes() {
	await invalidateCacheTimestamp('routes');
}

export async function patchStop(stop) {
	await db.stops.put(stop, stop.id);
}

export async function loadMissing() {
	const missing = [];

	if (!_regionsLoaded) {
		missing.push(fetchRegions());
	}

	if (!_operatorsLoaded) {
		missing.push(fetchOperators());
	}

	if (!_stopsLoaded) {
		missing.push(fetchStops());
	}

	if (!_routesLoaded) {
		missing.push(fetchRoutes());
	}

	if (!_calendarsLoaded) {
		missing.push(fetchCalendars());
	}

	if (!_parishesLoaded) {
		missing.push(fetchParishes());
	}

	await Promise.all(missing);
}

export async function wipeCachedData() {
	await Promise.all([
		db.regions.clear(),
		db.operators.clear(),
		db.stops.clear(),
		db.routes.clear(),
		db.calendars.clear(),
		db.parishes.clear()
	]).then(() => {
		regionsLoaded.set(false);
		operatorsLoaded.set(false);
		stopsLoaded.set(false);
		routesLoaded.set(false);
		calendarsLoaded.set(false);
		parishesLoaded.set(false);
	});
}

export async function wipeRegionCachedData() {
	await Promise.all([db.stops.clear(), db.routes.clear(), db.parishes.clear()]).then(() => {
		stopsLoaded.set(false);
		routesLoaded.set(false);
		parishesLoaded.set(false);
	});
}

export async function wipeOperators() {
	await db.operators.clear().then(() => {
		operatorsLoaded.set(false);
	});
}
