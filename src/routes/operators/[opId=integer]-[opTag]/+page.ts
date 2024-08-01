import {
	getOperator,
	getOperatorFullRoutes,
	getOperatorStops,
	getRegions
} from '$lib/api';
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	const operatorId = parseInt(params.opId);

	const [regions, operator, stops, routes] = await Promise.all([
		getRegions({
			onError: (res: Response) => {
				error(res.status, 'Erro a carregar as regiões');
			},
			toJson: true,
			fetch
		}),
		getOperator(operatorId, {
			onError: (res: Response) => {
				error(res.status, 'Erro a carregar o operador');
			},
			toJson: true,
			fetch
		}),
		getOperatorStops(operatorId, {
			onError: (res: Response) => {
				error(res.status, 'Erro a carregar o operador');
			},
			toJson: true,
			fetch
		}),
		getOperatorFullRoutes(operatorId, {
			onError: (res: Response) => {
				error(res.status, 'Erro a carregar as linhas');
			},
			toJson: true,
			fetch
		})
	]);

	return {
		regions,
		operator,
		routes,
		stops
	};
}
