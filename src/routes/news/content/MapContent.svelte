<script>
	import { onDestroy, onMount } from 'svelte';
	import { Map } from 'maplibre-gl?client';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { tileStyle } from '$lib/settings';
	import { isValidGeoJson } from './utils.js';

	export let data;

	let map;
	let mapElem;
	let mapLoaded = false;
	let validGeoJson = false;

	let geoJsonText = JSON.stringify(data.geojson, null, 2);

	const tabs = {
		map: 1,
		geojson: 2,
		hybrid: 3
	};
	let tab = tabs.map;

	function redraw() {
		if (!mapLoaded || !map) return;

		try {
			map
				.getSource('geojson')
				.setData(validGeoJson ? data.geojson : { type: 'FeatureCollection', features: [] });
			console.log('redraw');
		} catch (e) {
			console.error(e);
		}
	}

	function textChange(e) {
		geoJsonText = e.target.value;

		try {
			const parsed = JSON.parse(geoJsonText);
			data.geojson = parsed;
			validGeoJson = isValidGeoJson(parsed);
		} catch (e) {
			data.geojson = null;
			validGeoJson = false;
		}

		data = data;
		redraw();
	}

	onMount(() => {
		map = new Map({
			container: mapElem,
			style: tileStyle,
			center: [data.lon, data.lat],
			zoom: data.zoom
		});

		map.on('move', () => {
			data.lon = map.getCenter().lng;
			data.lat = map.getCenter().lat;
			data.zoom = map.getZoom();
			data = data;
		});

		map.on('load', function () {
			map.addSource('geojson', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: []
				}
			});
			map.addLayer({
				id: 'geojson-points',
				type: 'circle',
				source: 'geojson',
				filter: ['==', '$type', 'Point'], // Filter only Point features
				paint: {
					'circle-color': ['get', 'color'],
					'circle-radius': 6
				}
			});
			map.addLayer({
				id: 'geojson-lines',
				type: 'line',
				source: 'geojson',
				filter: ['==', '$type', 'LineString'], // Filter only Point features
				paint: {
					'line-color': ['get', 'color'],
					'line-width': 2
				}
			});

			mapLoaded = true;
			redraw();
		});
	});

	onDestroy(() => {
		if (map) {
			map.remove();
		}
	});
</script>

<div role="tablist" class="tabs tabs-boxed">
	<button
		role="tab"
		class="tab"
		class:tab-active={tab == tabs.map}
		on:click={() => (tab = tabs.map)}>Map</button
	>
	<button
		role="tab"
		class="tab"
		class:tab-active={tab == tabs.geojson}
		on:click={() => (tab = tabs.geojson)}>GeoJSON</button
	>
	<button
		role="tab"
		class="tab"
		class:tab-active={tab == tabs.hybrid}
		on:click={() => (tab = tabs.hybrid)}>Lado-a-Lado</button
	>
</div>
<div class="flex gap-1 h-96">
	<div bind:this={mapElem} class="w-96 h-96" class:hidden={tab == tabs.geojson}></div>
	<div class="grow flex flex-col">
		<div class="flex gap-2">
			<div class="form-control">
				<label class="input-group">
					<span class="label-text">Zoom</span>
					<input
						type="numeric"
						disabled
						class="input input-bordered input-xs w-20"
						class:input-error={data.zoom < 1 || data.zoom > 22}
						bind:value={data.zoom}
					/>
				</label>
			</div>
			<div class="form-control">
				<label class="input-group">
					<span class="label-text">Lon</span>
					<input
						type="numeric"
						class="input input-bordered input-xs w-20"
						disabled
						class:input-error={data.lon < -180 || data.lon > 180}
						bind:value={data.lon}
					/>
				</label>
			</div>
			<div class="form-control">
				<label class="input-group">
					<span class="label-text">Lat</span>
					<input
						type="numeric"
						class="input input-bordered input-xs w-20"
						class:input-error={data.lat < -90 || data.lat > 90}
						disabled
						bind:value={data.lat}
					/>
				</label>
			</div>
		</div>
		<textarea
			class="input input-bordered grow w-full"
			class:border-error={!validGeoJson}
			on:change={textChange}
		></textarea>
	</div>
</div>
