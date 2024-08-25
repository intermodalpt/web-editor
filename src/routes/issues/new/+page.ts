import { error } from '@sveltejs/kit';
import { getOperators, getRoutes, getSimpleRegions, getStops } from '$lib/api';

export async function load({ fetch }) {
	const [operators, stops, routes, regions] = await Promise.all([
		getOperators({
			onError: (res) => {
				error(res.status, 'Erro a carregar os operadores');
			},
			toJson: true,
			fetch
		}),
		getStops({
			onError: (res) => {
				error(res.status, 'Erro a carregar as paragens');
			},
			toJson: true,
			fetch
		}),
		getRoutes({
			onError: (res) => {
				error(res.status, 'Erro a carregar as linhas');
			},
			toJson: true,
			fetch
		}),
		getSimpleRegions({
			onError: (res) => {
				error(res.status, 'Erro a carregar as regiões');
			},
			toJson: true,
			fetch
		})
	]);

	return { operators, stops, routes, regions };
}


