import { error } from '@sveltejs/kit';
import {
	getRegions,
	getOperator,
	getOperatorFullRoutes,
	getOperatorIssues,
	getOperatorCalendars
} from '$lib/api';

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	const operatorId = parseInt(params.opId);

	const [regions, operator, routes, issues, calendars] = await Promise.all([
		// TODO create an operator regions endpoint
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
		getOperatorFullRoutes(operatorId, {
			onError: (res: Response) => {
				error(res.status, 'Erro a carregar as linhas');
			},
			toJson: true,
			fetch
		}),
		getOperatorIssues(operatorId, {
			onError: (res: Response) => {
				error(res.status, 'Erro a carregar os problemas');
			},
			toJson: true,
			fetch
		}),
		getOperatorCalendars(operatorId, {
			onError: (res: Response) => {
				error(res.status, 'Erro a carregar os calendários');
			},
			toJson: true,
			fetch
		})
	]);

	return { regions, operator, routes, issues, calendars };
}
