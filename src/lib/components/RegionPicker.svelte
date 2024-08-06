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
	import {
		defaultMapBounds,
		defaultMapCenter,
		defaultMapZoom,
		mapMinZoom,
		tileStyle
	} from '$lib/settings';
	import { getRegions } from '$lib/api';

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
			document.cookie = `regionId=${$pendingRegionId};path=/;max-age=31536000`;
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

	onMount(async () => {
		map = new maplibre.Map({
			container: mapElem,
			style: tileStyle,
			minZoom: mapMinZoom,
			zoom: defaultMapZoom,
			maxZoom: 11,
			maxBounds: defaultMapBounds,
			center: defaultMapCenter
		});

		mapGeolocateControl = new maplibre.GeolocateControl({
			fitBoundsOptions: {
				maxZoom: 8.5
			}
		});
		map.addControl(new maplibre.NavigationControl(), 'top-right');
		map.addControl(mapGeolocateControl, 'top-right');

		if (regions.length == 0) {
			await getRegions({
				onSuccess: (data) => {
					regions = data;
					drawRegions();
				},
				toJson: true
			});
		}

		map.on('load', () => {
			addSourcesAndLayers();
			addEvents();
			mapLoaded = true;
			drawRegions();
		});
	});

	onDestroy(() => map?.remove());
</script>

<div
	bind:this={mapElem}
	class="w-full h-[65vh] rounded-lg relative"
	class:h-[50vh]={compact}
	class:h-[min(75vh,900px)]={!compact}
></div>
<dialog bind:this={regionConfirmationModal} class="modal modal-bottom sm:modal-middle">
	<div class="modal-box">
		{#if setsUserRegion}
			<h3 class="font-bold text-lg">Escolher <b>{$pendingRegion?.name || ''}</b> como região?</h3>
			<p class="py-4">Esta definição configura atalhos para esta região na navegação.</p>
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
