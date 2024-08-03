<!-- Intermodal, transportation information aggregator
    Copyright (C) 2024  Cláudio Pereira

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>. -->
<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import maplibre from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { tileStyle } from '$lib/settings';

	const dispatch = createEventDispatcher();

	export let setsUserRegion = true;
	export let requestsConfirmation = true;
	export let compact = false;

	export let regions = [];

	let map;
	let mapElem;
	let regionConfirmationModal;
	let mapGeolocateControl;

	let mapLoaded = false;

	let hoveredRegionId = null;
	let explicitRegionChange = false;

	const DEFAULT_BOUNDS = [
		[-11, 36.5],
		[-5.5, 42.35]
	];

	const pendingRegionId = writable();

	const pendingRegion = derived(pendingRegionId, ($pendingRegionId) => {
		if (!$pendingRegionId) return;
		return regions.find((r) => r.id == $pendingRegionId);
	});

	pendingRegion.subscribe((region) => {
		if (!region) return;

		regionConfirmationModal.showModal();
	});

	async function confirmPendingRegion() {
		if (setsUserRegion) {
			await setRegion($pendingRegionId);
		}
		dispatch('select', { id: $pendingRegionId });
		explicitRegionChange = false;
		$pendingRegionId = null;
	}

	function drawRegions() {
		if (!mapLoaded) return;

		map.getSource('regions').setData({
			type: 'FeatureCollection',
			features: regions.map((region) => ({
				type: 'Feature',
				id: region.id,
				properties: {
					id: region.id,
					name: region.name
				},
				geometry: region.geometry
			}))
		});
	}

	function addSourcesAndLayers() {
		map.addSource('regions', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		});

		map.addLayer({
			id: 'regions-fills',
			type: 'fill',
			source: 'regions',
			layout: {},
			paint: {
				'fill-color': '#627BC1',
				'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.2, 0.1]
			}
		});

		map.addLayer({
			id: 'region-borders',
			type: 'line',
			source: 'regions',
			layout: {},
			paint: {
				'line-color': '#627BC1',
				'line-width': 0.5
			}
		});
	}

	function addEvents() {
		mapGeolocateControl.on('outofmaxbounds', function () {
			alert('Aparenta estar fora de Portugal continental.');
		});

		mapGeolocateControl.on('error', function () {
			alert('Problema a obter a sua localização.');
		});

		map.on('click', 'regions-fills', (e) => {
			if (requestsConfirmation) {
				$pendingRegionId = e.features[0].id;
			} else {
				if (setsUserRegion) {
					setRegion(e.features[0].id);
				}
				dispatch('select', { id: e.features[0].id });
			}
		});

		map.on('mousemove', 'regions-fills', (e) => {
			if (e.features.length > 0) {
				if (hoveredRegionId) {
					map.setFeatureState({ source: 'regions', id: hoveredRegionId }, { hover: false });
				}
				hoveredRegionId = e.features[0].id;
				map.setFeatureState({ source: 'regions', id: hoveredRegionId }, { hover: true });
			}
		});

		map.on('mouseleave', 'regions-fills', () => {
			if (hoveredRegionId) {
				map.setFeatureState({ source: 'regions', id: hoveredRegionId }, { hover: false });
			}
			hoveredRegionId = null;
		});
	}

	onMount(() => {
		map = new maplibre.Map({
			container: mapElem,
			style: tileStyle,
			minZoom: 6,
			zoom: 6.1,
			maxZoom: 11,
			// maxBounds: DEFAULT_BOUNDS,
			center: [-8.5, 39.5]
		});

		mapGeolocateControl = new maplibre.GeolocateControl({
			fitBoundsOptions: {
				maxZoom: 8.5
			}
		});
		map.addControl(new maplibre.NavigationControl(), 'top-right');
		map.addControl(mapGeolocateControl, 'top-right');

		map.on('load', () => {
			addSourcesAndLayers();
			addEvents();
			mapLoaded = true;
			drawRegions();
		});
	});

	onDestroy(() => map?.remove());
</script>

<div>
	<div
		bind:this={mapElem}
		class="w-full h-[65vh] rounded-lg relative"
		class:h-[50vh]={compact}
		class:h-[min(75vh,900px)]={!compact}
	></div>
</div>
<dialog bind:this={regionConfirmationModal} class="modal modal-bottom sm:modal-middle">
	<div class="modal-box">
		{#if setsUserRegion}
			<h3 class="font-bold text-lg">Escolher <b>{$pendingRegion?.name || ''}</b> como região?</h3>
			<p class="py-4">
				Esta definição serve para mostrar os serviços relevantes para a sua região. Pode alterar em
				qualquer momento a partir do menu.
			</p>
		{:else}
			<h3 class="font-bold text-lg">Seleccionar <b>{$pendingRegion?.name || ''}</b>?</h3>
		{/if}
		<div class="modal-action">
			<form method="dialog">
				<button class="btn btn-success" on:click={confirmPendingRegion}>Sim</button>
				<button class="btn" on:click={() => ($pendingRegionId = null)}>Não</button>
			</form>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>Fechar</button>
	</form>
</dialog>
