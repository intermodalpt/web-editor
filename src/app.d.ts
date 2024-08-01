type RefreshPayload = {
	iat: number;
	exp: number;
	uid: number;
	jti: string;
	uname: string;
};

type AccessPayload = {
	iat: number;
	exp: number;
	nbf: number;
	jti: string;
	origin: string;
	uname: string;
	permissions: Permissions;
};

interface Permissions {
	regions?: {
		create?: boolean;
		modify?: boolean;
		delete?: boolean;
	};
	operators?: {
		create?: boolean;
		modifyBase?: boolean;
		modifyStops?: boolean;
		modifyCalendars?: boolean;
		delete?: boolean;
	};
	routes?: {
		create?: boolean;
		modifyBase?: boolean;
		modifySubroutes?: boolean;
		modifyStops?: boolean;
		modifyDepartures?: boolean;
		authenticate?: boolean;
		delete?: boolean;
	};
	stops?: {
		create?: boolean;
		modifyPos?: boolean;
		modifyAttrs?: boolean;
		modifyMapFeatures?: boolean;
		authenticate?: boolean;
		delete?: boolean;
		contribModifyAttrs?: boolean;
	};
	osmStops?: {
		update?: boolean;
		delete?: boolean;
	};
	stopPics?: {
		upload?: boolean;
		viewUntagged?: boolean;
		viewSensitive?: boolean;
		modifyOwn?: boolean;
		modifyOthers?: boolean;
		delete?: boolean;
		contribUpload?: boolean;
		contribModify?: boolean;
	};
	news?: {
		create?: boolean;
		modify?: boolean;
		delete?: boolean;
	};
	externalNews?: {
		readPrivate?: boolean;
		modify?: boolean;
		delete?: boolean;
	};
	admin?: {
		readAuditLog?: boolean;
		manageUserSessions?: boolean;
		changePasswords?: boolean;
		changePermissions?: boolean;
		suspendUsers?: boolean;
	};
	misc?: {
		modifyIssues?: boolean;
		contribEvaluator?: boolean;
		expensiveCalls?: boolean;
		patchGtfs?: boolean;
	};
}

declare namespace App {
	// interface Error {}
	interface Locals {
		refreshData: RefreshPayload;
		refreshToken: string;
		refreshExp: Date;
		accessToken: string;
		accessData: AccessPayload;
		accessExp: Date;
		permissions: Permissions;
	}
	// interface PageData {}
	// interface Platform {}
}

type Region = {
	id: number;
	name: string;
	geometry: any;
	center_lat?: number;
	center_lon?: number;
	zoom?: number;
};

type Condition = {
	condition: string;
	range?: { start: [number, number]; end: [number, number] };
	nth?: number;
};

interface Calendar {
	weekdays: number[];
	only_if: Condition[];
	also_if: Condition[];
	except_if: Condition[];
}
