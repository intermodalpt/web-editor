import { apiServer } from '$lib/settings.js';

// Boilerplate reduction

type SuccessCallback = (res: Response) => void | undefined;
type ErrorCallback = (res: Response) => void | undefined;
type AfterCallback = (res: Response) => void | undefined;

interface ReqOpts {
	onSuccess?: SuccessCallback;
	onError?: ErrorCallback;
	onAfter?: AfterCallback;
	fetch?: (url: string, params?: any) => Promise<Response>;
}

async function handleResponse(
	res: Response,
	{ onSuccess, onError, onAfter }: ReqOpts
): Promise<any> {
	let ret;

	if (res.ok) {
		if (onSuccess) {
			ret = await ensureAwaited(onSuccess(res));
		}
	} else {
		console.error(res);
		if (onError) {
			await ensureAwaited(onError(res));
		}
	}

	if (onAfter) {
		await ensureAwaited(onAfter(res));
	}

	return ret;
}

async function ensureAwaited(maybePromise: Promise<any> | any): Promise<any> {
	if (maybePromise instanceof Promise) {
		return await maybePromise;
	} else {
		return maybePromise;
	}
}

interface SimpleFetchOpts {
	method: string | null;
	body: any;
	isJson: boolean | null;
	opts: ReqOpts;
}

async function betterFetch(
	url: string,
	{ method = 'GET', body, isJson = false, opts }: SimpleFetchOpts
): Promise<Response> {
	return await (opts?.fetch ? opts.fetch : fetch)(url, {
		method: method,
		headers: isJson ? { 'Content-Type': 'application/json' } : {},
		credentials: 'include',
		body: isJson ? JSON.stringify(body) : body
	});
}

// ----- Auth -----

export async function login(username: string, password: string, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			username: username,
			password: password
		})
	});

	return await handleResponse(res, opts);
}

export async function renewAccessToken(opts: ReqOpts) {
	const url = `${apiServer}/v1/auth/renew`;
	const res = await betterFetch(url, { opts });
	// const res = await fetch(`${apiServer}/v1/auth/renew`, {
	// 	credentials: 'include'
	// });

	return await handleResponse(res, opts);
}

export async function register(registration, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/auth/register`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(registration)
	});

	return await handleResponse(res, opts);
}

export async function getCaptcha(opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/auth/get_captcha`);

	return await handleResponse(res, opts);
}

export async function checkUsername(username: string, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/auth/register/username_check`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username })
	});

	return await handleResponse(res, opts);
}

// ----- Regions -----

export async function getRegionTodo(regionId: number, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/regions/${regionId}/stops/todo`);

	return await handleResponse(res, opts);
}

export async function updateStopTodos(stopId: number, todos: [any], opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/stops/${stopId}/todo`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(todos)
	});

	return await handleResponse(res, opts);
}

// ----- Operators -----

export async function createOperator(data, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/operators`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(data)
	});

	return await handleResponse(res, opts);
}

export async function getOperator(operatorId: number, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/operators/${operatorId}`);

	return await handleResponse(res, opts);
}

export async function patchOperator(operatorId: number, data, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/operators/${operatorId}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(data)
	});

	return await handleResponse(res, opts);
}

export async function attachOperatorToRegion(operatorId: number, regionId: number, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/regions/${regionId}/operators/${operatorId}`, {
		method: 'PUT',
		credentials: 'include'
	});

	return await handleResponse(res, opts);
}

export async function dettachOperatorFromRegion(
	operatorId: number,
	regionId: number,
	opts: ReqOpts
) {
	const res = await fetch(`${apiServer}/v1/regions/${regionId}/operators/${operatorId}`, {
		method: 'DELETE',
		credentials: 'include'
	});

	return await handleResponse(res, opts);
}

export async function uploadLogo(operatorId: number, logoData, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/operators/${operatorId}/logo`, {
		method: 'POST',
		credentials: 'include',
		body: logoData
	});

	return await handleResponse(res, opts);
}

export async function createOperatorRouteType(operatorId: number, data, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/operators/${operatorId}/routes/types`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(data)
	});

	return await handleResponse(res, opts);
}

export async function patchOperatorRouteType(
	operatorId: number,
	typeId: number,
	data,
	opts: ReqOpts
) {
	const res = await fetch(`${apiServer}/v1/operators/${operatorId}/routes/types/${typeId}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(data)
	});

	return await handleResponse(res, opts);
}

export async function deleteOperatorRouteType(operatorId: number, typeId: number, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/operators/${operatorId}/routes/types/${typeId}`, {
		method: 'DELETE',
		credentials: 'include'
	});

	return await handleResponse(res, opts);
}

export async function createCalendar(operatorId: number, name: number, calendar, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/operators/${operatorId}/calendars`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ name, calendar })
	});

	return await handleResponse(res, opts);
}

export async function deleteCalendar(operatorId: number, calendarId: number, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/operators/${operatorId}/calendars/${calendarId}`, {
		method: 'DELETE',
		credentials: 'include'
	});

	return await handleResponse(res, opts);
}

export async function createIssue(issue, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/issues`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(issue)
	});

	return await handleResponse(res, opts);
}

// ----- Stops -----

export async function createStop(stopData, opts: ReqOpts) {
	const url = `${apiServer}/v1/stops`;
	const res = await betterFetch(url, { opts, method: 'POST', body: stopData, isJson: true });

	// const res = await fetch(`${apiServer}/v1/stops`, {
	// 	method: 'POST',
	// 	headers: { 'Content-Type': 'application/json' },
	// 	credentials: 'include',
	// 	body: JSON.stringify(stopData)
	// });

	return await handleResponse(res, opts);
}

export async function updateStopMeta(stopId: number, data, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/stops/${stopId}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(data)
	});

	return await handleResponse(res, opts);
}

export async function setStopPosition(stopId: number, lon: number, lat: number, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/stops/${stopId}/position`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ lon, lat })
	});

	return await handleResponse(res, opts);
}

export async function attachStopToRegion(stopId: number, regionId: number, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/regions/${regionId}/stops/${stopId}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include'
	});

	return await handleResponse(res, opts);
}

export async function attachStopToOperator(
	stopId: number,
	operatorId: number,
	pairing,
	opts: ReqOpts
) {
	const res = await fetch(`${apiServer}/v1/operators/${operatorId}/stops/${stopId}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(pairing)
	});

	return await handleResponse(res, opts);
}

export async function detachStopFromOperator(stopId: number, operatorId: number, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/operators/${operatorId}/stops/${stopId}`, {
		method: 'DELETE'
	});

	return await handleResponse(res, opts);
}

export async function getOsmStops(opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/osm/stops`);

	return await handleResponse(res, opts);
}

// ----- Stop pics -----

export async function getStopPic(picId: number, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/stop_pics/${picId}`, {
		credentials: 'include'
	});

	return await handleResponse(res, opts);
}

export async function getStopPics(stopId: number, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/stops/${stopId}/pictures`);

	return await handleResponse(res, opts);
}

export async function getAllStopPics(stopId: number, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/stops/${stopId}/pictures/all`);

	return await handleResponse(res, opts);
}

export async function updateStopPic(picId: number, data, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/stop_pics/${picId}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(data)
	});

	return await handleResponse(res, opts);
}

export async function uploadLinkedStopPic(stopId: number, picData, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/stop_pics/linked/${stopId}`, {
		method: 'POST',
		credentials: 'include',
		body: picData
	});

	return await handleResponse(res, opts);
}

export async function uploadDanglingStopPic(picData, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/stop_pics/dangling`, {
		method: 'POST',
		credentials: 'include',
		body: picData
	});

	return await handleResponse(res, opts);
}

export async function deleteStopPic(picId: number, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/stop_pics/${picId}`, {
		method: 'DELETE',
		credentials: 'include'
	});

	return await handleResponse(res, opts);
}

export async function getStopPicsRels(opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/stop_pics/by_stop`);

	return await handleResponse(res, opts);
}

// ----- Routes -----

export async function createRoute(data, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/routes`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(data)
	});

	return await handleResponse(res, opts);
}

export async function updateRoute(routeId: number, data, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/routes/${routeId}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(data)
	});

	return await handleResponse(res, opts);
}

export async function deleteRoute(routeId: number, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/routes/${routeId}`, {
		method: 'DELETE',
		credentials: 'include'
	});

	return await handleResponse(res, opts);
}

export async function createSubroute(data, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/routes/${route.id}/create_subroute`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(data)
	});

	return await handleResponse(res, opts);
}

export async function updateSubroute(subrouteId: number, data, opts: ReqOpts) {
	// TODO update URL
	const res = await fetch(`${apiServer}/v1/routes/-1/${subrouteId}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(data)
	});

	return await handleResponse(res, opts);
}

export async function deleteSubroute(subrouteId: number, opts: ReqOpts) {
	// TODO update URL
	const res = await fetch(`${apiServer}/v1/routes/-1/${subrouteId}`, {
		method: 'DELETE',
		credentials: 'include'
	});

	return await handleResponse(res, opts);
}

export async function changeSubrouteStops(
	subrouteId: number,
	{ from, to }: { from: [number]; to: [number] },
	opts: ReqOpts
) {
	const res = await fetch(`${apiServer}/v1/subroutes/${subrouteId}/stops`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ from, to })
	});

	return await handleResponse(res, opts);
}

export async function createDeparture(subrouteId: number, departure, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/schedules/${subrouteId}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(departure)
	});

	return await handleResponse(res, opts);
}

export async function deleteDeparture(subrouteId: number, departureId: number, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/schedules/${subrouteId}/${departureId}`, {
		method: 'DELETE',
		credentials: 'include'
	});

	return await handleResponse(res, opts);
}

export async function setSubrouteGtfsAck(
	subrouteId: number,
	{ from, to }: { from: [number]; to: [number] },
	opts: ReqOpts
) {
	const res = await fetch(`${apiServer}/v1/subroutes/${subrouteId}/validation/correspondence_ack`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		// TODO change this in the server to from and to (see changeSubrouteStops)
		body: JSON.stringify({
			from_stop_ids: from,
			to_stop_ids: to
		})
	});

	return await handleResponse(res, opts);
}

export async function setSubrouteImlAck(
	subrouteId: number,
	{ from, to }: { from: [number]; to: [number] },
	opts: ReqOpts
) {
	const res = await fetch(`${apiServer}/v1/subroutes/${subrouteId}/validation/current_ack`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		// TODO change this in the server to from and to (see changeSubrouteStops)
		body: JSON.stringify({
			from_stop_ids: from,
			to_stop_ids: to
		})
	});

	return await handleResponse(res, opts);
}

export async function pairRouteWithUnmatchedPattern(
	routeId: number,
	data: { subroute_id: number; pattern_id: string; sync: boolean },
	opts: ReqOpts
) {
	const res = await fetch(`${apiServer}/v1/routes/${routeId}/assign_unmatched_validation`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(data)
	});

	return await handleResponse(res, opts);
}

// ----- News -----

export async function createNewsItem(data: number, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/news`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(data)
	});

	return await handleResponse(res, opts);
}

export async function getNewsItem(id: number, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/news/${id}`, {
		credentials: 'include'
	});

	return await handleResponse(res, opts);
}

export async function changeNewsItem(id: number, data: number, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/news/${id}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(data)
	});

	return await handleResponse(res, opts);
}

export async function deleteNewsItem(id: number, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/news/${id}`, {
		method: 'DELETE',
		credentials: 'include'
	});

	return await handleResponse(res, opts);
}

export async function uploadNewsImg(data, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/news/images`, {
		method: 'POST',
		credentials: 'include',
		body: data
	});

	return await handleResponse(res, opts);
}

export async function getExternalNewsItem(id: number, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/news/external/${id}/full`, {
		credentials: 'include'
	});

	return await handleResponse(res, opts);
}

export async function updateExternalNewsItem(id: number, data, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/news/external/${id}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(data)
	});

	return await handleResponse(res, opts);
}

export async function deleteExternalNewsItem(id: number, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/news/external/${id}`, {
		method: 'DELETE',
		credentials: 'include'
	});

	return await handleResponse(res, opts);
}

export async function importExternalNewsImage(extImageId: number, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/news/images/import_external/${extImageId}`, {
		method: 'POST',
		credentials: 'include'
	});

	return await handleResponse(res, opts);
}

// ----- Contrib -----

export async function acceptContribution(
	contributionId: number,
	ignoredKeys: [string],
	keepVerification: number,
	opts: ReqOpts
) {
	const res = await fetch(
		`${apiServer}/v1/contrib/${contributionId}/accept?verify=${
			keepVerification ? 'true' : 'false'
		}&ignored=${ignoredKeys.join(',')}`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include'
		}
	);

	return await handleResponse(res, opts);
}

export async function declineContribution(contributionId: number, opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/contrib/${contributionId}/decline`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include'
	});

	return await handleResponse(res, opts);
}

export async function contribUpdateStopMeta(
	stopId: number,
	stopData,
	comment: string,
	opts: ReqOpts
) {
	const res = await fetch(`${apiServer}/v1/contrib/stops/update/${stopId}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ contribution: stopData, comment })
	});

	return await handleResponse(res, opts);
}

export async function getOwnStopPatch(opts: ReqOpts) {
	const res = await fetch(`${apiServer}/v1/contrib/pending_stop_patch/own`, {
		credentials: 'include'
	});

	return await handleResponse(res, opts);
}
