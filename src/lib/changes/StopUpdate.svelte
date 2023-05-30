<script>
	import { Map, Marker } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { listDifferences, getNearestStops } from '$lib/utils.js';
	import { onDestroy } from 'svelte';
	import { derived } from 'svelte/store';
	import { tick } from 'svelte';
	import FlagsWidget from '$lib/instructions/widgets/Flags.svelte';
	import SchedulesWidget from '$lib/instructions/widgets/Schedules.svelte';
	import AdvertisementQtySelector from '$lib/changes/selectors/AdvertisementQtySelector.svelte';
	import IlluminationPositionSelector from '$lib/changes/selectors/IlluminationPositionSelector.svelte';
	import IlluminationStrengthSelector from '$lib/changes/selectors/IlluminationStrengthSelector.svelte';
	import ParkingAreaAccessImpairmentSelector from '$lib/changes/selectors/ParkingAreaAccessImpairmentSelector.svelte';
	import ParkingLocalAccessImpairmentSelector from '$lib/changes/selectors/ParkingLocalAccessImpairmentSelector.svelte';
	import ParkingVisibilityImpairmentSelector from '$lib/changes/selectors/ParkingVisibilityImpairmentSelector.svelte';

	export let change;

	let expand = false;
	let loadTimestamp = Date.now();
	const mapId = 'map-' + loadTimestamp;
	let mapElem;

	$: diffs = listDifferences(change.original, change.patch);

	function loadMap() {
		const map = L.map(mapElem, {
			contextmenu: true,
			minZoom: 10,
			maxZoom: 20,
			zoomControl: false,
			closePopupOnClick: false,
			maxBounds: new L.LatLngBounds(new L.LatLng(38.3, -10.0), new L.LatLng(39.35, -8.0)),
			maxBoundsViscosity: 1.0
		}).setView([change.original.lat, change.original.lon], 18);

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution: '© OpenStreetMap e contribuidores'
		}).addTo(map);

		let icon = L.divIcon({
			className:
				'rounded-full bg-accent-content border-2 text-accent border-accent text-xl font-mono font-bold !flex justify-center items-center',
			iconSize: [16, 16],
			tooltipAnchor: [16, 0]
		});

		L.marker([change.original.lat, change.original.lon], { icon: icon }).addTo(map);

		let othersIcon = L.divIcon({
			className:
				'rounded-full bg-primary-content border-2 border-primary text-xl !flex justify-center items-center',
			iconSize: [16, 16],
			tooltipAnchor: [16, 0]
		});

		getNearestStops(Object.values($stops), change.original.lat, change.original.lon, 30)
			.slice(1)
			.forEach((stop) => {
				L.marker([stop.lat, stop.lon], { icon: othersIcon }).addTo(map);
			});
	}
</script>

<h3 class="font-bold">
	Alteração paragem {change.original.id}; {change.original.name || change.original.official_name}
</h3>

{#if expand}
	<div class="grid grid-cols-2">
		<ul>
			{#each diffs as diff}
				<li>
					{diff.key}:
					{#if diff.key === 'flags'}
						<!-- <FlagsWidget flagsData={diff.new} /> -->
					{:else if diff.key === 'schedules'}
						<!-- <SchedulesWidget schedulesData={diff.new} /> -->
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
			{/each}
		</ul>
		<div bind:this={mapElem} class="h-96" />
	</div>
{:else}
	<span
		class="link"
		on:mouseup={async () => {
			expand = true;
			await tick();
			loadMap();
		}}>Mostrar</span
	>
{/if}
