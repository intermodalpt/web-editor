import { error } from '@sveltejs/kit';
import { fetchOperators, getOperator, regionId } from '$lib/db.ts';
import { apiServer } from '$lib/settings';
import { get } from 'svelte/store';
import { getRegionTodo } from '$lib/api';

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	const selectedRegionId = get(regionId);

	// Redirect the user to the root
	if (!selectedRegionId) {
		error(400, 'Without a selected region');
	}

	let regionStopTodos = await getRegionTodo(selectedRegionId, {
		onError: () => {
			if (regionStopTodosRes.status === 0) {
				error(500, 'Failed to connect to server');
			} else {
				error(500, 'Failed to fetch the region stops');
			}
		},
		toJson: true
	});

	console.log('regionStopTodos', regionStopTodos);

	return {
		regionStopTodos: Object.fromEntries(regionStopTodos.map((stop) => [stop.id, stop]))
	};
}
