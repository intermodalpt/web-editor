import { error } from '@sveltejs/kit';
import { getIssue } from '$lib/api.js';

export async function load({ params, fetch }) {
	const issueId = parseInt(params.id);

	const issue = await getIssue(issueId, {
		onError: (res: Response) => {
			error(res.status, 'Erro a carregar problema');
		},
		toJson: true,
		fetch
	});

	return { issue };
}
