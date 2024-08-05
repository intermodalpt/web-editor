import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
	if (!locals.accessToken) {
		redirect(307, '/login');
	}

	return {
		uid: locals.refreshData?.uid,
		uname: locals.refreshData?.uname,
		permissions: locals.accessData.permissions
	};
}