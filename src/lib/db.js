import { Dexie } from 'dexie'
import { apiServer, cacheRefreshTime, cacheInvalidationTime } from '$lib/settings';
import { browser } from '$app/environment';

export const db = new Dexie('intermodal');

db.version(3).stores({
    stops: '&id',
    routes: '&id',
    calendars: '&id',
    parishes: '&id',
    settings: 'key',
});

export let stopsLoaded = false;
export let routesLoaded = false;
export let calendarsLoaded = false;
export let parishesLoaded = false;

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

export async function fetchStops(ifMissing = true) {
    if (!browser) {
        return;
    }

    let cacheInvalidated = true;
    if (!ifMissing) {
        await invalidateCacheTimestamp('stops');
    } else {
        cacheInvalidated = await isCacheInvalidated('stops');
    }

    console.log('Stop cache invalidated', cacheInvalidated);

    if (!cacheInvalidated) {
        const count = await db.stops.count();
        if (count > 0 && ifMissing) {
            return;
        }
    }

    console.log('fetching stops');
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

    let cacheInvalidated = true;
    if (!ifMissing) {
        await invalidateCacheTimestamp('routes');
    } else {
        cacheInvalidated = await isCacheInvalidated('routes');
    }

    if (!cacheInvalidated) {
        const count = await db.routes.count();
        if (count > 0 && ifMissing) {
            return;
        }
    }

    const response = await fetch(`${apiServer}/v1/routes`);
    const routes = await response.json();
    await db.routes.clear();
    await db.routes.bulkPut(routes);
    updateCacheTimestamp('routes');
    routesLoaded = true;
}

export async function fetchCalendars(ifMissing = true) {
    if (!browser) {
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
    calendarsLoaded = true;
}

export async function fetchParishes(ifMissing = true) {
    if (!browser) {
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
            return;
        }
    }

    const response = await fetch(`${apiServer}/v1/parishes`);
    const parishes = await response.json();
    await db.parishes.clear();
    await db.parishes.bulkPut(parishes);
    updateCacheTimestamp('parishes');
    parishesLoaded = true;
}

export async function getStops() {
    const stops = await db.stops.toArray();
    const stopsObject = Object.fromEntries(stops.map((s) => [s.id, s]));
    return stopsObject;
}

export async function getRoutes() {
    const routes = await db.routes.toArray();
    const routesObject = Object.fromEntries(routes.map((r) => [r.id, r]));
    return routesObject
}

export async function getCalendars() {
    const calendars = await db.calendars.toArray();
    const calendarsObject = Object.fromEntries(calendars.map((c) => [c.id, c]));
    return calendarsObject
}

export async function getParishes() {
    const parishes = await db.parishes.toArray();
    const parishesObject = Object.fromEntries(parishes.map((c) => [c.id, c]));
    return parishesObject;
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

    if (!parishesLoaded) {
        missing.push(fetchParishes());
    }

    await Promise.all(missing);
}

export async function wipeCachedData() {
    await Promise.all([
        db.stops.clear(),
        db.routes.clear(),
        db.calendars.clear(),
        db.parishes.clear()
    ]).then(() => {
        stopsLoaded = false;
        routesLoaded = false;
        calendarsLoaded = false;
        parishesLoaded = false;
    });
}