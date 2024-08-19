import polyline from '@mapbox/polyline';

const DEFAULT_POINT_COLOR = '#1e66f5';
const DEFAULT_POINT_SIZE = 10;
const DEFAULT_POINT_OPACITY = 0.3;
const DEFAULT_LINE_SIZE = 4;
const DEFAULT_LINE_COLOR = '#1e66f5';
const DEFAULT_LINE_OPACITY = 1;
const DEFAULT_POLY_COLOR = '#1e66f5';
const DEFAULT_POLY_OPACITY = 0.3;

const DEFAULT_OUTLINE_OPACITY = 0.5;
const DEFAULT_OUTLINE_COLOR = '#1e66f5';
const DEFAULT_OUTLINE_SIZE = 3;

export function defaultMapContent(): MapContent {
	return {
		layers: [
			{
				id: 0,
				name: 'Base',
				features: [],
				spec: defaultLayerSpec(),
				visible: true
			}
		],
		features: [],
		bounding: [],
		camera: {
			center: [0, 0],
			zoom: 0,
			bearing: 0,
			pitch: 0
		},
		version: 1
	};
}

export function defaultLayerSpec(): LayerSpec {
	return {
		points: {
			size: DEFAULT_POINT_SIZE,
			color: DEFAULT_POINT_COLOR,
			opacity: DEFAULT_POINT_OPACITY,
			outline: {
				color: DEFAULT_OUTLINE_COLOR,
				opacity: DEFAULT_OUTLINE_OPACITY,
				size: DEFAULT_OUTLINE_SIZE
			}
		},
		lines: {
			size: DEFAULT_LINE_SIZE,
			color: DEFAULT_LINE_COLOR,
			opacity: 1.0,
			outline: {
				color: '#333333',
				opacity: 1.0,
				size: DEFAULT_OUTLINE_SIZE
			}
		},
		polys: {
			color: DEFAULT_POLY_COLOR,
			opacity: DEFAULT_POLY_OPACITY,
			outline: {
				color: DEFAULT_OUTLINE_COLOR,
				opacity: DEFAULT_OUTLINE_OPACITY,
				size: DEFAULT_OUTLINE_SIZE
			}
		},
		effects: []
	};
}

export function completeLayerSpec(spec: LayerSpec): LayerSpec {
	return {
		points: {
			size: spec?.points?.size ?? DEFAULT_POINT_SIZE,
			color: spec?.points?.color ?? DEFAULT_POINT_COLOR,
			opacity: spec?.points?.opacity ?? DEFAULT_POINT_OPACITY,
			outline: spec.points.outline,
			pulse: completeOutline(spec.points.outline)
		},
		lines: {
			size: spec?.lines?.size ?? DEFAULT_LINE_SIZE,
			color: spec?.lines?.color ?? DEFAULT_LINE_COLOR,
			opacity: spec?.lines?.opacity ?? DEFAULT_LINE_OPACITY,
			outline: completeOutline(spec.lines.outline)
		},
		polys: {
			color: spec?.polys?.color ?? DEFAULT_POLY_COLOR,
			opacity: spec?.polys?.opacity ?? DEFAULT_POLY_OPACITY,
			outline: completeOutline(spec.polys.outline)
		},
		effects: spec.effects ?? []
	};
}

function completeOutline(outline: Outline): Outline | null {
	if (!outline) return outline;

	if (!outline.color || !outline.size || !outline.opacity) {
		return null;
	}

	return {
		color: outline.color ?? DEFAULT_OUTLINE_COLOR,
		opacity: outline.opacity ?? DEFAULT_OUTLINE_OPACITY,
		size: outline.size ?? DEFAULT_OUTLINE_SIZE
	};
}

export function compileLayerFeatures(features: Feature[]): GeoJsonFeature[] {
	const geoJsonLayerFeatures: GeoJsonFeature[] = [];
	features.forEach((feature) => {
		switch (feature.type) {
			case 'point':
				geoJsonLayerFeatures.push({
					type: 'Feature',
					id: feature.id,
					geometry: {
						type: 'Point',
						coordinates: feature.loc
					}
				});
				break;
			case 'line':
				geoJsonLayerFeatures.push({
					type: 'Feature',
					id: feature.id,
					geometry: {
						type: 'LineString',
						coordinates: feature.line
					}
				});
				break;
			case 'route':
				const routeSegments: [number, number][] = [];
				feature.edges.forEach((edge) => {
					if (edge.type == 'string') {
						edge.line.forEach((coords) => {
							routeSegments.push(coords);
						});
					} else if (edge.type == 'snapped') {
						if (edge.polyline) {
							polyline
								.decode(edge.polyline, 6)
								.map((coords) => [coords[1], coords[0]])
								.forEach((coords) => {
									routeSegments.push(coords);
								});
						}
					}
				});
				geoJsonLayerFeatures.push({
					type: 'Feature',
					id: feature.id,
					geometry: {
						type: 'LineString',
						coordinates: routeSegments
					}
				});
				break;
			case 'poly':
				geoJsonLayerFeatures.push({
					type: 'Feature',
					id: feature.id,
					geometry: {
						type: 'Polygon',
						coordinates: [closePoly(feature.incl), ...feature.excl.map(closePoly)]
					}
				});
				break;
		}
	});
	return geoJsonLayerFeatures;
}

function closePoly(poly: [number, number][]): [number, number][] {
	if (poly.length < 3) return [];

	const [flon, flat] = poly[0];
	const [llon, llat] = poly[poly.length - 1];

	if (flon === llon && flat === llat) return poly;

	return [...poly, [flon, flat]];
}

export function parseMapContent(string: string): MapContent | undefined {
	let content;
	try {
		content = JSON.parse(string);
	} catch (e) {
		return;
	}

	if (!isMapContentValid(content)) return;
	return content;
}

export function isMapContentValid(content: MapContent): boolean {
	if (content?.version != 1) return false;
	if (!content?.layers) return false;
	if (content?.bounding.length < 3) return false;
	if (!Array.isArray(content.layers)) return false;
	if (content.layers.some((layer) => !isLayerValid(layer))) return false;
	return true;
}

function isLayerValid(layer: Layer): boolean {
	if (!layer.features) return false;
	if (!Array.isArray(layer.features)) return false;
	if (layer.features.some((feature) => !isFeatureValid(feature))) return false;
	return true;
}

function isFeatureValid(feature: Feature): boolean {
	switch (feature.type) {
		case 'point':
			return isPointFeatureValid(feature);
		case 'line':
			return isLineFeatureValid(feature);
		case 'route':
			return isRouteFeatureValid(feature);
		case 'poly':
			return isPolyFeatureValid(feature);
		default:
			return false;
	}
}

function isPointFeatureValid(feature: PointFeature): boolean {
	if (!Array.isArray(feature.loc)) return false;
	if (feature.loc.length != 2) return false;
	return true;
}

function isLineFeatureValid(feature: LineFeature): boolean {
	if (!Array.isArray(feature.line)) return false;
	if (feature.line.length < 2) return false;
	if (feature.line.some((coords) => !Array.isArray(coords))) return false;
	if (feature.line.some((coords) => coords.length != 2)) return false;
	return true;
}

function isRouteFeatureValid(feature: RouteFeature): boolean {
	if (!Array.isArray(feature.edges)) return false;
	if (feature.edges.some((edge) => !isRouteEdgeValid(edge))) return false;
	return true;
}

function isRouteEdgeValid(edge: RouteLineStringEdge | RouteSnappedEdge): boolean {
	switch (edge.type) {
		case 'string':
			return isRouteLineStringEdgeValid(edge);
		case 'snapped':
			return isRouteSnappedEdgeValid(edge);
		default:
			return false;
	}
}

function isRouteLineStringEdgeValid(edge: RouteLineStringEdge): boolean {
	if (!Array.isArray(edge.line)) return false;
	if (edge.line.length < 2) return false;
	if (edge.line.some((coords) => !Array.isArray(coords))) return false;
	if (edge.line.some((coords) => coords.length != 2)) return false;
	return true;
}

function isRouteSnappedEdgeValid(edge: RouteSnappedEdge): boolean {
	if (!Array.isArray(edge.waypoints)) return false;
	if (edge.waypoints.length < 2) return false;
	if (edge.waypoints.some((coords) => !Array.isArray(coords))) return false;
	if (edge.waypoints.some((coords) => coords.length != 2)) return false;
	return true;
}

function isPolyFeatureValid(feature: PolyFeature): boolean {
	if (!Array.isArray(feature.incl)) return false;
	if (feature.incl.length < 3) return false;
	if (feature.incl.some((coords) => !Array.isArray(coords))) return false;
	if (feature.incl.some((coords) => coords.length != 2)) return false;
	if (!Array.isArray(feature.excl)) return false;
	if (feature.excl.some((poly) => !Array.isArray(poly))) return false;
	if (feature.excl.some((poly) => poly.some((coords) => !Array.isArray(coords)))) return false;
	if (feature.excl.some((poly) => poly.some((coords) => coords.length != 2))) return false;
	return true;
}
