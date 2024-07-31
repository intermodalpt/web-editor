import { error } from '@sveltejs/kit';
import { getOperator, getOperatorStops, getOperatorFullRoutes } from '$lib/api';

export async function load({ params, fetch }) {
	const operatorId = parseInt(params.opId);

	const [operator, stops, routes] = await Promise.all([
		getOperator(operatorId, {
			onError: (res: Response) => {
				error(res.status, 'Erro a carregar o operador');
			},
			toJson: true,
			fetch
		}),
		getOperatorStops(operatorId, {
			onError: (res: Response) => {
				error(res.status, 'Erro a carregar as paragens');
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
		operator,
		routes,
		stops
	};
}
