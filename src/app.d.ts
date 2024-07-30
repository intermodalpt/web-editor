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
		modify_base?: boolean;
		modify_stops?: boolean;
		modify_calendars?: boolean;
		delete?: boolean;
	};
	routes?: {
		create?: boolean;
		modify_base?: boolean;
		modify_subroutes?: boolean;
		modify_stops?: boolean;
		modify_departures?: boolean;
		authenticate?: boolean;
		delete?: boolean;
	};
	stops?: {
		create?: boolean;
		modify_pos?: boolean;
		modify_attrs?: boolean;
		modify_map_features?: boolean;
		authenticate?: boolean;
		delete?: boolean;
		contrib_modify_attrs?: boolean;
	};
	osm_stops?: {
		update?: boolean;
		delete?: boolean;
	};
	stop_pics?: {
		upload?: boolean;
		view_untagged?: boolean;
		view_sensitive?: boolean;
		modify_own?: boolean;
		modify_others?: boolean;
		delete?: boolean;
		contrib_upload?: boolean;
		contrib_modify?: boolean;
	};
	news?: {
		create?: boolean;
		modify?: boolean;
		delete?: boolean;
	};
	external_news?: {
		read_private?: boolean;
		modify?: boolean;
		delete?: boolean;
	};
	admin?: {
		read_audit_log?: boolean;
		manage_user_sessions?: boolean;
		change_passwords?: boolean;
		change_permissions?: boolean;
		suspend_users?: boolean;
	};
	misc?: {
		modify_issues?: boolean;
		contrib_evaluator?: boolean;
		expensive_calls?: boolean;
		patch_gtfs?: boolean;
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
