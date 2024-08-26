<script>
	import maplibre from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { listDifferences, getNearestStops } from '$lib/utils';
	import { defaultMapBounds, mapMinZoom, tileStyle } from '$lib/settings';
	import { onMount, onDestroy, tick } from 'svelte';
	import { derived } from 'svelte/store';
	import Icon from '$lib/components/Icon.svelte';
	import FlagsWidget from '$lib/instructions/widgets/Flags.svelte';
	import SchedulesWidget from '$lib/instructions/widgets/Schedules.svelte';
	import AdvertisementQtySelector from '$lib/changes/selectors/AdvertisementQtySelector.svelte';
	import IlluminationPositionSelector from '$lib/changes/selectors/IlluminationPositionSelector.svelte';
	import IlluminationStrengthSelector from '$lib/changes/selectors/IlluminationStrengthSelector.svelte';
	import ParkingAreaAccessImpairmentSelector from '$lib/changes/selectors/ParkingAreaAccessImpairmentSelector.svelte';
	import ParkingLocalAccessImpairmentSelector from '$lib/changes/selectors/ParkingLocalAccessImpairmentSelector.svelte';
	import ParkingVisibilityImpairmentSelector from '$lib/changes/selectors/ParkingVisibilityImpairmentSelector.svelte';

	export let change;
	export let stops;
	export let isEvaluation = false;
	export let ignoredKeys;

	let mapElem;
	let map;
	let mapLoaded = false;

	let originalStop;

	const problematic_fields = ['has_waiting_times', 'has_cover', 'illumination_strength'];

	const nearestStops = derived(stops, ($stops) => {
		if (!$stops) return [];
		originalStop = $stops[change.original.id];

		return originalStop
			? getNearestStops(Object.values($stops), originalStop.lat, originalStop.lon, 30)
			: getNearestStops(Object.values($stops), change.original.lat, change.original.lon, 30);
	});

	const updateMapSource = (stops) => {
		if (!mapLoaded) return;
		map.getSource('stops').setData({
			type: 'FeatureCollection',
			features: stops.map((stop) => {
				return {
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: [stop.lon, stop.lat]
					},
					properties: {}
				};
			})
		});
	};

	nearestStops.subscribe((stops) => {
		if (!mapLoaded) return;
		updateMapSource(stops);
	});

	const currentStop = $stops && $stops[change.original.id];

	$: diffs = listDifferences(change.original, change.patch);
	let currentDiffs = currentStop
		? listDifferences(currentStop, change.original).filter((diff) => {
				return diff.key != 'lat' && diff.key != 'lon';
			})
		: [];

	onMount(() => {
		map = new maplibre.Map({
			container: mapElem,
			style: tileStyle,
			center: [change.original.lon, change.original.lat],
			zoom: 17,
			minZoom: mapMinZoom,
			maxZoom: 20,
			maxBounds: defaultMapBounds
		});

		new maplibre.Marker()
			.setLngLat(
				originalStop
					? [originalStop.lon, originalStop.lat]
					: [change.original.lon, change.original.lat]
			)
			.addTo(map);

		map.on('load', () => {
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
					'circle-color': '#7799ff',
					'circle-radius': 8,
					'circle-opacity': 0.5,
					'circle-stroke-width': 1,
					'circle-stroke-color': '#ffffff'
				}
			});

			mapLoaded = true;

			if ($nearestStops) {
				updateMapSource($nearestStops);
			}
		});
	});

	onDestroy(() => map?.remove());
</script>

<h3 class="font-bold">
	Alteração paragem {change.original.id}; {change.original.name}
	{originalStop ? '' : '(⚠️Apagada)'}
	<a
		class="btn btn-xs btn-info"
		rel="noreferrer"
		target="_blank"
		href={`https://www.openstreetmap.org/node/${change.original.osm_id}`}>OSM</a
	>
	<a
		class="btn btn-xs btn-info"
		rel="noreferrer"
		target="_blank"
		href={`https://www.google.com/maps/@${change.original.lat},${change.original.lon},20.00z`}
		>GMaps</a
	>
</h3>

<div class="grid grid-cols-2">
	<ul>
		{#each diffs as diff}
			{#if (ignoredKeys && !ignoredKeys.includes(diff.key)) || !isEvaluation}
				<li>
					{#if isEvaluation}
						<button
							class="btn btn-xs btn-circle btn-error btn-outline"
							on:click={() => {
								ignoredKeys.push(diff.key);
								ignoredKeys = ignoredKeys;
							}}
						>
							<Icon name="close" class="h-4 stroke-current" />
						</button>
						{#if problematic_fields.indexOf(diff.key) != -1}⚠️{/if}{/if}
					{diff.key}:
					{#if diff.key === 'flags'}
						<FlagsWidget flagsData={diff.new} />
					{:else if diff.key === 'schedules'}
						<SchedulesWidget schedulesData={diff.new} />
					{:else if diff.key === 'advertisement_qty'}
						{#if diff.original}
							<AdvertisementQtySelector val={diff.original} wrong={true} />
						{/if}
						<AdvertisementQtySelector val={diff.new} />
					{:else if diff.key === 'illumination_strength'}
						{#if diff.original}
							<IlluminationStrengthSelector val={diff.original} wrong={true} />
						{/if}
						<IlluminationStrengthSelector val={diff.new} />
					{:else if diff.key === 'illumination_position'}
						{#if diff.original}
							<IlluminationPositionSelector val={diff.original} wrong={true} />
						{/if}
						<IlluminationPositionSelector val={diff.new} />
					{:else if diff.key === 'parking_visibility_impairment'}
						{#if diff.original}
							<ParkingVisibilityImpairmentSelector val={diff.original} wrong={true} />
						{/if}
						<ParkingVisibilityImpairmentSelector val={diff.new} />
					{:else if diff.key === 'parking_local_access_impairment'}
						{#if diff.original}
							<ParkingLocalAccessImpairmentSelector val={diff.original} wrong={true} />
						{/if}
						<ParkingLocalAccessImpairmentSelector val={diff.new} />
					{:else if diff.key === 'parking_area_access_impairment'}
						{#if diff.original}
							<ParkingAreaAccessImpairmentSelector val={diff.original} wrong={true} />
						{/if}
						<ParkingAreaAccessImpairmentSelector val={diff.new} />
					{:else}
						{#if diff.original}<span class="bg-red-300">{diff.original}</span>{/if}
						<span class="bg-green-300">{diff.new}</span>
					{/if}
				</li>
			{/if}
		{/each}
	</ul>
	<div bind:this={mapElem} class="h-96" />
</div>
{#if ignoredKeys && ignoredKeys.length > 0}
	<h3 class="font-bold">Chaves ignoradas</h3>
	<div class="flex flex-wrap">
		{#each ignoredKeys as key}
			<span class="badge badge-outline badge-error"
				>{key}
				<button
					class="btn btn-error btn-circle btn-xs"
					on:click={() => {
						ignoredKeys = ignoredKeys.filter((ignored) => ignored != key);
					}}
				>
					<Icon name="close" class="h-4 stroke-current" />
				</button>
			</span>
		{/each}
	</div>
{/if}
