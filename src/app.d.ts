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
	permissions: [{perm: string}];
};

declare namespace App {
	// interface Error {}
	interface Locals {
		refreshData: RefreshPayload;
		refreshToken: string;
		refreshExp: Date;
		accessToken: string;
		accessData: AccessPayload;
		accessExp: Date;
		permissions: [{perm: string}];
	}
	// interface PageData {}
	// interface Platform {}
}
