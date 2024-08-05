import { error, redirect } from '@sveltejs/kit';
import { getLastSurvey, getUserInfo, getUserStats } from '$lib/api';

export async function load({ locals, fetch }) {
	if (!locals.accessToken) {
		redirect(307, '/login');
	}

	const [info, stats] = await Promise.all([
		getUserInfo({
			onError: (res) => {
				error(res.status, 'Problema a carregar os dados do utilizador');
			},
			toJson: true,
			fetch
		}),
		getUserStats({
			onError: (res) => {
				error(res.status, 'Problema a carregar as estatísticas do utilizador');
			},
			toJson: true,
			fetch
		})
	]);

	return {
		uid: locals.refreshData?.uid,
		uname: locals.refreshData?.uname,
		permissions: locals.accessData.permissions,
		info,
		stats
	};
}
