import polyline from '@mapbox/polyline';

const DEFAULT_LINE_SIZE = 2;
const DEFAULT_LINE_COLOR = '#ffffff';
const DEFAULT_LINE_OPACITY = 1;
const DEFAULT_POINT_COLOR = '#000000';
const DEFAULT_POINT_SIZE = 3;
const DEFAULT_POINT_OPACITY = 1;
const DEFAULT_POLY_COLOR = '#000000';
const DEFAULT_POLY_OPACITY = 1;

const DEFAULT_OUTLINE_OPACITY = 0;
const DEFAULT_OUTLINE_COLOR = '#000000';
const DEFAULT_OUTLINE_SIZE = 0;

export function completeLayerSpec(spec: LayerSpec): LayerSpec {
	return {
		points: {
			size: spec.points.size ?? DEFAULT_POINT_SIZE,
			color: spec.points.color ?? DEFAULT_POINT_COLOR,
			opacity: spec.points.opacity ?? DEFAULT_POINT_OPACITY,
			outline: spec.points.outline,
			pulse: completeOutline(spec.points.outline)
		},
		lines: {
			size: spec.lines.size ?? DEFAULT_LINE_SIZE,
			color: spec.lines.color ?? DEFAULT_LINE_COLOR,
			opacity: spec.lines.opacity ?? DEFAULT_LINE_OPACITY,
			outline: completeOutline(spec.lines.outline)
		},
		polys: {
			color: spec.polys.color ?? DEFAULT_POLY_COLOR,
			opacity: spec.polys.opacity ?? DEFAULT_POLY_OPACITY,
			outline: completeOutline(spec.polys.outline)
		},
		effects: spec.effects ?? []
	};
}

function completeOutline(outline: Outline): Outline {
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
