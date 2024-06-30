import { error } from '@sveltejs/kit';
import { fetchOperators, getOperator, regionId } from '$lib/db.js';
import { apiServer } from '$lib/settings.js';
import { get } from 'svelte/store';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	const selectedRegionId = get(regionId);

	// Redirect the user to the root
	if (!selectedRegionId) {
		error(400, 'Without a selected region');
	}

	const regionStopTodosRes = await fetch(`${apiServer}/v1/regions/${selectedRegionId}/stops/todo`);

	if (!regionStopTodosRes.ok) {
		if (regionStopTodosRes.status === 0) {
			error(500, 'Failed to connect to server');
		} else {
			error(500, 'Failed to fetch the region stops');
		}
	}

	const regionStopTodos = await regionStopTodosRes.json();

	return {
		regionStopTodos: Object.fromEntries(regionStopTodos.map((stop) => [stop.id, stop])),
	};
}
