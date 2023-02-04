<script>
	import StopCheckbox from '$lib/editor/StopCheckbox.svelte';
	import { apiServer, imageRoot } from '$lib/settings.js';
	import { decodedToken, token } from '$lib/stores.js';
	import { GeolocateControl, Map, NavigationControl } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { onDestroy, onMount } from 'svelte';
	import Select from 'svelte-select';
	import { derived, writable } from 'svelte/store';

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
	let shortName = null;
	let officialName = null;
	let officialId = null;
	let locality = null;
	let street = null;
	let door = null;

	let hasFlags = null;
	let flagsData = null;
	let hasSchedules = null;
	let schedulesData = null;
	let serviceCheckDate = null;
	let infrastructureCheckDate = null;

	const hasCrossing = writable(null);
	const hasFlatAccess = writable(null);
	const hasWideAccess = writable(null);
	const hasTactileAccess = writable(null);
	const hasSidewalk = writable(null);
	const hasSidewalkedPath = writable(null);
	const hasShelter = writable(null);
	const hasCover = writable(null);
	const hasBench = writable(null);
	const hasTrashCan = writable(null);
	let advertisements = null;
	const hasWaitingTimes = writable(null);
	const hasTicketSeller = writable(null);
	const hasCostumerSupport = writable(null);
	let illuminationStrength = null;
	let illuminationPosition = null;

	const hasIlluminatedPath = writable(null);
	const hasVisibilityFromWithin = writable(null);
	const hasVisibilityFromArea = writable(null);
	const isVisibleFromOutside = writable(null);
	let parkingVisibilityImpairment = null;
	let parkingLocalAccessImpairment = null;
	let parkingAreaAccessImpairment = null;

	let notes = null;
	let tags = [];
	let tmpIssues = [];

	let verificationLevel = 0;

	const subforms = {
		geral: 'geral',
		service: 'service',
		quality: 'quality',
		accesibility: 'accessibility',
		extra: 'extra'
	};

	let currentSubform = null;

	let selectedTmpIssue;

	const tmpIssueLabels = {
		lights_broken: 'Luz fundida',
		path_lights_broken: 'Acesso fundido',
		damage_low: 'Dano leve',
		damage_medium: 'Dano moderado',
		damage_high: 'Dano grave',
		dirty: 'Suja',
		thrash: 'Recolha lixo insuf.',
		weeds: 'Vegetação excessiva',
		obsolete: 'Info. obsoleta',
		construction_works: 'Obras'
	};

	const tmpIssuesOptions = [
		{ value: 'lights_broken', label: tmpIssueLabels['lights_broken'] },
		{ value: 'path_lights_broken', label: tmpIssueLabels['path_lights_broken'] },
		{ value: 'damage_low', label: tmpIssueLabels['damage_low'] },
		{ value: 'damage_medium', label: tmpIssueLabels['damage_medium'] },
		{ value: 'damage_high', label: tmpIssueLabels['damage_high'] },
		{ value: 'dirty', label: tmpIssueLabels['dirty'] },
		{ value: 'thrash', label: tmpIssueLabels['thrash'] },
		{ value: 'weeds', label: tmpIssueLabels['weeds'] },
		{ value: 'obsolete', label: tmpIssueLabels['obsolete'] },
		{ value: 'construction_works', label: tmpIssueLabels['construction_works'] }
	];

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

	selectedStop.subscribe((stop) => {
		if (stop == null) {
			return;
		}

		id = stop.id;
		name = stop.name || null;
		shortName = stop.short_name || null;
		officialName = stop.official_name || null;
		officialId = stop.official_id || null;
		locality = stop.locality || null;
		street = stop.street || null;
		door = stop.door || null;
		notes = stop.notes || null;
		tags = stop.tags || null;
		tmpIssues = stop.tmp_issues || [];
		if (stop.flags === undefined || stop.flags === null) {
			hasFlags = null;
		} else if (stop.flags.length === 0) {
			hasFlags = false;
		} else {
			hasFlags = true;
		}
		flagsData = stop.flags || [];

		if (stop.schedules === undefined || stop.schedules === null) {
			hasSchedules = null;
		} else if (stop.schedules.length === 0) {
			hasSchedules = false;
		} else {
			hasSchedules = true;
		}
		schedulesData = stop.schedules || [];

		$hasCrossing = stop.has_crossing || null;
		$hasSidewalk = stop.has_sidewalk || null;
		$hasSidewalkedPath = stop.has_sidewalked_path || null;
		$hasCover = stop.has_cover || null;
		$hasShelter = stop.has_shelter || null;
		$hasCover = stop.has_cover || null;
		$hasBench = stop.has_bench || null;
		$hasTrashCan = stop.has_trash_can || null;
		$hasWaitingTimes = stop.has_waiting_times || null;
		$hasTicketSeller = stop.has_ticket_seller || null;
		$hasCostumerSupport = stop.has_costumer_support || null;
		illuminationStrength = stop.illumination_strength || null;
		illuminationPosition = stop.illumination_position || null;
		$hasIlluminatedPath = stop.has_illuminated_path || null;
		$hasVisibilityFromWithin = stop.has_visibility_from_within || null;
		$hasVisibilityFromArea = stop.has_visibility_from_area || null;
		$isVisibleFromOutside = stop.is_visible_from_outside || null;
		parkingVisibilityImpairment = stop.parking_visibility_impairment || null;
		parkingLocalAccessImpairment = stop.parking_local_access_impairment || null;
		parkingAreaAccessImpairment = stop.parking_area_access_impairment || null;

		verificationLevel = stop.verification_level || 0;
	});

	hasVisibilityFromWithin.subscribe((visibility_from_within) => {
		if (visibility_from_within) {
			$hasVisibilityFromArea = true;
		}
	});

	hasVisibilityFromArea.subscribe((visibility_from_area) => {
		if (visibility_from_area == null) {
			$hasVisibilityFromWithin = null;
		} else if (!visibility_from_area) {
			$hasVisibilityFromWithin = false;
		}
	});

	hasShelter.subscribe((shelter) => {
		if (shelter == null && !shelter) {
			$hasVisibilityFromWithin = null;
		}
	});

	export function selectStop(stopId) {
		$selectedStop = stops[stopId];
	}

	function saveStopMeta() {
		let newMeta = {
			id: id,
			name: name,
			short_name: shortName,
			official_name: officialName,
			official_id: officialId,
			locality: locality,
			street: street,
			door: door,
			tags: tags,
			notes: !notes || notes.trim() === '' ? null : notes.trim(),

			flags: hasFlags ? flagsData : null,
			schedules: hasSchedules ? schedulesData : null,
			tmp_issues: tmpIssues,

			has_sidewalk: $hasSidewalk,
			has_sidewalked_path: $hasSidewalkedPath,
			has_shelter: $hasShelter,
			has_cover: $hasCover,
			has_bench: $hasBench,
			has_trash_can: $hasTrashCan,
			has_waiting_times: $hasWaitingTimes,
			has_ticket_seller: $hasTicketSeller,
			has_costumer_support: $hasCostumerSupport,
			advertisements: advertisements,

			has_crossing: $hasCrossing,
			has_flat_access: $hasFlatAccess,
			has_wide_access: $hasWideAccess,
			has_tactile_access: $hasTactileAccess,

			illumination_strength: illuminationStrength,
			illumination_position: illuminationPosition,
			has_illuminated_path: $hasIlluminatedPath,
			has_visibility_from_within: $hasShelter ? $hasVisibilityFromWithin : null,
			has_visibility_from_area: $hasVisibilityFromArea,
			is_visible_from_outside: $isVisibleFromOutside,

			parking_visibility_impairment: parkingVisibilityImpairment,
			parking_local_access_impairment: parkingLocalAccessImpairment,
			parking_area_access_impairment: parkingAreaAccessImpairment,

			service_check_date: serviceCheckDate,
			infrastructure_check_date: infrastructureCheckDate,
			verification_level: verificationLevel
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
		// score -= stop.has_flag === true || stop.has_flag === false ? 0.0 : 0.5;
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

	function addIssue() {
		if (selectedTmpIssue !== undefined && selectedTmpIssue !== null) {
			// Push the issue to the list if it's not already there
			if (tmpIssues.indexOf(selectedTmpIssue.value) === -1) {
				tmpIssues.push(selectedTmpIssue.value);
				tmpIssues = tmpIssues;
			}
		}
		selectedTmpIssue = undefined;
	}

	function addFlag() {
		flagsData.push({
			id: null,
			route_codes: []
		});
		flagsData = flagsData;
	}

	function removeFlag(i) {
		flagsData.splice(i, 1);
		flagsData = flagsData;
	}

	function addFlagRoute(i) {
		const code = prompt('Código da linha:');

		if (!code || code.trim() === '') {
			return;
		}

		const trimmedCode = code.trim();

		// Check if the route code is already in the list
		if (flagsData[i].route_codes.indexOf(trimmedCode) !== -1) {
			return;
		}

		flagsData[i].route_codes.push(code);
		flagsData[i].route_codes = flagsData[i].route_codes;
	}

	function removeFlagRoute(i, j) {
		flagsData[i].route_codes.splice(j, 1);
		flagsData[i].route_codes = flagsData[i].route_codes;
	}

	function addScheduleEntry() {
		schedulesData.push({
			code: null,
			discriminator: null,
			type: null
		});
		schedulesData = schedulesData;
	}

	function removeScheduleEntry(index) {
		schedulesData.splice(index, 1);
		schedulesData = schedulesData;
	}

	function removeIssue(tag) {
		tmpIssues.splice(tmpIssues.indexOf(tag), 1);
		tmpIssues = tmpIssues;
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
	<div id="list" class="h-full overflow-y-auto w-72 lg:w-80">
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
					class="text-lg font-medium p-2 min-h-0"
					on:click={() => {
						currentSubform = currentSubform === subforms.geral ? null : subforms.geral;
					}}
				>
					Dados localização
				</div>
				<div class={currentSubform === subforms.geral ? 'px-2 pb-2' : 'max-h-0'}>
					<div class="form-control w-full">
						<label class="input-group">
							<span class="label-text w-24">Oficial</span>
							<input
								type="text"
								bind:value={officialName}
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
								bind:value={officialId}
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
								bind:value={shortName}
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
						>{(hasFlags === null ? 0 : 1) + (hasSchedules === null ? 0 : 1)}/2</span
					>
				</div>
				<div
					class={currentSubform === subforms.service ? 'px-2 pb-2 flex flex-col gap-2' : 'max-h-0'}
				>
					<div class="rounded-lg border-base-300 border-2 py-2">
						<div class="btn-group items-center">
							<span class="px-2">Postaletes</span>
							<button
								class="btn btn-sm px-4"
								class:btn-active={hasFlags === true}
								on:click={() => (hasFlags = true)}
								on:keypress={() => (hasFlags = true)}>Sim</button
							>
							<button
								class="btn btn-sm px-6"
								class:btn-active={hasFlags === null}
								on:click={() => (hasFlags = null)}
								on:keypress={() => (hasFlags = null)}>?</button
							>
							<button
								class="btn btn-sm px-4"
								class:btn-active={hasFlags === false}
								on:click={() => (hasFlags = false)}
								on:keypress={() => (hasFlags = false)}>Não</button
							>
						</div>
						{#if hasFlags}
							{#each flagsData as flag, i}
								<table class="table table-compact w-full">
									<thead>
										<tr>
											<th class="text-xs">Id</th>
											<th class="w-full">
												<input
													type="text"
													class="w-24 input input-xs input-bordered px-0"
													bind:value={flag.id}
												/>
											</th>
											<th>
												<input
													type="button"
													class="btn btn-success btn-xs"
													value="+ linha"
													disabled={!$decodedToken}
													on:click={() => addFlagRoute(i)}
													on:keypress={() => addFlagRoute(i)}
												/>
											</th>
											<th>
												<input
													type="button"
													class="btn btn-error btn-xs"
													value="-"
													disabled={!$decodedToken}
													on:click={() => removeFlag(i)}
													on:keypress={() => removeFlag(i)}
												/>
											</th>
										</tr>
									</thead>
								</table>
								<div class="flex flex-wrap">
									{#each flag.route_codes as code, j}
										<div class="badge badge-outline badge-lg">
											{code}
											<div
												class="btn btn-error btn-circle btn-xs"
												on:click={() => removeFlagRoute(i, j)}
											>
												✕
											</div>
										</div>
									{/each}
								</div>
								<hr>
							{/each}

							<div class="flex justify-end">
								<input
									type="button"
									class="btn btn-success btn-xs"
									value="+ postalete"
									on:click={addFlag}
								/>
							</div>
						{/if}
					</div>
					<div class="rounded-lg border-base-300 border-2 py-2">
						<div class="btn-group items-center">
							<span class="px-2">Horários</span>
							<button
								class="btn btn-sm px-4"
								class:btn-active={hasSchedules === true}
								on:click={() => (hasSchedules = true)}
								on:keypress={() => (hasSchedules = true)}>Sim</button
							>
							<button
								class="btn btn-sm px-6"
								class:btn-active={hasSchedules === null}
								on:click={() => (hasSchedules = null)}
								on:keypress={() => (hasSchedules = null)}>?</button
							>
							<button
								class="btn btn-sm px-4"
								class:btn-active={hasSchedules === false}
								on:click={() => (hasSchedules = false)}
								on:keypress={() => (hasSchedules = false)}>Não</button
							>
						</div>

						{#if hasSchedules}
							<table class="table table-zebra table-compact w-full">
								<thead>
									<tr>
										<th class="text-xs">Linha</th>
										<th class="text-xs">Tipo</th>
										<th class="text-xs">Discrim.</th>
										<th>
											<input
												type="button"
												class="btn btn-success btn-xs"
												value="+"
												on:click={addScheduleEntry}
												on:kaypress={addScheduleEntry}
												disabled={!$decodedToken}
											/>
										</th>
									</tr>
								</thead>
								<tbody>
									{#each schedulesData as schedule, i}
										<tr>
											<td>
												<input
													type="text"
													class="w-10 input input-xs input-bordered px-0"
													bind:value={schedule.code}
												/>
											</td>
											<td class="p-0">
												<select
													class="select select-primary max-w-xs select-xs"
													bind:value={schedule.type}
													disabled={!$decodedToken}
												>
													<option disabled selected value={null}>Tipo?</option>
													<option value="origin">Origem</option>
													<option value="prediction">Previs.</option>
													<option value="periodic">Periód.</option>
												</select>
											</td>
											<td class="p-0">
												<input
													type="text"
													class="w-16 input input-xs input-bordered px-0"
													bind:value={schedule.discriminator}
												/>
											</td>
											<td>
												<input
													type="button"
													class="btn btn-error btn-xs"
													value="-"
													on:click={() => removeScheduleEntry(i)}
													on:keypress={() => removeScheduleEntry(i)}
													disabled={!$decodedToken}
												/>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						{/if}
					</div>
					<label class="label"><span class="label-text">Verificação</span></label>
					<div class="flex">
						<input
							type="date"
							class="input input-xs input-bordered"
							bind:value={serviceCheckDate}
						/>
						<input
							type="button"
							class="btn btn-primary btn-xs"
							value="Hoje"
							on:click={() => {
								serviceCheckDate = new Date().toISOString().split('T')[0];
							}}
						/>
					</div>
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
					<span>Infraestrutura</span>
					<span class="bg-slate-200 rounded-full"
						>{($hasSidewalk === null ? 0 : 1) +
							($hasSidewalkedPath === null ? 0 : 1) +
							($hasShelter === null ? 0 : 1) +
							($hasCover === null ? 0 : 1) +
							($hasBench === null ? 0 : 1) +
							($hasTrashCan === null ? 0 : 1) +
							($hasWaitingTimes === null ? 0 : 1) +
							($hasTicketSeller === null ? 0 : 1) +
							($hasCostumerSupport === null ? 0 : 1) +
							(advertisements === null ? 0 : 1) +
							($hasCrossing === null ? 0 : 1) +
							($hasFlatAccess === null ? 0 : 1) +
							($hasWideAccess === null ? 0 : 1) +
							($hasTactileAccess === null ? 0 : 1) +
							(illuminationPosition === null ? 0 : 1) +
							(illuminationStrength === null ? 0 : 1) +
							($hasIlluminatedPath === null ? 0 : 1) +
							($hasVisibilityFromArea === null ? 0 : 1) +
							($hasVisibilityFromWithin === null ? 0 : 1) +
							($isVisibleFromOutside === null ? 0 : 1) +
							(parkingVisibilityImpairment === null ? 0 : 1) +
							(parkingLocalAccessImpairment === null ? 0 : 1) +
							(parkingAreaAccessImpairment === null ? 0 : 1)}/{$hasShelter === true ? 23 : 22}</span
					>
				</div>
				<div class={currentSubform === subforms.accesibility ? 'px-2 pb-2' : 'max-h-0'}>
					<div>
						<!-- <label class="label"><span class="label-text">Infraestrutura</span></label> -->
						<StopCheckbox
							text="Passeio"
							description="A paragem encontra-se fora da via de rodagem, berma ou de terreno"
							state={hasSidewalk}
							disabled={!$decodedToken}
						/>
						<StopCheckbox
							text="Passeio no acesso"
							description="Existe um passeio ao longo de todo o acesso à paragem"
							state={hasSidewalkedPath}
							disabled={!$decodedToken}
						/>
						<StopCheckbox
							text="Abrigo"
							description="A paragem encontra-se inserida num abrigo que resguarde da chuva e do vento"
							state={hasShelter}
							disabled={!$decodedToken}
						/>
						<StopCheckbox
							text="Cobertura"
							description="A paragem encontra-se debaixo de uma cobertura que resguarde da chuva"
							state={hasCover}
							disabled={!$decodedToken}
						/>
						<StopCheckbox
							text="Banco"
							description="A paragem tem bancos onde os passageiros se possam sentar"
							state={hasBench}
							disabled={!$decodedToken}
						/>
						<StopCheckbox
							text="Caixote do lixo"
							description="A paragem dispõe de um caixote do lixo a menos de 20 metros"
							state={hasTrashCan}
							disabled={!$decodedToken}
						/>
						<StopCheckbox
							text="Tempos de espera"
							description="A paragem dispõe de um painel com os tempos de espera"
							state={hasWaitingTimes}
							disabled={!$decodedToken}
						/>
						<StopCheckbox
							text="Ponto de venda"
							description="Existe um ponto de venda de títulos na paragem"
							state={hasTicketSeller}
							disabled={!$decodedToken}
						/>
						<StopCheckbox
							text="Apoio ao passageiro"
							description="Existe infraestrutura de apoio ao passageiro (balcão, intercomunicador, ...)"
							state={hasCostumerSupport}
							disabled={!$decodedToken}
						/>
						<select
							class="select select-primary max-w-xs select-xs"
							bind:value={advertisements}
							disabled={!$decodedToken}
						>
							<option disabled selected value={null}>Anúncios?</option>
							<option value={0}>Sem anúncios</option>
							<option value={2}>Pouca área de anúncio</option>
							<option value={4}>Muita área de anúncio</option>
							<option value={6}>Anúncios intrusivos</option>
						</select>
						<label class="label"><span class="label-text">Acesso</span></label>
						<StopCheckbox
							text="Atravessamento de via"
							description="Existem infraestruturas ou sinalizações que permitam o atravessamento de via"
							state={hasCrossing}
							disabled={!$decodedToken}
						/>
						<StopCheckbox
							text="Acesso sem ressaltos"
							description="O acesso não é feito exclusivamente por degraus (>1cm) ou declives abruptos"
							state={hasFlatAccess}
							disabled={!$decodedToken}
						/>
						<StopCheckbox
							text="Acesso largo"
							description="O acesso é suficientemente largo (incluindo obstaculos) que possibilite a passagem de uma cadeira de rodas."
							state={hasWideAccess}
							disabled={!$decodedToken}
						/>
						<StopCheckbox
							text="Acesso táctil"
							description="É possível alcançar a paragem através de um percurso táctil"
							state={hasTactileAccess}
							disabled={!$decodedToken}
						/>
						<label class="label"><span class="label-text">Iluminação</span></label>
						<select
							class="select select-primary max-w-xs select-xs"
							bind:value={illuminationPosition}
							disabled={!$decodedToken}
						>
							<option disabled selected value={null}>Posição?</option>
							<option value={0}>Indireta</option>
							<option value={10}>Directa</option>
							<option value={20}>Própria</option>
						</select>
						<select
							class="select select-primary max-w-xs select-xs"
							bind:value={illuminationStrength}
							disabled={!$decodedToken}
						>
							<option disabled selected value={null}>Intensidade?</option>
							<option value={0}>Sem iluminação</option>
							<option value={1}>Fraca</option>
							<option value={3}>Moderada</option>
							<option value={5}>Forte</option>
						</select>

						<StopCheckbox
							text="No acesso"
							description="O acesso para a paragem encontra-se bem iluminado todas as 24 horas"
							state={hasIlluminatedPath}
							disabled={!$decodedToken}
						/>
						<label class="label"><span class="label-text">Visibilidade</span></label>
						<StopCheckbox
							text="Da paragem para autocarro"
							description="Estando na paragem (+-5 metros) é possível ver autocarros atempadamente"
							state={hasVisibilityFromArea}
							disabled={!$decodedToken}
						/>
						{#if $hasShelter}
							<StopCheckbox
								text="Do abrigo para autocarro"
								description="Estando sentado no abrigo é possível ver autocarros atempadamente"
								state={hasVisibilityFromWithin}
								disabled={!$decodedToken}
							/>
						{/if}
						<StopCheckbox
							text="Do autocarro para paragem"
							description="Enquanto motorista, é possível ver devidamente a paragem sem abrandar"
							state={isVisibleFromOutside}
							disabled={!$decodedToken}
						/>
						<label class="label"><span class="label-text">Parque automóvel</span></label>
						<select
							class="select select-primary max-w-xs select-xs"
							bind:value={parkingVisibilityImpairment}
							disabled={!$decodedToken}
						>
							<option disabled selected value={null}>Limitação visual?</option>
							<option value={0}>Sem limitações à visibilidade</option>
							<option value={2}>Pouco limitante à visibilidade</option>
							<option value={4}>Algo limitante à visibilidade</option>
							<option value={6}>Muito limitante à visibilidade</option>
						</select>
						<select
							class="select select-primary max-w-xs select-xs"
							bind:value={parkingLocalAccessImpairment}
							disabled={!$decodedToken}
						>
							<option disabled selected value={null}>Disfuncional à paragem?</option>
							<option value={0}>Sem inteferência à paragem</option>
							<option value={2}>Pouca intreferêcia à paragem</option>
							<option value={4}>Alguma intreferência à paragem</option>
							<option value={6}>Muita intreferência à paragem</option>
						</select>
						<select
							class="select select-primary max-w-xs select-xs"
							bind:value={parkingAreaAccessImpairment}
							disabled={!$decodedToken}
						>
							<option disabled selected value={null}>Disfuncional ao acesso?</option>
							<option value={0}>Acesso sem inteferência</option>
							<option value={2}>Acesso com pouca intreferêcia</option>
							<option value={4}>Acesso com alguma intreferência</option>
							<option value={6}>Acesso com muita intreferência</option>
						</select>
						<label class="label"><span class="label-text">Verificação</span></label>
						<div class="flex">
							<input
								type="date"
								class="input input-xs input-bordered"
								bind:value={infrastructureCheckDate}
							/>
							<input
								type="button"
								class="btn btn-primary btn-xs"
								value="Hoje"
								on:click={() => {
									infrastructureCheckDate = new Date().toISOString().split('T')[0];
								}}
							/>
						</div>
					</div>
				</div>
			</div>
			<div class="collapse collapse-arrow border border-base-300 bg-base-100">
				<div
					class="text-lg font-medium p-2 min-h-0"
					on:click={() => {
						currentSubform = currentSubform === subforms.extra ? null : subforms.extra;
					}}
				>
					Extra
				</div>
				<div class={currentSubform === subforms.extra ? 'px-2 pb-2' : 'max-h-0'}>
					<div class="form-control">
						<label class="label"><span class="label-text">Defeitos</span></label>
						<div class="flex flex-col gap-2">
							<div class="flex gap-2">
								<div class="grow w-full">
									<Select
										items={tmpIssuesOptions}
										bind:value={selectedTmpIssue}
										placeholder="Novo defeito"
									/>
								</div>
								<input
									class="btn btn-sm btn-primary grow-0"
									type="button"
									value="+"
									on:click={addIssue}
									disabled={!$decodedToken}
								/>
							</div>
							{#each tmpIssues as issue}
								<div class="badge badge-outline badge-lg">
									{tmpIssueLabels[issue]}
									<div class="btn btn-error btn-circle btn-xs" on:click={() => removeIssue(tag)}>
										✕
									</div>
								</div>
							{/each}
						</div>
					</div>
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
							class="textarea textarea-bordered h-32 w-full"
							placeholder="Falta obter-se uma foto que mostre que a paragem se encontra frente a xyz"
							bind:value={notes}
							disabled={!$decodedToken}
						/>
					</div>
				</div>
			</div>
			<div class="flex items-baseline">
				<label class="label"><span class="label-text">Autenticidade</span></label>
				<select
					class="select select-primary max-w-xs select-xs"
					bind:value={verificationLevel}
					disabled={!$decodedToken?.permissions.is_admin}
				>
					<option value={-1}>Errado</option>
					<option value={0}>Não verificado</option>
					<option value={3}>Infra muito provável</option>
					<option value={5}>Serviço verificado</option>
					<option value={6}>Infraestrutura verificada</option>
					<option value={10}>Tudo verificado</option>
				</select>
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
