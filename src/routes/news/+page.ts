import { error } from '@sveltejs/kit';
import { getNewsItems, getOperators, getRegions } from '$lib/api';

export async function load({ fetch }) {
	const [items, operators, regions] = await Promise.all([
		getNewsItems(0, {
			onError: (res) => {
				error(res.status, 'Erro a carregar as notícias');
			},
			toJson: true,
			fetch
		}),
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

	return { items, operators, regions };
}
