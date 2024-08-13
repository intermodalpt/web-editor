// ----- Stored data -----
type MapContent = {
	layers: Layer[];
	camera: {
		center: [number, number];
		zoom: number;
		bearing: number;
		pitch: number;
	};
	bounding: [number, number][];
	version: number;
};

type LayerId = string;
type Layer = {
	// The ID is editor-only and should not be uploaded
	id?: LayerId;
	name?: string;
	features: Feature[];
	spec: LayerSpec;
	z?: number;
};

type FeatureId = number;
type Feature = PointFeature | LineFeature | RouteFeature | PolyFeature;

type PointFeature = {
	// The ID is editor-only and should not be uploaded
	id?: FeatureId;
	type: 'point';
	loc: [number, number];
};

type LineFeature = {
	id?: FeatureId;
	type: 'line';
	line: [number, number][];
};

type RouteFeature = {
	id?: FeatureId;
	type: 'route';
	edges: (RouteLineStringEdge | RouteSnappedEdge)[];
};

type PolyFeature = {
	id?: FeatureId;
	type: 'poly';
	incl: [number, number][];
	excl: [number, number][][];
};

type RouteLineStringEdge = {
	type: 'string';
	line: [number, number][];
};

type RouteSnappedEdge = {
	type: 'snapped';
	waypoints: [number, number][];
	// Cached field
	polyline?: string;
};

type LayerSpec = {
	points?: PointRendering;
	lines?: LineRendering;
	polys?: PolyRendering;
	effects?: {
		blink: BlinkSettings;
	};
};

type Outline = {
	color: string;
	opacity: number;
	size: number;
};

type PointRendering = {
	size: number;
	color: string;
	opacity: number;
	outline?: Outline;
	pulse: {
		expansion: number;
		speed: number;
	};
};

type LineRendering = {
	size: number;
	color: string;
	opacity: number;
	dashArray?: number[];
	outline?: Outline;
};

type PolyRendering = {
	color: string;
	opacity: number;
	dashArray?: number[];
	outline?: Outline;
};

type BlinkSettings = {
	points: boolean;
	lines: boolean;
	polys: boolean;
};

// ----- Editor Logic Data -----

type ControlPointIdx = number;
type ControlPoint = {
	idx: ControlPointIdx;
	coords: [number, number];
	hasHandle: boolean;
};

type EditionData = {
	selected: {
		// Undefined means that no layer is selected
		layer?: Layer | null;
		// Undefined means that no feature is selected OR that the feature is being drawn
		feature?: Feature | null;
		featureLayer?: Layer | null;
		controlPoint: {
			idx: ControlPointIdx | null;
			isMoving: boolean;
		};
		// For types that have distinct segments (Route ATM)
		segmentIdx?: number | null;
	};
	drawn: {
		points: ControlPoint[];
		line: ControlPointIdx[];
		poly: ControlPointIdx[];
		edges: (LineStringEdgeEdit | SnappedEdgeEdit)[]
	};
	counters: {
		layer: number;
		feature: number;
		controlPoint: number;
	};
};

type LineStringEdgeEdit = {
	type: 'string';
	line: ControlPointIdx[];
};

type SnappedEdgeEdit = {
	type: 'snapped';
	waypoints: ControlPointIdx[];
	polyline?: string;
};

// ----- Editor Map Data -----

type DrawnLayer = {
	// Layer unique identifier
	id: number;
	// The features that are being rendered
	features: GeoJsonFeature[];
	// The rendering spec for this layer
	spec: LayerSpec;
	// The map source that this layer is based on
	source?: string;
	// The sublayers that were derived from the spec
	sublayers: string[];
	// The drawing order of this layer
	z: number;
	visible: boolean;
};

type GeoJsonFeature = {
	id: number;
	type: 'Feature';
	geometry: {
		type: string;
		coordinates: any;
	};
};
