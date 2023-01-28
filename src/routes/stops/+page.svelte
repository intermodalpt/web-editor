<script>
	import { onMount, onDestroy } from 'svelte';
	import { writable } from 'svelte/store';

	import { Map, NavigationControl, GeolocateControl } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { apiServer, imageRoot } from '$lib/settings.js';
	import { token, decodedToken } from '$lib/stores.js';
	import StopForm from '$lib/editor/StopForm.svelte';

	/** @type {import('./$types').PageData} */
	export let data;
	const stops = data.stops;
	const pictures = data.pictures;

	let map;
	let selectedStop = writable(undefined);
	let previewedPic = undefined;

	let filterOnlyNoName = false;
	let filterOnlyNoOfficialName = false;
	let filterOnlyNoOSM = false;
	let filterOnlyNoAttrs = false;
	let filterOnlyNoPics = false;

	export function selectStop(stopId) {
		$selectedStop = stops[stopId];
	}

	function saveStopMeta(e) {
		let newMeta = Object.assign($selectedStop, e.detail);

		updateStop(newMeta);

		$selectedStop = null;
	}

	function updateStop(stop) {
		let request;
		const headers = {
			'Content-Type': 'application/json',
			authorization: `Bearer ${$token}`
		};
		if ($decodedToken?.permissions.is_admin) {
			request = fetch(`${apiServer}/v1/stops/update/${stop.id}`, {
				method: 'PATCH',
				headers: headers,
				body: JSON.stringify(stop)
			});
		} else {
			let comment = null;
			if (
				confirm(
					'A sua alteração será aplicada após uma revisão. Deseja deixar algum comentário para o revisor?'
				)
			) {
				comment = prompt('Insira o seu comentário');
			}

			request = fetch(`${apiServer}/v1/contrib/stops/update/${stop.id}`, {
				method: 'POST',
				headers: headers,
				body: JSON.stringify({ contribution: stop, comment: comment })
			});
		}
		request
			.then((r) => {
				if (r.ok) {
					Object.assign(stops[stop.id], stop);
				} else {
					alert('Error updating');
				}
			})
			.catch(() => {
				alert('Error requestion update');
			});
	}

	function stopScore(stop) {
		let score = 10.0;

		// 2 points here
		score -= stop.has_flag === true || stop.has_flag === false ? 0.0 : 0.5;
		score -= stop.has_schedules === true || stop.has_schedules === false ? 0.0 : 0.2;
		score -= stop.has_sidewalk === true || stop.has_sidewalk === false ? 0.0 : 0.2;
		score -= stop.has_shelter === true || stop.has_shelter === false ? 0.0 : 0.5;
		score -= stop.has_bench === true || stop.has_bench === false ? 0.0 : 0.3;
		score -= stop.has_trash_can === true || stop.has_trash_can === false ? 0.0 : 0.3;

		// 0.9 point
		score -= stop.has_abusive_parking === true || stop.has_abusive_parking === false ? 0.0 : 0.2;
		score -= stop.has_outdated_info === true || stop.has_outdated_info === false ? 0.0 : 0.2;
		score -= stop.is_damaged === true || stop.is_damaged === false ? 0.0 : 0.3;
		score -= stop.is_vandalized === true || stop.is_vandalized === false ? 0.0 : 0.2;

		// 0.8 point
		score -= stop.has_crossing === true || stop.has_crossing === false ? 0.0 : 0.2;
		score -= stop.has_accessibility === true || stop.has_accessibility === false ? 0.0 : 0.2;
		score -= stop.is_illuminated === true || stop.is_illuminated === false ? 0.0 : 0.2;
		score -= stop.has_illuminated_path === true || stop.has_illuminated_path === false ? 0.0 : 0.2;

		// 0.8 point here
		score -=
			stop.has_visibility_from_area === true || stop.has_visibility_from_area === false ? 0.0 : 0.3;
		score -=
			stop.has_visibility_from_within === true || stop.has_visibility_from_within === false
				? 0.0
				: 0.2;
		score -=
			stop.is_visible_from_outside === true || stop.is_visible_from_outside === false ? 0.0 : 0.3;

		// 3 points here
		score -= stop.name != null ? 0.0 : 1.5;
		score -= stop.official_name != null ? 0.0 : 0.7;
		// score -= stop.code  != null ? 0.0 : 0.1;
		score -= stop.abbr != null ? 0.0 : 0.3;
		score -= stop.locality != null ? 0.0 : 0.2;
		score -= stop.street != null ? 0.0 : 0.2;
		// score -= stop.door  != null ? 0.0 : 0.0;

		return score;
	}

	function loadStops() {
		let features = [];

		Object.values(stops).forEach((stop) => {
			// let marker = createStopMarker(stop);
			let feature = {
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: [stop.lon, stop.lat]
				},
				properties: {
					stopId: stop.id,
					score: Math.round(stopScore(stop))
				}
			};
			features.push(feature);

			// if (stop.source === 'osm') {
			// 	if (filterOnlyNoName && stop.name) {
			// 		return;
			// 	}

			// 	if (filterOnlyNoOfficialName && stop.official_name) {
			// 		return;
			// 	}

			// 	if (filterOnlyNoOSM && stop.osm_name) {
			// 		return;
			// 	}

			// 	if (filterOnlyNoAttrs && stop.locality && stop.street) {
			// 		return;
			// 	}

			// 	if (filterOnlyNoPics && stop.locality && stop.street) {
			// 		return;
			// 	}
			// 	// marker.addTo(map);
			// 	// osmMarkers.push(marker);
			// } else {
			// 	otherMarkers.push(marker);
			// }
		});

		let geojson = {
			type: 'FeatureCollection',
			features: features
		};
		map.addSource('stops', {
			type: 'geojson',
			data: geojson,
			// cluster: true,
			clusterRadius: 40,
			clusterMinPoints: 3
		});

		map.addLayer({
			id: 'clusters',
			type: 'circle',
			source: 'stops',
			filter: ['has', 'point_count'],
			paint: {
				'circle-color': '#aaaaaa',
				'circle-radius': 15,
			}
		});

		map.addLayer({
			id: 'cluster-count',
			type: 'symbol',
			source: 'stops',
			filter: ['has', 'point_count'],
			layout: {
				'text-field': ['get', 'point_count_abbreviated'],
				'text-font': ['Metropolis Regular', 'Noto Sans Regular'],
				'text-size': 12
			}
		});

		map.addLayer({
			id: 'unclustered-point',
			type: 'circle',
			source: 'stops',
			filter: ['!', ['has', 'point_count']],
			paint: {
				'circle-color': [
					'interpolate',
					['linear'],
					['get', 'score'],
					0,
					'rgb(255, 0, 0)',
					10,
					'rgb(0, 255, 0)'
				],
				'circle-radius': 8,
				'circle-stroke-width': 1,
				'circle-stroke-color': '#fff'
			}
		});

		// map.addLayer({
		// 	id: 'unclustered-point-score',
		// 	type: 'symbol',
		// 	source: 'stops',
		// 	filter: ['!', ['has', 'point_count']],
		// 	paint: {
		// 		'text-color': 'black'
		// 	},
		// 	layout: {
		// 		'text-field': ['get', 'score'],
		// 		'text-font': ['Metropolis Regular', 'Noto Sans Regular'],
		// 		'text-size': 12
		// 	}
		// });

		map.on('mouseenter', 'unclustered-point', () => {
			map.getCanvas().style.cursor = 'pointer';
		});
		map.on('mouseleave', 'unclustered-point', () => {
			map.getCanvas().style.cursor = '';
		});
		map.on('click', 'unclustered-point', (e) => {
			$selectedStop = stops[e.features[0].properties.stopId]
		});
	}

	// function openFilterPicker() {
	// 	document.getElementById('filter-picker').checked = true;
	// }

	// function applyFilters() {
	// 	document.getElementById('filter-picker').checked = false;
	// 	// TODO ask for a redraw
	// 	// loadStops();
	// }

	onMount(() => {
		map = new Map({
			container: 'map',
			style: 'https://tiles.intermodal.pt/styles/positron/style.json',
			center: [-9.0, 38.605],
			zoom: 11,
			minZoom: 8,
			maxZoom: 20,
			maxBounds: [
				[-10.0, 38.3],
				[-8.0, 39.35]
			]
		});

		map.addControl(new NavigationControl());

		map.addControl(
			new GeolocateControl({
				positionOptions: {
					enableHighAccuracy: true
				},
				showUserHeading: true,
				trackUserLocation: true
			})
		);

		map.on('load', function () {
			loadStops();
		});
	});

	onDestroy(() => {
		map.remove();
	});
</script>

<svelte:head>
	<title>Intermodal - Paragens</title>
	<meta name="description" content="Dados de paragens do Intermodal" />
</svelte:head>

<div id="grid-container" class="grid grid-cols-2 h-full">
	<div id="map" class="h-full cursor-crosshair" />
	<div id="list">
		{#if $selectedStop}
			<StopForm stop={selectedStop} on:save={saveStopMeta} />
		{:else}
			<p>Escolha uma paragem.</p>
		{/if}
	</div>
	<div id="actions" class="flex gap-2 justify-end">
		<a class="btn" href="/instructions#edit-stops">Instruções</a>
		<!-- <input
			type="button"
			class="input input-info"
			value="Filtros"
			on:click={openFilterPicker}
			on:keypress={openFilterPicker}
		/> -->
		<input
			type="button"
			class="btn btn-primary float-right"
			disabled={!$decodedToken}
			value="Guardar"
		/>
	</div>
</div>

{#if previewedPic}
	<input type="checkbox" id="pic-preview" class="modal-toggle" checked />
	<div class="modal">
		<div class="modal-box w-11/12 max-w-5xl">
			<a
				target="_blank"
				href="{imageRoot}/ori/{previewedPic.sha1}/{previewedPic.original_filename}"
			>
				<img src="{imageRoot}/medium/{previewedPic.sha1}/preview" class="rounded-box w-full" />
			</a>
			<div class="modal-action">
				<label
					for="pic-preview"
					class="btn"
					on:click={() => {
						previewedPic = undefined;
					}}>Close</label
				>
			</div>
		</div>
	</div>
{/if}

<input type="checkbox" id="filter-picker" class="modal-toggle" />
<div class="modal">
	<div class="modal-box">
		<h3 class="font-bold text-lg">Filtros</h3>
		<p class="py-4 flex flex-col">
			<label>
				<input type="checkbox" class="mr-2" bind:value={filterOnlyNoName} />Só sem nome (nosso)
			</label>
			<label>
				<input type="checkbox" class="mr-2" bind:value={filterOnlyNoOfficialName} />Só sem nome
				oficial
			</label>
			<label>
				<input type="checkbox" class="mr-2" bind:value={filterOnlyNoOSM} />Só sem nome osm
			</label>
			<label>
				<input type="checkbox" class="mr-2" bind:value={filterOnlyNoAttrs} />Só com atributos em
				falta
			</label>
			<label>
				<input type="checkbox" class="mr-2" bind:value={filterOnlyNoPics} />Só sem fotos
			</label>
		</p>
		<div class="modal-action">
			<!-- <label class="btn" on:mouseup={applyFilters}>Aplicar</label> -->
		</div>
	</div>
</div>

<style>
	#map {
		border-top-left-radius: 12px;
		border-bottom-left-radius: 12px;
		cursor: crosshair !important;
		grid-area: map;
	}

	#list {
		grid-area: list;
	}

	#actions {
		grid-area: actions;
	}

	#grid-container {
		display: grid;
		grid-template-areas:
			'map list'
			'actions actions';
		grid-template-columns: 1fr auto;
		grid-template-rows: minmax(300px, 85vh) auto;
	}
</style>
