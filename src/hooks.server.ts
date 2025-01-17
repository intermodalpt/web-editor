import { jwtDecode } from 'jwt-decode';
import { renewAccessToken } from '$lib/api';
import { apiServer } from '$lib/settings';

export async function handle({ event, resolve }) {
	const rawRefreshToken = event.cookies.get('refresh_token');
	const rawAccessToken = event.cookies.get('access_token');
	if (rawRefreshToken) {
		const parsedRefresh = jwtDecode<RefreshPayload>(rawRefreshToken);
		if (parsedRefresh) {
			const expiration = new Date(parsedRefresh.exp * 1000);
			if (new Date() < expiration) {
				console.log('Refresh token found');
				event.locals.refreshToken = rawRefreshToken;
				event.locals.refreshData = parsedRefresh;
				event.locals.refreshExp = new Date(parsedRefresh.exp * 1000);
			} else {
				console.log('User had an expired refresh token');
			}
		}
		if (rawAccessToken) {
			const parsedAccess = jwtDecode<AccessPayload>(rawAccessToken);
			if (parsedAccess) {
				const expiration = new Date(parsedAccess.exp * 1000);
				// 30 seconds in the future
				const inAFewSeconds = new Date(new Date().getTime() + 30000);
				if (inAFewSeconds < expiration) {
					console.log('Access token found');
					event.locals.accessToken = rawAccessToken;
					event.locals.accessData = parsedAccess;
					event.locals.accessExp = new Date(parsedAccess.exp * 1000);
				} else {
					console.log('User had an expired access token');
				}
			}
		}

		if (event.locals.refreshToken && !event.locals.accessToken) {
			console.log('Renewing access token');
			await fetchNewAccessToken(event);
		}
	} else if (rawAccessToken) {
		// Unset the cookie
		event.cookies.set('access_token', '', {
			path: '/',
			maxAge: 0
		});
	}

	return resolve(event);
}

async function fetchNewAccessToken(event: Parameters<import('@sveltejs/kit').Handle>[0]['event']) {
	await renewAccessToken({
		onSuccess: (res) => {
			const cookieHeader = res.headers.get('set-cookie');
			if (cookieHeader) {
				const cookie = cookieHeader.split(';')[0];
				const [name, value] = cookie.split('=');
				if (name === 'access_token') {
					event.cookies.set('access_token', value, {
						path: '/',
						maxAge: 12345678990,
						sameSite: 'lax',
						secure: true,
						httpOnly: true,
						domain: event.url.host
					});

					const parsedAccess = jwtDecode<AccessPayload>(value);
					if (parsedAccess) {
						event.locals.accessToken = value;
						event.locals.accessData = parsedAccess;
						event.locals.permissions = parsedAccess.permissions;
						event.locals.accessExp = new Date(parsedAccess.exp * 1000);
					}
				} else {
					console.error('Unexpected cookie name', name);
				}
			}
		},
		onError: (res) => {
			console.error('Could not renew token');
		},
		fetch: event.fetch
	});
}

export async function handleFetch({ event, request, fetch }) {
	if (request.url.startsWith(apiServer + '/')) {
		request.headers.set('cookie', event.request.headers.get('cookie'));
	}

	return fetch(request);
}
