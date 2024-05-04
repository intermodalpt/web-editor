<script>
	import { onDestroy, onMount } from 'svelte';
	import { Map } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { tileStyle } from '$lib/settings.js';

	export let data;

	let map;
	let mapElem;
	let mapLoaded = false;
	let badJson = false;

	const tabs = {
		map: 1,
		geojson: 2,
		hybrid: 3
	};
	let tab = tabs.map;

	function redraw() {
		if (!mapLoaded) return;

		let parsed;
		try {
			parsed = JSON.parse(data.geojson);
		} catch (e) {
			badJson = true;
			return;
		}

		try {
			if (map) {
				map.getSource('geojson').setData(parsed);
			}
		} catch (e) {
			console.error(e);
		}
	}

	onMount(() => {
		map = new Map({
			container: mapElem,
			style: tileStyle,
			center: [data.lon, data.lat],
			zoom: data.zoom
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
					<input type="numeric" class="input input-bordered input-xs w-20" bind:value={data.zoom} />
				</label>
			</div>
			<div class="form-control">
				<label class="input-group">
					<span class="label-text">Lon</span>
					<input type="numeric" class="input input-bordered input-xs w-20" bind:value={data.lon} />
				</label>
			</div>
			<div class="form-control">
				<label class="input-group">
					<span class="label-text">Lat</span>
					<input type="numeric" class="input input-bordered input-xs w-20" bind:value={data.lat} />
				</label>
			</div>
		</div>
		<textarea
			class="input input-bordered grow w-full"
			class:border-error={badJson}
			bind:value={data.geojson}
			on:change={redraw}
		></textarea>
	</div>
</div>
