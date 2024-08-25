import { error } from '@sveltejs/kit';
import { getIssue, getOperators, getRoutes, getStops, getSimpleRegions } from '$lib/api';

export async function load({ params, fetch }) {
	const issueId = parseInt(params.id);

	const [issue, operators, stops, routes, regions] = await Promise.all([
		getIssue(issueId, {
			onError: (res: Response) => {
				error(res.status, 'Erro a carregar problema');
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

	return { issue, operators, stops, routes, regions };
}


