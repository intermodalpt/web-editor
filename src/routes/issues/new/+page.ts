import { error } from '@sveltejs/kit';
import { getOperators, getRoutes, getStops } from '$lib/api';

export async function load({ fetch }) {
	const [operators, stops, routes] = await Promise.all([
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
		})
	]);

	return { operators, stops, routes };
}


