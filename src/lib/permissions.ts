export function isAdmin(permissions: [{ perm: string }]) {
	return permissions.some((p) => p.perm === 'admin');
}

export function canCreateStops(permissions: [{ perm: string }]) {
	return permissions.some((p) => p.perm === 'stops' || p.create);
}

export function canMoveStops(permissions: [{ perm: string }]) {
	return permissions.some((p) => p.perm === 'stops' || p.modify_pos);
}

export function canModifyStopAttrs(permissions: [{ perm: string }]) {
	return permissions.some((p) => p.perm === 'stops' || p.modify_attrs);
}

export function canContribModifyStopAttrs(permissions: [{ perm: string }]) {
	return permissions.some((p) => p.perm === 'stops' || p.contrib_modify_attrs);
}

export function canCreateRoutes(permissions: [{ perm: string }]) {
	return permissions.some((p) => p.perm === 'routes' || p.create);
}

export function canCreateNews(permissions: [{ perm: string }]) {
	return permissions.some((p) => p.perm === 'news' || p.create);
}

export function canModifyNews(permissions: [{ perm: string }]) {
	return permissions.some((p) => p.perm === 'news' || p.modify);
}

export function canDeleteNews(permissions: [{ perm: string }]) {
	return permissions.some((p) => p.perm === 'routes' || p.delete);
}

export function canUploadPics(permissions: [{ perm: string }]) {
	return permissions.some((p) => p.perm === 'stopPics' || p.upload);
}

export function canContribUploadPics(permissions: [{ perm: string }]) {
	return permissions.some((p) => p.perm === 'stopPics' || p.contrib_upload);
}