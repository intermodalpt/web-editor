import { error } from '@sveltejs/kit';
import { getRegion, getRegionTodo } from '$lib/api';

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	const regionId = parseInt(params.regId);

	const [region, regionTodo] = await Promise.all([
		getRegion(regionId, {
			onError: (res: Response) => {
				error(res.status, 'Erro a carregar a região');
			},
			toJson: true,
			fetch
		}),
		getRegionTodo(regionId, {
			onError: (res) => {
				error(res.status, 'Failed to connect to server');
			},
			toJson: true,
			fetch
		})
	]);

	return {
		region,
		regionStopTodos: Object.fromEntries(regionTodo.map((stop) => [stop.id, stop]))
	};
}
