import { error } from '@sveltejs/kit';
import { getExternalNewsItem, getOperators, getRegions } from '$lib/api.js';

export async function load({ params, fetch }) {
	const itemId = parseInt(params.id);
	const [item, operators, regions] = await Promise.all([
		getExternalNewsItem(itemId, {
			onError: (res) => {
				error(res.status, 'Erro a carregar notícia');
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

	return { item, operators, regions };
}
