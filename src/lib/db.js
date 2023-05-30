import { Dexie } from 'dexie'
import { apiServer, cacheRefreshTime, cacheInvalidationTime } from '$lib/settings';
import { browser } from '$app/environment';

export const db = new Dexie('intermodal');

db.version(2).stores({
    stops: '&id',
    routes: '&id',
    calendars: '&id',
    settings: 'key',
});

let cacheInvalidated = false;

export let stopsLoaded = false;
export let routesLoaded = false;
export let calendarsLoaded = false;

export async function invalidateCache() {
    cacheInvalidated = true;
};


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


export async function fetchStops(ifMissing = true) {
    console.log('loadingStops');
    if (!browser) {
        return;
    }

    let cacheInvalidated = await isCacheInvalidated('stops');

    console.log('Cache invalidated', cacheInvalidated);

    if (!cacheInvalidated) {
        const count = await db.stops.count();
        console.log(count);
        if (count > 0 && ifMissing) {
            return;
        }
    }

    const response = await fetch(`${apiServer}/v1/tml/stops`);
    const stops = await response.json();
    await db.stops.clear();
    await db.stops.bulkPut(stops);
    updateCacheTimestamp('stops');
    stopsLoaded = true;
    console.log('end loadingStops');
}

export async function fetchRoutes(ifMissing = true) {
    if (!browser) {
        return;
    }

    let cacheInvalidated = await isCacheInvalidated('routes');

    if (!cacheInvalidated) {
        const count = await db.routes.count();
        if (count > 0 && ifMissing) {
            return;
        }
    }

    const response = await fetch(`${apiServer}/v1/routes`);
    const routes = await response.json();
    console.log(routes);
    await db.routes.clear();
    await db.routes.bulkPut(routes);
    updateCacheTimestamp('routes');
    routesLoaded = true;
}

export async function fetchCalendars(ifMissing = true) {
    if (!browser) {
        return;
    }

    let cacheInvalidated = await isCacheInvalidated('calendars');

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
    calendarsLoaded = true;
}

export async function getStops() {
    return new Promise(async (resolve, reject) => {
        const stops = await db.stops.toArray();
        const stopsObject = Object.fromEntries(stops.map((s) => [s.id, s]));
        resolve(stopsObject);
    });
}

export async function getRoutes() {
    return new Promise(async (resolve, reject) => {
        const routes = await db.routes.toArray();
        const routesObject = Object.fromEntries(routes.map((r) => [r.id, r]));
        resolve(routesObject);
    });
}

export async function getCalendars() {
    return new Promise(async (resolve, reject) => {
        const calendars = await db.calendars.toArray();
        const calendarsObject = Object.fromEntries(calendars.map((c) => [c.id, c]));
        resolve(calendarsObject);
    });
}


export async function loadMissing() {
    const missing = [];

    if (!stopsLoaded) {
        missing.push(fetchStops());
    }

    if (!routesLoaded) {
        missing.push(fetchRoutes());
    }

    if (!calendarsLoaded) {
        missing.push(fetchCalendars());
    }

    await Promise.all(missing);
}