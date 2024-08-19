import { apiServer, currentSurveyVersion } from '$lib/settings';

// Boilerplate reduction

type SuccessCallback = (res: any) => void | undefined;
type ErrorCallback = (res: Response) => void | undefined;
type AfterCallback = (res: Response) => void | undefined;

interface ReqOpts {
	onSuccess?: SuccessCallback;
	onError?: ErrorCallback;
	onAfter?: AfterCallback;
	fetch?: (url: string, params?: any) => Promise<Response>;
	toJson?: boolean;
}

async function handleResponse(
	res: Response,
	{ onSuccess, onError, onAfter, toJson = false }: ReqOpts
): Promise<any> {
	let ret;
	let goodParse = true;

	if (res.ok) {
		if (toJson) {
			try {
				ret = await res.json();
			} catch (e) {
				console.error('Json conversion error', e);
				goodParse = false;
			}
		} else {
			ret = res;
		}
	}

	if (res.ok && goodParse) {
		if (onSuccess) {
			await ensureAwaited(onSuccess(toJson ? ret : res));
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
	method?: string;
	body?: any;
	isJson?: boolean;
	opts: ReqOpts;
}

// A better fetch that gracefully deals with SSR
async function f(
	url: string,
	{ method = 'GET', body, isJson = false, opts }: SimpleFetchOpts
): Promise<Response> {
	return await (opts?.fetch ? opts.fetch : fetch)(apiServer + url, {
		method: method,
		headers: isJson ? { 'Content-Type': 'application/json' } : {},
		credentials: 'include',
		body: isJson ? JSON.stringify(body) : body
	});
}

// ----- Auth -----

export async function login(username: string, password: string, opts: ReqOpts) {
	const res = await f(`/v1/auth/login`, {
		method: 'POST',
		isJson: true,
		body: {
			username,
			password
		},
		opts
	});
	return await handleResponse(res, opts);
}

export async function logout(opts: ReqOpts) {
	const res = await f(`/v1/auth/logout`, { method: 'POST', opts });
	return await handleResponse(res, opts);
}

export async function renewAccessToken(opts: ReqOpts) {
	const res = await f(`/v1/auth/renew`, { opts });
	return await handleResponse(res, opts);
}

export async function register(registration, opts: ReqOpts) {
	const res = await f(`/v1/auth/register`, {
		method: 'POST',
		isJson: true,
		body: registration,
		opts
	});
	return await handleResponse(res, opts);
}

export async function getCaptcha(opts: ReqOpts) {
	const res = await f(`/v1/auth/get_captcha`, { opts });
	return await handleResponse(res, opts);
}

export async function checkUsername(username: string, opts: ReqOpts) {
	const res = await f(`/v1/auth/register/username_check`, {
		method: 'POST',
		isJson: true,
		body: { username },
		opts
	});
	return await handleResponse(res, opts);
}

// ----- Regions -----

export async function getRegions(opts: ReqOpts) {
	const res = await f(`/v1/regions`, { opts });
	return await handleResponse(res, opts);
}

export async function getRegion(regionId: number, opts: ReqOpts) {
	const res = await f(`/v1/regions/${regionId}`, { opts });
	return await handleResponse(res, opts);
}

export async function getRegionStops(regionId: number, opts: ReqOpts) {
	const res = await f(`/v1/regions/${regionId}/stops/full`, { opts });
	return await handleResponse(res, opts);
}

export async function getRegionRoutes(regionId: number, opts: ReqOpts) {
	const res = await f(`/v1/regions/${regionId}/routes/full`, { opts });
	return await handleResponse(res, opts);
}

export async function getRegionTodo(regionId: number, opts: ReqOpts) {
	const res = await f(`/v1/regions/${regionId}/stops/todo`, { opts });
	return await handleResponse(res, opts);
}

export async function updateStopTodos(stopId: number, todos: [any], opts: ReqOpts) {
	const res = await f(`/v1/stops/${stopId}/todo`, {
		method: 'PUT',
		isJson: true,
		body: todos,
		opts
	});
	return await handleResponse(res, opts);
}

// ----- Operators -----

export async function getOperators(opts: ReqOpts) {
	const res = await f(`/v1/operators`, { opts });
	return await handleResponse(res, opts);
}

export async function createOperator(data, opts: ReqOpts) {
	const res = await f(`/v1/operators`, {
		method: 'POST',
		isJson: true,
		body: data,
		opts
	});
	return await handleResponse(res, opts);
}

export async function getOperator(operatorId: number, opts: ReqOpts) {
	const res = await f(`/v1/operators/${operatorId}`, { opts });
	return await handleResponse(res, opts);
}

export async function patchOperator(operatorId: number, data, opts: ReqOpts) {
	const res = await f(`/v1/operators/${operatorId}`, {
		method: 'PATCH',
		isJson: true,
		body: data,
		opts
	});
	return await handleResponse(res, opts);
}

export async function attachOperatorToRegion(operatorId: number, regionId: number, opts: ReqOpts) {
	const res = await f(`/v1/regions/${regionId}/operators/${operatorId}`, {
		method: 'PUT',
		opts
	});
	return await handleResponse(res, opts);
}

export async function dettachOperatorFromRegion(
	operatorId: number,
	regionId: number,
	opts: ReqOpts
) {
	const res = await f(`/v1/regions/${regionId}/operators/${operatorId}`, {
		method: 'DELETE',
		opts
	});
	return await handleResponse(res, opts);
}

export async function uploadLogo(operatorId: number, logoData, opts: ReqOpts) {
	const res = await f(`/v1/operators/${operatorId}/logo`, {
		method: 'POST',
		body: logoData,
		opts
	});
	return await handleResponse(res, opts);
}

export async function createOperatorRouteType(operatorId: number, data, opts: ReqOpts) {
	const res = await f(`/v1/operators/${operatorId}/routes/types`, {
		method: 'POST',
		isJson: true,
		body: data,
		opts
	});
	return await handleResponse(res, opts);
}

export async function patchOperatorRouteType(
	operatorId: number,
	typeId: number,
	data,
	opts: ReqOpts
) {
	const res = await f(`/v1/operators/${operatorId}/routes/types/${typeId}`, {
		method: 'PATCH',
		isJson: true,
		body: data,
		opts
	});
	return await handleResponse(res, opts);
}

export async function deleteOperatorRouteType(operatorId: number, typeId: number, opts: ReqOpts) {
	const res = await f(`/v1/operators/${operatorId}/routes/types/${typeId}`, {
		method: 'DELETE',
		opts
	});
	return await handleResponse(res, opts);
}

export async function createCalendar(operatorId: number, name: string, calendar, opts: ReqOpts) {
	const res = await f(`/v1/operators/${operatorId}/calendars`, {
		method: 'POST',
		isJson: true,
		body: { name, calendar },
		opts
	});
	return await handleResponse(res, opts);
}

export async function updateCalendar(operatorId: number, calendar, opts: ReqOpts) {
	const res = await f(`/v1/operators/${operatorId}/calendars/${calendar.id}`, {
		method: 'PATCH',
		isJson: true,
		body: calendar,
		opts
	});
	return await handleResponse(res, opts);
}

export async function deleteCalendar(operatorId: number, calendarId: number, opts: ReqOpts) {
	const res = await f(`/v1/operators/${operatorId}/calendars/${calendarId}`, {
		method: 'DELETE',
		opts
	});
	return await handleResponse(res, opts);
}

export async function getOperatorStops(operatorId: number, opts: ReqOpts) {
	const res = await f(`/v1/operators/${operatorId}/stops`, { opts });
	return await handleResponse(res, opts);
}

export async function getOperatorRoutes(operatorId: number, opts: ReqOpts) {
	const res = await f(`/v1/operators/${operatorId}/routes`, { opts });
	return await handleResponse(res, opts);
}

export async function getOperatorFullRoutes(operatorId: number, opts: ReqOpts) {
	const res = await f(`/v1/operators/${operatorId}/routes/full`, { opts });
	return await handleResponse(res, opts);
}

export async function getOperatorCalendars(operatorId: number, opts: ReqOpts) {
	const res = await f(`/v1/operators/${operatorId}/calendars`, { opts });
	return await handleResponse(res, opts);
}

export async function getOperatorIssues(operatorId: number, opts: ReqOpts) {
	const res = await f(`/v1/operators/${operatorId}/issues`, { opts });
	return await handleResponse(res, opts);
}

export async function getOperatorStopRels(operatorId: number, opts: ReqOpts) {
	const res = await f(`/v1/operators/${operatorId}/stop_rels`, { opts });
	return await handleResponse(res, opts);
}

// ----- Stops -----

export async function getStops(opts: ReqOpts) {
	const res = await f(`/v1/stops`, { opts });
	return await handleResponse(res, opts);
}

export async function getStop(stopId: number, opts: ReqOpts) {
	const res = await f(`/v1/stops/${stopId}`, { opts });
	return await handleResponse(res, opts);
}

export async function getStopList(ids: number[], opts: ReqOpts) {
	const res = await f(`/v1/stops/list/${ids.join(',')}`, { opts });
	return await handleResponse(res, opts);
}

type Rectangle = { minLon: number; minLat: number; maxLon: number; maxLat: number };
export async function getStopArea({ minLon, minLat, maxLon, maxLat }: Rectangle, opts: ReqOpts) {
	const res = await f(`/v1/stops/within_boundary/${minLon}/${minLat}/${maxLon}/${maxLat}`, {
		opts
	});
	return await handleResponse(res, opts);
}

export async function createStop(stopData, opts: ReqOpts) {
	const res = await f(`/v1/stops`, {
		method: 'POST',
		isJson: true,
		body: stopData,
		opts
	});
	return await handleResponse(res, opts);
}

export async function updateStopMeta(stopId: number, data, opts: ReqOpts) {
	const res = await f(`/v1/stops/${stopId}`, {
		method: 'PATCH',
		isJson: true,
		body: data,
		opts
	});
	return await handleResponse(res, opts);
}

export async function setStopPosition(stopId: number, lon: number, lat: number, opts: ReqOpts) {
	const res = await f(`/v1/stops/${stopId}/position`, {
		method: 'PUT',
		isJson: true,
		body: { lon, lat },
		opts
	});
	return await handleResponse(res, opts);
}

export async function attachStopToRegion(stopId: number, regionId: number, opts: ReqOpts) {
	const res = await f(`/v1/regions/${regionId}/stops/${stopId}`, {
		method: 'PUT',
		opts
	});
	return await handleResponse(res, opts);
}

export async function attachStopToOperator(
	stopId: number,
	operatorId: number,
	pairing,
	opts: ReqOpts
) {
	const res = await f(`/v1/operators/${operatorId}/stops/${stopId}`, {
		method: 'PUT',
		isJson: true,
		body: pairing,
		opts
	});
	return await handleResponse(res, opts);
}

export async function detachStopFromOperator(stopId: number, operatorId: number, opts: ReqOpts) {
	const res = await f(`/v1/operators/${operatorId}/stops/${stopId}`, {
		method: 'DELETE',
		opts
	});
	return await handleResponse(res, opts);
}

// ----- OSM -----

export async function getOsmStops(opts: ReqOpts) {
	const res = await f(`/v1/osm/stops`, { opts });
	return await handleResponse(res, opts);
}

export async function getOsmStop(osmId: number, opts: ReqOpts) {
	const res = await f(`/v1/osm/stops/${osmId}`, { opts });
	return await handleResponse(res, opts);
}

export async function getOsmPairedStop(osmId: number, opts: ReqOpts) {
	const res = await f(`/v1/osm/stops/${osmId}/paired`, { opts });
	return await handleResponse(res, opts);
}

// ----- Stop pics -----

export async function getStopPic(picId: number, opts: ReqOpts) {
	const res = await f(`/v1/stop_pics/${picId}`, { opts });
	return await handleResponse(res, opts);
}

export async function getStopPics(stopId: number, opts: ReqOpts) {
	const res = await f(`/v1/stops/${stopId}/pictures`, { opts });
	return await handleResponse(res, opts);
}

export async function getAllStopPics(stopId: number, opts: ReqOpts) {
	const res = await f(`/v1/stops/${stopId}/pictures/all`, { opts });
	return await handleResponse(res, opts);
}

export async function updateStopPic(picId: number, data, opts: ReqOpts) {
	const res = await f(`/v1/stop_pics/${picId}`, {
		method: 'PATCH',
		isJson: true,
		body: data,
		opts
	});
	return await handleResponse(res, opts);
}

export async function uploadLinkedStopPic(stopId: number, picData, opts: ReqOpts) {
	const res = await f(`/v1/stop_pics/linked/${stopId}`, {
		method: 'POST',
		body: picData,
		opts
	});
	return await handleResponse(res, opts);
}

export async function uploadDanglingStopPic(picData, opts: ReqOpts) {
	const res = await f(`/v1/stop_pics/dangling`, {
		method: 'POST',
		body: picData,
		opts
	});
	return await handleResponse(res, opts);
}

export async function deleteStopPic(picId: number, opts: ReqOpts) {
	const res = await f(`/v1/stop_pics/${picId}`, { method: 'DELETE', opts });
	return await handleResponse(res, opts);
}

export async function getStopPicsRels(opts: ReqOpts) {
	const res = await f(`/v1/stop_pics/by_stop`, { opts });
	return await handleResponse(res, opts);
}

export async function getPicsForStop(stopId: number, opts: ReqOpts) {
	const res = await f(`/v1/stops/${stopId}/pictures/all`, { opts });
	return await handleResponse(res, opts);
}

export async function getLatestStopPics(
	page: number,
	{ user = null, taggedOnly = false, untaggedOnly = false },
	opts: ReqOpts
) {
	let url = `/v1/stop_pics/latest?p=${page}`;
	if (taggedOnly) {
		url += '&tagged_only=true';
	} else if (untaggedOnly) {
		url += '&untagged_only=true';
	}
	if (user) {
		url += `&user=${user}`;
	}
	const res = await f(url, { opts });
	return await handleResponse(res, opts);
}

export async function getUnpositionedStopPics(page: number, opts: ReqOpts) {
	const res = await f(`/v1/stop_pics/unpositioned?p=${page}`, { opts });
	return await handleResponse(res, opts);
}

// ----- Routes -----

export async function getRoutes(opts: ReqOpts) {
	const res = await f(`/v1/routes`, { opts });
	return await handleResponse(res, opts);
}

export async function createRoute(data, opts: ReqOpts) {
	const res = await f(`/v1/routes`, {
		method: 'POST',
		isJson: true,
		body: data,
		opts
	});
	return await handleResponse(res, opts);
}

export async function updateRoute(routeId: number, data, opts: ReqOpts) {
	const res = await f(`/v1/routes/${routeId}`, {
		method: 'PATCH',
		isJson: true,
		body: data,
		opts
	});
	return await handleResponse(res, opts);
}

export async function deleteRoute(routeId: number, opts: ReqOpts) {
	const res = await f(`/v1/routes/${routeId}`, { method: 'DELETE', opts });
	return await handleResponse(res, opts);
}

export async function createSubroute(data, opts: ReqOpts) {
	const res = await f(`/v1/routes/${routeId}/subroutes`, {
		method: 'POST',
		isJson: true,
		body: data,
		opts
	});
	return await handleResponse(res, opts);
}

export async function updateSubroute(subrouteId: number, data, opts: ReqOpts) {
	const res = await f(`/v1/subroutes/${subrouteId}`, {
		method: 'PATCH',
		isJson: true,
		body: data,
		opts
	});
	return await handleResponse(res, opts);
}

export async function deleteSubroute(subrouteId: number, opts: ReqOpts) {
	const res = await f(`/v1/subroutes/${subrouteId}`, { method: 'DELETE', opts });
	return await handleResponse(res, opts);
}

export async function changeSubrouteStops(
	subrouteId: number,
	{ from, to }: { from: [number]; to: [number] },
	opts: ReqOpts
) {
	const res = await f(`/v1/subroutes/${subrouteId}/stops`, {
		method: 'PATCH',
		isJson: true,
		body: { from, to },
		opts
	});
	return await handleResponse(res, opts);
}

export async function createDeparture(subrouteId: number, departure, opts: ReqOpts) {
	const res = await f(`/v1/schedules/${subrouteId}`, {
		method: 'POST',
		isJson: true,
		body: departure,
		opts
	});
	return await handleResponse(res, opts);
}

export async function deleteDeparture(subrouteId: number, departureId: number, opts: ReqOpts) {
	const res = await f(`/v1/schedules/${subrouteId}/${departureId}`, {
		method: 'DELETE',
		opts
	});
	return await handleResponse(res, opts);
}

export async function setSubrouteGtfsAck(
	subrouteId: number,
	{ from, to }: { from: [number]; to: [number] },
	opts: ReqOpts
) {
	const res = await f(`/v1/subroutes/${subrouteId}/validation/correspondence_ack`, {
		method: 'POST',
		isJson: true,
		body: { from_stop_ids: from, to_stop_ids: to },
		opts
	});
	return await handleResponse(res, opts);
}

export async function setSubrouteImlAck(
	subrouteId: number,
	{ from, to }: { from: [number]; to: [number] },
	opts: ReqOpts
) {
	const res = await f(`/v1/subroutes/${subrouteId}/validation/current_ack`, {
		method: 'POST',
		isJson: true,
		body: { from_stop_ids: from, to_stop_ids: to },
		opts
	});
	return await handleResponse(res, opts);
}

export async function pairRouteWithUnmatchedPattern(
	routeId: number,
	data: { subroute_id: number; pattern_id: string; sync: boolean },
	opts: ReqOpts
) {
	const res = await f(`/v1/routes/${routeId}/assign_unmatched_validation`, {
		method: 'POST',
		isJson: true,
		body: data,
		opts
	});
	return await handleResponse(res, opts);
}

// ----- News -----

export async function createNewsItem(data: number, opts: ReqOpts) {
	const res = await f(`/v1/news`, {
		method: 'POST',
		isJson: true,
		body: data,
		opts
	});
	return await handleResponse(res, opts);
}

export async function getNewsItem(id: number, opts: ReqOpts) {
	const res = await f(`/v1/news/${id}`, {
		opts
	});
	return await handleResponse(res, opts);
}

export async function changeNewsItem(id: number, data: number, opts: ReqOpts) {
	const res = await f(`/v1/news/${id}`, {
		method: 'PATCH',
		isJson: true,
		body: data,
		opts
	});
	return await handleResponse(res, opts);
}

export async function deleteNewsItem(id: number, opts: ReqOpts) {
	const res = await f(`/v1/news/${id}`, {
		method: 'DELETE',
		opts
	});
	return await handleResponse(res, opts);
}

export async function uploadNewsImg(data, opts: ReqOpts) {
	const res = await f(`/v1/news/images`, {
		method: 'POST',
		body: data,
		opts
	});
	return await handleResponse(res, opts);
}

export async function getExternalNewsItem(id: number, opts: ReqOpts) {
	const res = await f(`/v1/news/external/${id}/full`, { opts });
	return await handleResponse(res, opts);
}

export async function updateExternalNewsItem(id: number, data, opts: ReqOpts) {
	const res = await f(`/v1/news/external/${id}`, {
		method: 'PATCH',
		isJson: true,
		body: data,
		opts
	});
	return await handleResponse(res, opts);
}

export async function deleteExternalNewsItem(id: number, opts: ReqOpts) {
	const res = await f(`/v1/news/external/${id}`, {
		method: 'DELETE',
		opts
	});
	return await handleResponse(res, opts);
}

export async function importExternalNewsImage(extImageId: number, opts: ReqOpts) {
	const res = await f(`/v1/news/images/import_external/${extImageId}`, {
		method: 'POST',
		opts
	});
	return await handleResponse(res, opts);
}

// ----- Images
export async function uploadRichImg(data, opts: ReqOpts) {
	const res = await f(`/v1/content/images`, {
		method: 'POST',
		body: data,
		opts
	});
	return await handleResponse(res, opts);
}

export async function patchRichImg(id: string, data, opts: ReqOpts) {
	const res = await f(`/v1/content/images/${id}`, {
		method: 'PATCH',
		isJson: true,
		body: data,
		opts
	});
	return await handleResponse(res, opts);
}

export async function getStopPicMap(opts: ReqOpts) {
	const res = await f(`/v1/stop_pics/map`, { opts });
	return await handleResponse(res, opts);
}

// ----- Contrib -----

export async function getOwnDecidedContributions(page: number, opts: ReqOpts) {
	const res = await f(`/v1/contrib/contributions/own/decided?p=${page}`, { opts });
	return await handleResponse(res, opts);
}

export async function getOwnUndecidedContributions(page: number, opts: ReqOpts) {
	const res = await f(`/v1/contrib/contributions/own/undecided?p=${page}`, { opts });
	return await handleResponse(res, opts);
}

export async function acceptContribution(
	contributionId: number,
	ignoredKeys: [string],
	keepVerification: number,
	opts: ReqOpts
) {
	const res = await f(
		`/v1/contrib/${contributionId}/accept?verify=${keepVerification ? 'true' : 'false'}&ignored=${ignoredKeys.join(',')}`,
		{
			method: 'POST',
			isJson: true,
			opts
		}
	);
	return await handleResponse(res, opts);
}

export async function declineContribution(contributionId: number, opts: ReqOpts) {
	const res = await f(`/v1/contrib/${contributionId}/decline`, {
		method: 'POST',
		isJson: true,
		opts
	});
	return await handleResponse(res, opts);
}

export async function contribUpdateStopMeta(
	stopId: number,
	stopData,
	comment: string,
	opts: ReqOpts
) {
	const res = await f(`/v1/contrib/stops/update/${stopId}`, {
		method: 'POST',
		isJson: true,
		body: { contribution: stopData, comment },
		opts
	});
	return await handleResponse(res, opts);
}

export async function getOwnStopPatch(opts: ReqOpts) {
	const url = '/v1/contrib/pending_stop_patch/own';
	return await handleResponse(await f(url, { opts }), opts);
}

// ----- GTFS -----

export async function getOperatorGtfsStops(operatorId: number, opts: ReqOpts) {
	const res = await f(`/v1/operators/${operatorId}/gtfs/stops`, { opts });
	return await handleResponse(res, opts);
}

export async function getOperatorGtfsRoutes(operatorId: number, opts: ReqOpts) {
	const res = await f(`/v1/operators/${operatorId}/gtfs/routes`, { opts });
	return await handleResponse(res, opts);
}

// ----- Users -----

export async function getUserInfo(opts: ReqOpts) {
	const res = await f(`/v1/user/info`, { opts });
	return await handleResponse(res, opts);
}

export async function getUserStats(opts: ReqOpts) {
	const res = await f(`/v1/user/stats`, { opts });
	return await handleResponse(res, opts);
}

export async function changePassword(old_password: string, new_password: string, opts: ReqOpts) {
	const res = await f(`/v1/auth/change_password`, {
		method: 'POST',
		isJson: true,
		body: { old_password, new_password },
		opts
	});
	return await handleResponse(res, opts);
}

export async function getLastSurvey(opts: ReqOpts) {
	const res = await f(`/v1/survey`, { opts });
	return await handleResponse(res, opts);
}

type SurveyUploadOpts = {
	user_id?: number | null;
	username?: string | null;
	email?: string | null;
	survey: any;
};
export async function uploadSurvey(
	{ user_id = null, username = null, email = null, survey }: SurveyUploadOpts,
	opts: ReqOpts
) {
	const res = await f(`/v1/survey`, {
		method: 'POST',
		isJson: true,
		body: { user_id, username, email, survey, survey_version: currentSurveyVersion },
		opts
	});
	return await handleResponse(res, opts);
}

// ----- Misc -----

export async function createIssue(issue, opts: ReqOpts) {
	const res = await f(`/v1/issues`, {
		method: 'POST',
		isJson: true,
		body: issue,
		opts
	});
	return await handleResponse(res, opts);
}

export async function getRegionParishes(regionId: number, opts: ReqOpts) {
	const res = await f(`/v1/regions/${regionId}/parishes`, { opts });
	return await handleResponse(res, opts);
}


// ----- Router -----

export async function getRouteThrough(stops: [number, number][], opts: ReqOpts) {
	const routerUrl = 'https://router.intermodal.pt';
	const lineString = stops.map(([lon, lat]) => `${lon},${lat}`).join(';');
	const res = await fetch(`${routerUrl}/route/v1/driving/${lineString}?overview=full&alternatives=false&steps=false&geometries=polyline6`);
	return await handleResponse(res, opts);
}