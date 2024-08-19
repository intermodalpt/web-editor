import { defaultMapContent, isMapContentValid } from './editor/map/utils';

export function defaultContentBlock(type) {
	if (type === 'md') {
		return { md: '' };
	} else if (type === 'img') {
		return {
			img: {
				id: null,
				url: '',
				description: '',
				transcript: null,
				attribution: null
			}
		};
	} else if (type === 'map') {
		return {
			map: defaultMapContent()
		};
	} else if (type === 'ref') {
		return {
			ref: {
				name: null,
				url: null
			}
		};
	}
}

export function isValidContentBlock(block) {
	if ('md' in block) {
		return nonBlankString(block.md);
	} else if ('img' in block) {
		return block.img.id && block.img.url;
	} else if ('map' in block) {
		return isMapContentValid(block.map);
	} else if ('ref' in block) {
		return nonBlankString(block.ref.name) || nonBlankString(block.ref.url);
	} else {
		false;
	}
}

export function nonBlankString(str) {
	return str && str.trim() !== '';
}

export function isValidJson(str) {
	try {
		JSON.parse(str);
		return true;
	} catch (e) {
		return false;
	}
}

export function isValidGeoJson(json) {
	return (
		json &&
		json.type === 'FeatureCollection' &&
		json.features &&
		json.features.length > 0 &&
		json.features.every(isValidGeoJsonFeature)
	);
}

function isValidGeoJsonFeature(f) {
	return f && f.type === 'Feature' && isValidGeoJsonGeometry(f.geometry);
}

function isValidGeoJsonGeometry(geo) {
	if (!geo || !geo.type) return false;

	const coords = geo.coordinates;
	const geos = geo.geometries;

	switch (geo.type) {
		case 'Point':
			return coords && coords.length > 0 && isValidCoordinate(coords);
		case 'LineString':
			return coords && coords.length > 1 && coords.every(isValidCoordinate);
		case 'Polygon':
			return coords && coords.length > 0 && isValidPolygon(coords);
		case 'MultiPoint':
			return coords && coords.length > 0 && coords.every(isValidCoordinate);
		case 'MultiLineString':
			return coords && coords.length > 0 && coords.every(isValidRing);
		case 'MultiPolygon':
			return coords && coords.length > 0 && coords.every(isValidPolygon);
		case 'GeometryCollection':
			return geos && geos.length > 0 && geos.every(isValidGeoJsonGeometry);
		default:
			return false;
	}
}

function isValidPolygon(p) {
	return p && p.length > 0 && p.every(isValidRing);
}

function isValidRing(r) {
	return r && r.length > 1 && r.every(isValidCoordinate);
}

function isValidCoordinate(c) {
	return (
		c &&
		c.length === 2 &&
		!Number.isNaN(Number.parseFloat(c[0])) &&
		!Number.isNaN(Number.parseFloat(c[1]))
	);
}

export function externalContentToContentBlocks(
	content: string,
	source: string | null = null,
	url: string | null = null
) {
	const refBlock = { ref: { name: null, url: null } };

	if (source == 'lpp') {
		refBlock.ref.name = 'Lisboa para Pessoas';
		refBlock.ref.url = url;
	}

	return [{ md: content }, refBlock];
}
