import { slugify } from './utils';

export const OPERATORS_URL = '/operators';
export const REGIONS_URL = '/regions';

export function getRegionUrl(region): string {
	return `${REGIONS_URL}/${region?.id}-${slugify(region?.name)}`;
}

export function getRegionEditUrl(region): string {
	return `${getRegionUrl(region)}/edit`;
}

export function getRegionStopsUrl(region): string {
	return `${getRegionUrl(region)}/stops`;
}

export function getRegionImagesUrl(region): string {
	return `${getRegionUrl(region)}/images`;
}

export function getRegionOperatorsUrl(region): string {
	return `${getRegionUrl(region)}/operators`;
}

export function getRegionTodoUrl(region): string {
	return `${getRegionUrl(region)}/todo`;
}

export function getRegionIssuesUrl(region): string {
	return `${getRegionUrl(region)}/issues`;
}

export function getRegionStatsUrl(region): string {
	return `${getRegionUrl(region)}/stats`;
}

export function getOperatorUrl({ operator }): string {
	return `${OPERATORS_URL}/${operator?.id}-${operator?.tag}`;
}
