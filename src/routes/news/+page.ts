import { error } from '@sveltejs/kit';
import { getOperators, getRegions, getRoutes, getStops } from '$lib/api';

export async function load({ fetch }) {
	const [operators, regions] = await Promise.all([
		getOperators({
			onError: (res) => {
				error(res.status, 'Erro a carregar os operadores');
			},
			toJson: true,
			fetch
		}),
		getRegions({
			onError: (res) => {
				error(res.status, 'Erro a carregar as regiões');
			},
			toJson: true,
			fetch
		})
	]);

	return { operators, regions };
}


