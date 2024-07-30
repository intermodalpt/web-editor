<script>
	import { onDestroy, onMount } from 'svelte';
	import { Map as Maplibre, NavigationControl, LngLatBounds } from 'maplibre-gl?client';
	import { tileStyle } from '$lib/settings';

	export let stops;
	export let imlStops;
	export let gtfsStops;

	let map;
	let mapEl;
	let mapLoaded = false;

	stops.subscribe(() => {
		updateData();
	});

	function stopsToFeatures(stopIds) {
		let lines = [];
		let line = [];
		stopIds.map((stopId) => {
			let stop = $stops[stopId];
			if (!stop) {
				if (line.length > 1) {
					lines.push(line);
				}
				line = [];
			} else {
				line.push([stop.lon, stop.lat]);
			}
		});
		if (line.length > 0) {
			lines.push(line);
		}

		return lines.map((line) => {
			return {
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: line
				}
			};
		});
	}

	function zoomToFeatures(features) {
		if (features.length === 0) return;

		let bounds = features.reduce((bounds, feature) => {
			return feature.geometry.coordinates.reduce((bounds, coord) => {
				return bounds.extend(coord);
			}, bounds);
		}, new LngLatBounds(features[0].geometry.coordinates[0], features[0].geometry.coordinates[0]));
		map.fitBounds(bounds, { padding: 20 });
	}

	function updateData() {
		if (!mapLoaded || !$stops) {
			return;
		}

		map.getSource('stops').setData({
			type: 'FeatureCollection',
			features: Object.values($stops).map((stop) => {
				return {
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: [stop.lon, stop.lat]
					}
				};
			})
		});

		if (imlStops) {
			let features = stopsToFeatures(imlStops);
			map.getSource('imlRoute').setData({
				type: 'FeatureCollection',
				features: features
			});
			zoomToFeatures(features);

			map.getSource('usedStops').setData({
				type: 'FeatureCollection',
				features: imlStops.map((stopId) => {
					let stop = $stops[stopId];
					return {
						type: 'Feature',
						geometry: {
							type: 'Point',
							coordinates: [stop.lon, stop.lat]
						},
						properties: {
							label: `${stop.id} - ${stop.name}`
						}
					};
				})
			});
		}

		if (gtfsStops) {
			let features = stopsToFeatures(gtfsStops);
			map.getSource('gtfsRoute').setData({
				type: 'FeatureCollection',
				features: features
			});
			if (!imlStops) {
				zoomToFeatures(features);

				map.getSource('usedStops').setData({
					type: 'FeatureCollection',
					features: gtfsStops
						.filter((stopId) => stopId)
						.map((stopId) => {
							let stop = $stops[stopId];
							return {
								type: 'Feature',
								geometry: {
									type: 'Point',
									coordinates: [stop.lon, stop.lat]
								},
								properties: {
									label: `${stop.id} - ${stop.name}`
								}
							};
						})
				});
			}
		}
	}

	function addSourcesAndLayers() {
		map.addSource('gtfsRoute', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});
		map.addLayer({
			id: 'gtfsRoute',
			type: 'line',
			source: 'gtfsRoute',
			paint: {
				'line-color': 'rgb(230, 200, 150)',
				'line-width': 2
			}
		});

		map.addSource('imlRoute', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});
		map.addLayer({
			id: 'imlRoute',
			type: 'line',
			source: 'imlRoute',
			paint: {
				'line-color': 'rgb(150, 150, 230)',
				'line-width': 2
			}
		});

		map.addSource('usedStops', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});

		map.addLayer({
			id: 'usedStops',
			type: 'symbol',
			source: 'usedStops',
			layout: {
				'text-field': ['get', 'label'],
				'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
				'text-size': 8,
				'text-offset': [2, 0],
				'text-anchor': 'left',
				'text-max-width': 150,
				'text-allow-overlap': false
			},
			minzoom: 11
		});

		map.addSource('stops', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});

		map.addLayer({
			id: 'stops',
			type: 'circle',
			source: 'stops',
			paint: {
				'circle-color': 'rgb(50, 150, 220)',
				'circle-radius': {
					base: 1.2,
					stops: [
						[0, 0],
						[11, 1],
						[17, 4],
						[18, 10]
					]
				},
				'circle-stroke-width': {
					stops: [
						[0, 0.1],
						[14, 0.5],
						[18, 1]
					]
				},
				'circle-stroke-color': '#fff'
			}
		});
	}

	onMount(() => {
		map = new Maplibre({
			container: mapEl,
			style: tileStyle,
			center: [-9.0, 38.65]
		});

		map.addControl(new NavigationControl(), 'top-right');

		map.on('load', function () {
			addSourcesAndLayers();

			mapLoaded = true;
			updateData();
		});
	});

	onDestroy(() => {
		mapLoaded = false;
		map.remove();
	});
</script>

<div bind:this={mapEl} class="w-full h-[25em]" />
