export async function load({ locals, cookies }) {
	const regionId = cookies.get('regionId');

	return {
		accessData: locals.accessData,
		accessExp: locals.accessExp,
		refresh: locals.refreshToken,
		refreshData: locals.refreshData,
		refreshExp: locals.refreshExp,
		uid: locals.refreshData?.uid,
		uname: locals.refreshData?.uname,
		regionId
	};
}
