import { error } from '@sveltejs/kit';
import { getOperator, getOperatorRouteTypes } from '$lib/api';

export async function load({ fetch, params }) {
	const operatorId = parseInt(params.opId);

	const [operator, routeTypes] = await Promise.all([
		getOperator(operatorId, {
			onError: (res) => {
				error(res.status, 'Erro a carregar os operador');
			},
			toJson: true,
			fetch
		}),
		getOperatorRouteTypes(operatorId, {
			onError: (res) => {
				error(res.status, 'Erro a carregar os tipos de linha');
			},
			toJson: true,
			fetch
		})
	]);

	return { operator, routeTypes };
}
