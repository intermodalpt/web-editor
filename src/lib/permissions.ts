export function isAdmin(permissions: Permissions) {
	return permissions.some((p) => p.perm === 'admin');
}

export function canCreateStops(permissions: Permissions) {
	return permissions.stops?.create;
}

export function canMoveStops(permissions: Permissions) {
	return permissions.stops?.modify_pos;
}

export function canModifyStopAttrs(permissions: Permissions) {
	return permissions.stops?.modify_attrs;
}

export function canContribModifyStopAttrs(permissions: Permissions) {
	return permissions.stops?.contrib_modify_attrs;
}

export function canCreateRoutes(permissions: Permissions) {
	return permissions.routes?.create;
}

export function canCreateNews(permissions: Permissions) {
	return permissions.news?.create;
}

export function canModifyNews(permissions: Permissions) {
	return permissions.news?.modify;
}

export function canDeleteNews(permissions: Permissions) {
	return permissions.news?.delete;
}

export function canUploadPics(permissions: Permissions) {
	return permissions.stop_pics?.upload;
}

export function canContribUploadPics(permissions: Permissions) {
	return permissions.stop_pics?.contrib_upload;
}
