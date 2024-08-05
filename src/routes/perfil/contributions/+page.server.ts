import { redirect } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { getOwnDecidedContributions, getOwnUndecidedContributions } from '$lib/api.js';

export async function load({ locals, fetch }) {
	if (!locals.accessToken) {
		redirect(307, '/login');
	}

	const [decidedContributions, undecidedContributions] = await Promise.all([
		getOwnDecidedContributions(0, {
			onError: (res) => {
				error(res.status, 'Problema a obter as contribuições');
			},
			toJson: true,
			fetch
		}),
		getOwnUndecidedContributions(0, {
			onError: (res) => {
				error(res.status, 'Problema a obter as contribuições');
			},
			toJson: true,
			fetch
		})
	]);

	return {
		uid: locals.refreshData?.uid,
		uname: locals.refreshData?.uname,
		permissions: locals.accessData.permissions,
		decidedContributions,
		undecidedContributions
	};
}
