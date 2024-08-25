import { error } from '@sveltejs/kit';
import { getOperator, getOperatorIssues } from '$lib/api';

export async function load({ params, fetch }) {
	const operatorId = parseInt(params.opId);

	const [operator, issues] = await Promise.all([
		getOperator(operatorId, {
			onError: (res: Response) => {
				error(res.status, 'Erro a carregar o operador');
			},
			toJson: true,
			fetch
		}),
		getOperatorIssues(operatorId, {
			onError: (res: Response) => {
				error(res.status, 'Erro a carregar as paragens');
			},
			toJson: true,
			fetch
		})
	]);

	return {
		operator,
		issues
	};
}
