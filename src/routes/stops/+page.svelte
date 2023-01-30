<script>
	import { onMount, onDestroy } from 'svelte';
	import { writable, derived } from 'svelte/store';

	import { Map, NavigationControl, GeolocateControl } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { apiServer, imageRoot } from '$lib/settings.js';
	import { token, decodedToken } from '$lib/stores.js';
	import StopCheckbox from '$lib/editor/StopCheckbox.svelte';

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

	let id = null;
	let name = null;
	let short_name = null;
	let official_name = null;
	let official_id = null;
	let locality = null;
	let street = null;
	let door = null;
	let notes = null;
	let tags = [];

	const has_crossing = writable(null);
	const has_accessibility = writable(null);
	const has_abusive_parking = writable(null);
	const has_outdated_info = writable(null);
	const is_damaged = writable(null);
	const is_vandalized = writable(null);
	const has_flag = writable(null);
	const has_schedules = writable(null);
	const has_sidewalk = writable(null);
	const has_shelter = writable(null);
	const has_bench = writable(null);
	const has_trash_can = writable(null);
	const is_illumination_working = writable(null);
	const illumination_strength = writable(null);
	const illumination_position = writable(null);
	const has_illuminated_path = writable(null);
	const has_visibility_from_within = writable(null);
	const has_visibility_from_area = writable(null);
	const is_visible_from_outside = writable(null);

	const subforms = {
		geral: 'geral',
		service: 'service',
		quality: 'quality',
		accesibility: 'accessibility',
		extra: 'extra'
	};
	let currentSubform = null;

	const stopPictures = derived([selectedStop], ([$selectedStop], set) => {
		if ($selectedStop) {
			if ($decodedToken) {
				fetch(`${apiServer}/v1/stops/${$selectedStop.id}/pictures/all`, {
					headers: { authorization: `Bearer ${$token}` }
				})
					.then((r) => r.json())
					.then((pictureList) => set(pictureList));
			} else {
				fetch(`${apiServer}/v1/stops/${$selectedStop.id}/pictures`)
					.then((r) => r.json())
					.then((pictureList) => set(pictureList));
			}
		} else {
			return [];
		}
	});

	export function selectStop(stopId) {
		$selectedStop = stops[stopId];
	}

	function saveStopMeta() {
		let newMeta = {
			id: id,
			name: name,
			short_name: short_name,
			official_name: official_name,
			official_id: official_id,
			locality: locality,
			street: street,
			door: door,
			tags: tags,
			notes: !notes || notes.trim() === '' ? null : notes.trim(),

			has_crossing: $has_crossing,
			has_accessibility: $has_accessibility,
			has_abusive_parking: $has_abusive_parking,
			has_outdated_info: $has_outdated_info,
			is_damaged: $is_damaged,
			is_vandalized: $is_vandalized,
			has_flag: $has_flag,
			has_schedules: $has_schedules,
			has_sidewalk: $has_sidewalk,
			has_shelter: $has_shelter,
			has_bench: $has_bench,
			has_trash_can: $has_trash_can,
			is_illumination_working: $is_illumination_working,
			illumination_strength: $illumination_strength,
			illumination_position: $illumination_position,
			has_illuminated_path: $has_illuminated_path,
			has_visibility_from_within: $has_shelter ? $has_visibility_from_within : null,
			has_visibility_from_area: $has_visibility_from_area,
			is_visible_from_outside: $is_visible_from_outside
		};

		newMeta = Object.assign($selectedStop, newMeta);

		updateStop(newMeta);

		map.getSource('stops').setData(getStopsGeoJSON());

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

	function getStopsGeoJSON() {
		return {
			type: 'FeatureCollection',
			features: Object.values(stops).map((stop) => {
				return {
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
			})
		};
	}

	function loadStops() {
		map.addSource('stops', {
			type: 'geojson',
			data: getStopsGeoJSON(),
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
				'circle-radius': 15
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
					2,
					'rgb(255, 0, 0)',
					6,
					'rgb(255, 255, 0)',
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
			$selectedStop = stops[e.features[0].properties.stopId];
		});
	}

	selectedStop.subscribe((stop) => {
		if (stop == null) {
			return;
		}

		id = stop.id;
		name = stop.name;
		short_name = stop.short_name;
		official_name = stop.official_name;
		official_id = stop.official_id;
		locality = stop.locality;
		street = stop.street;
		door = stop.door;
		notes = stop.notes;
		tags = stop.tags;

		$has_crossing = stop.has_crossing;
		$has_accessibility = stop.has_accessibility;
		$has_abusive_parking = stop.has_abusive_parking;
		$has_outdated_info = stop.has_outdated_info;
		$is_damaged = stop.is_damaged;
		$is_vandalized = stop.is_vandalized;
		$has_flag = stop.has_flag;
		$has_schedules = stop.has_schedules;
		$has_sidewalk = stop.has_sidewalk;
		$has_shelter = stop.has_shelter;
		$has_bench = stop.has_bench;
		$has_trash_can = stop.has_trash_can;
		$is_illumination_working = stop.is_illumination_working;
		$illumination_strength = stop.illumination_strength;
		$illumination_position = stop.illumination_position;
		$has_illuminated_path = stop.has_illuminated_path;
		$has_visibility_from_within = stop.has_visibility_from_within;
		$has_visibility_from_area = stop.has_visibility_from_area;
		$is_visible_from_outside = stop.is_visible_from_outside;
	});

	has_visibility_from_within.subscribe((visibility_from_within) => {
		if (visibility_from_within) {
			$has_visibility_from_area = true;
		}
	});

	has_visibility_from_area.subscribe((visibility_from_area) => {
		if (visibility_from_area == null) {
			$has_visibility_from_within = null;
		} else if (!visibility_from_area) {
			$has_visibility_from_within = false;
		}
	});

	has_shelter.subscribe((shelter) => {
		if (shelter == null && !shelter) {
			$has_visibility_from_within = null;
		}
	});

	function addTag() {
		let entry = document.getElementById('tag-text');
		let entryValue = entry.value.trim();

		if (entryValue !== '') {
			tags.push(entryValue);
			tags = tags;
		}
		entry.value = '';
	}

	function removeTag(tag) {
		tags.splice(tags.indexOf(tag), 1);
		tags = tags;
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
	<div id="list" class="h-full overflow-y-auto w-80">
		{#if $selectedStop}
			<label class="input-group p-1">
				<span class="label-text">{$selectedStop.id}</span>
				<input
					type="text"
					value={$selectedStop.osm_name}
					class="input input-bordered w-full input-sm"
					disabled
				/>
			</label>
			<div class="form-control">
				<label class="label">
					<span class="label-text">Fotos</span>
					<input
						class="btn btn-sm btn-primary"
						type="button"
						value="+"
						on:click={() => alert('Por implementar')}
						disabled={true || !$decodedToken}
					/>
				</label>
				<div class="flex gap-2 overflow-x-scroll">
					{#if $stopPictures !== undefined && $stopPictures.length > 0}
						{#each $stopPictures as picture}
							<a target="_blank" href="{imageRoot}/ori/{picture.sha1}/{picture.original_filename}">
								<img
									src="{imageRoot}/medium/{picture.sha1}/preview"
									class="rounded-box transition-all hover:scale-150 h-16"
								/>
							</a>
						{/each}
					{/if}
				</div>
			</div>
			<div class="collapse collapse-arrow border border-base-300 bg-base-100">
				<div
					class="text-lg font-medium p-2 min-h-0 flex justify-between"
					on:click={() => {
						currentSubform = currentSubform === subforms.geral ? null : subforms.geral;
					}}
				>
					<span>Dados localização</span>
					<span class="bg-slate-200 rounded-full">10/10</span>
				</div>
				<div class={currentSubform === subforms.geral ? 'px-2 pb-2' : 'max-h-0'}>
					<div class="form-control w-full">
						<label class="input-group">
							<span class="label-text w-24">Oficial</span>
							<input
								type="text"
								bind:value={official_name}
								placeholder="Vl. Qts. R Pessoa 29"
								disabled
								class="input input-bordered w-full input-xs"
							/>
						</label>
					</div>
					<div class="form-control w-full">
						<label class="input-group">
							<span class="label-text w-24">Opr. Id</span>
							<input
								type="text"
								bind:value={official_id}
								placeholder="150000"
								disabled={!$decodedToken?.permissions?.is_admin}
								class="input input-bordered w-full input-xs"
							/>
						</label>
					</div>
					<div class="form-control w-full">
						<label class="input-group">
							<span class="label-text w-24">Nome</span>
							<input
								type="text"
								bind:value={name}
								placeholder="Vale das Quintas, Rua Pessoa, 29"
								class="input input-bordered w-full input-sm"
								disabled={!$decodedToken?.permissions?.is_admin}
							/>
						</label>
					</div>
					<div class="form-control w-full">
						<label class="input-group">
							<span class="label-text w-24">Abrev.</span>
							<input
								type="text"
								bind:value={short_name}
								placeholder="Vl. Quintas, Pessoa"
								class="input input-bordered w-full input-sm"
								disabled={!$decodedToken?.permissions?.is_admin}
							/>
						</label>
					</div>
					<div class="form-control w-full">
						<label class="input-group">
							<span class="label-text w-24">Loc.</span>
							<input
								type="text"
								bind:value={locality}
								placeholder="Vale das Quintas"
								class="input input-bordered w-full input-sm"
								disabled={!$decodedToken}
							/>
						</label>
					</div>
					<div class="form-control w-full">
						<label class="input-group">
							<span class="label-text w-24">Via</span>
							<input
								type="text"
								bind:value={street}
								placeholder="Rua Pessoa"
								class="input input-bordered w-full input-sm"
								disabled={!$decodedToken}
							/>
						</label>
					</div>
					<div class="form-control w-full">
						<label class="input-group">
							<span class="label-text w-24">Porta</span>
							<input
								type="text"
								bind:value={door}
								placeholder="29"
								class="input input-bordered w-full input-sm"
								disabled={!$decodedToken}
							/>
						</label>
					</div>
				</div>
			</div>
			<div class="collapse collapse-arrow border border-base-300 bg-base-100">
				<div
					class="text-lg font-medium p-2 min-h-0 flex justify-between"
					on:click={() => {
						currentSubform = currentSubform === subforms.service ? null : subforms.service;
					}}
				>
					<span>Serviço</span>
					<span class="bg-slate-200 rounded-full"
						>{($has_flag === null ? 0 : 1) + ($has_schedules === null ? 0 : 1)}/2</span
					>
				</div>
				<div class={currentSubform === subforms.service ? 'px-2 pb-2' : 'max-h-0'}>
					<StopCheckbox
						text="Postaletes"
						description="O poste ou abrigo da paragem tem um postalete"
						state={has_flag}
						disabled={!$decodedToken}
					/>
					<StopCheckbox
						text="Horários"
						description="A paragem tem horários atualizados"
						state={has_schedules}
						disabled={!$decodedToken}
					/>
				</div>
			</div>
			<div class="collapse collapse-arrow border border-base-300 bg-base-100">
				<div
					class="text-lg font-medium p-2 min-h-0 flex justify-between"
					on:click={() => {
						currentSubform = currentSubform === subforms.quality ? null : subforms.quality;
					}}
				>
					<span>Qualidade</span>
					<span class="bg-slate-200 rounded-full"
						>{($has_sidewalk === null ? 0 : 1) +
							($has_shelter === null ? 0 : 1) +
							($has_bench === null ? 0 : 1) +
							($has_trash_can === null ? 0 : 1)}/4</span
					>
				</div>
				<div class={currentSubform === subforms.quality ? 'px-2 pb-2' : 'max-h-0'}>
					<StopCheckbox
						text="Passeio"
						description="A paragem encontra-se fora da via de rodagem, berma ou de terreno"
						state={has_sidewalk}
						disabled={!$decodedToken}
					/>
					<StopCheckbox
						text="Abrigo"
						description="A paragem encontra-se inserida num abrigo que resguarde da chuva e do vento"
						state={has_shelter}
						disabled={!$decodedToken}
					/>
					<StopCheckbox
						text="Banco"
						description="A paragem tem bancos onde os passageiros se possam sentar"
						state={has_bench}
						disabled={!$decodedToken}
					/>
					<StopCheckbox
						text="Caixote do lixo"
						description="A paragem dispõe de um caixote do lixo a menos de 20 metros"
						state={has_trash_can}
						disabled={!$decodedToken}
					/>
				</div>
			</div>
			<div class="collapse collapse-arrow border border-base-300 bg-base-100">
				<div
					class="text-lg font-medium p-2 min-h-0 flex justify-between"
					on:click={() => {
						currentSubform =
							currentSubform === subforms.accesibility ? null : subforms.accesibility;
					}}
				>
					<span>Acessibilidade</span>
					<span class="bg-slate-200 rounded-full"
						>{($has_crossing === null ? 0 : 1) +
							($has_accessibility === null ? 0 : 1) +
							($illumination_position === null ? 0 : 1) +
							($illumination_strength === null ? 0 : 1) +
							($is_illumination_working === null ? 0 : 1) +
							($has_illuminated_path === null ? 0 : 1) +
							($has_visibility_from_area === null ? 0 : 1) +
							($has_visibility_from_within === null ? 0 : 1) +
							($is_visible_from_outside === null ? 0 : 1)}/{$has_shelter === true ? 9 : 8}</span
					>
				</div>
				<div class={currentSubform === subforms.accesibility ? 'px-2 pb-2' : 'max-h-0'}>
					<div>
						<label class="label"><span class="label-text">Acesso</span></label>
						<StopCheckbox
							text="Atravessamento de via"
							description="Existem infraestruturas ou sinalizações que permitam o atravessamento de via"
							state={has_crossing}
							disabled={!$decodedToken}
						/>
						<StopCheckbox
							text="Acesso mobilidade reduzida"
							description="A paragem dispõe de acesso para pessoas com mobilidade reduzida"
							state={has_accessibility}
							disabled={!$decodedToken}
						/>
						<label class="label"><span class="label-text">Iluminação</span></label>
						<select
							class="select select-primary max-w-xs select-xs"
							bind:value={$illumination_position}
							disabled={!$decodedToken}
						>
							<option disabled selected value={null}>Posição</option>
							<option value={0}>Indireta</option>
							<option value={10}>Directa</option>
							<option value={20}>Própria</option>
						</select>
						<select
							class="select select-primary max-w-xs select-xs"
							bind:value={$illumination_strength}
							disabled={!$decodedToken}
						>
							<option disabled selected value={null}>Intensidade</option>
							<option value={0}>Sem iluminação</option>
							<option value={1}>Fraca</option>
							<option value={3}>Moderada</option>
							<option value={5}>Forte</option>
						</select>
						<StopCheckbox
							text="Funcional"
							description="A iluminação não se encontra fundida"
							state={is_illumination_working}
							disabled={!$decodedToken}
						/>
						<StopCheckbox
							text="No acesso"
							description="O acesso para a paragem encontra-se bem iluminado todas as 24 horas"
							state={has_illuminated_path}
							disabled={!$decodedToken}
						/>
						<label class="label"><span class="label-text">Visibilidade</span></label>
						<StopCheckbox
							text="Da paragem para autocarro"
							description="Estando na paragem (+-5 metros) é possível ver autocarros atempadamente"
							state={has_visibility_from_area}
							disabled={!$decodedToken}
						/>
						{#if $has_shelter}
							<StopCheckbox
								text="Do abrigo para autocarro"
								description="Estando sentado no abrigo é possível ver autocarros atempadamente"
								state={has_visibility_from_within}
								disabled={!$decodedToken}
							/>
						{/if}
						<StopCheckbox
							text="Do autocarro para paragem"
							description="Enquanto motorista, é possível ver devidamente a paragem sem abrandar"
							state={is_visible_from_outside}
							disabled={!$decodedToken}
						/>
					</div>
				</div>
			</div>
			<div class="collapse collapse-arrow border border-base-300 bg-base-100">
				<div
					class="text-lg font-medium p-2 min-h-0 flex justify-between"
					on:click={() => {
						currentSubform = currentSubform === subforms.extra ? null : subforms.extra;
					}}
				>
					<span>Extra</span>
					<span class="bg-slate-200 rounded-full"
						>{($has_sidewalk === null ? 0 : 1) +
							($has_shelter === null ? 0 : 1) +
							($has_bench === null ? 0 : 1) +
							($has_trash_can === null ? 0 : 1)}/4</span
					>
				</div>
				<div class={currentSubform === subforms.extra ? 'px-2 pb-2' : 'max-h-0'}>
					<label class="label"><span class="label-text">Defeitos</span></label>
					<StopCheckbox
						text="Estacionamento abusivo"
						description="Alvo recorrente de estacionamento abusivo impeditivo ao bom funcionamento"
						state={has_abusive_parking}
						disabled={!$decodedToken}
					/>
					<StopCheckbox
						text="Informação obsoleta"
						description="A informação prestada na paragem (horários/postaletes) encontra-se obsoleta"
						state={has_outdated_info}
						disabled={!$decodedToken}
					/>
					<StopCheckbox
						text="Danificada"
						description="A infraestrutura encontra-se danificada (ex. banco partido)"
						state={is_damaged}
						disabled={!$decodedToken}
					/>
					<StopCheckbox
						text="Vandalizada"
						description="Existe uma quantidade substâncial de vandalismo (eg. graffitti)"
						state={is_vandalized}
						disabled={!$decodedToken}
					/>
					<div class="form-control">
						<label class="label">
							<span class="label-text">Tags</span>
						</label>
						<div class="flex flex-col gap-2">
							<div>
								<input
									id="tag-text"
									type="text"
									class="input input-bordered input-sm"
									placeholder="Creche ABC123"
									disabled={!$decodedToken}
								/>
								<input
									class="btn btn-sm btn-primary"
									type="button"
									value="+"
									on:click={addTag}
									disabled={!$decodedToken}
								/>
							</div>
							{#each tags as tag}
								<div class="badge badge-outline badge-lg">
									{tag}
									<div class="btn btn-error btn-circle btn-xs" on:click={() => removeTag(tag)}>
										✕
									</div>
								</div>
							{/each}
						</div>
					</div>
					<div class="form-control">
						<label class="label">
							<span class="label-text">Notas</span>
						</label>
						<textarea
							class="textarea textarea-bordered h-12 w-full"
							placeholder="Falta obter-se uma foto que mostre que a paragem se encontra frente a xyz"
							bind:value={notes}
							disabled={!$decodedToken}
						/>
					</div>
				</div>
			</div>
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
			on:click={saveStopMeta}
			on:keypress={saveStopMeta}
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
