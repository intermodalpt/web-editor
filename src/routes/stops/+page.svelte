<script>
	import { onDestroy, onMount } from 'svelte';
	import { derived, writable, get } from 'svelte/store';
	import { apiServer } from '$lib/settings.js';
	import { decodedToken, token } from '$lib/stores.js';
	import { isDeepEqual, deepCopy } from '$lib/utils.js';
	import { stops as storedStops, loadStops as loadStoredStops } from '$lib/stores.js';
	import {
		logStopScore,
		logWeightedStopScore,
		linearStopScore,
		weightedStopScore
	} from '$lib/stops/scoring.js';
	import { GeolocateControl, Map, NavigationControl } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import StopCheckbox from '$lib/editor/StopCheckbox.svelte';
	import StopImagesEditor from '$lib/editor/StopImagesEditor.svelte';
	import VisualizationSettings from './VisualizationSettings.svelte';

	let stops = {};
	let picsPerStop = {};
	let map;

	let stopsLoaded = false;
	let stopPicsLoaded = false;
	let mapLoaded = false;
	$: loading = !stopsLoaded || !stopPicsLoaded || !mapLoaded;

	(function () {
		let headers = {
			headers: {
				authorization: `Bearer ${$token}`
			}
		};
		const stopCache = get(storedStops);
		Promise.all([
			(stopCache === undefined
				? loadStoredStops(fetch)
				: new Promise((resolve) => {
						resolve(stopCache);
				  })
			).then((r) => {
				stopsLoaded = true;
				return r;
			}),
			fetch(`${apiServer}/v1/stop_pics/by_stop`)
				.then((r) => r.json())
				.then((r) => {
					stopPicsLoaded = true;
					return r;
				}),
			$token
				? fetch(`${apiServer}/v1/contrib/pending_stop_patch/own`, headers).then((res) => res.json())
				: new Promise((resolve) => {
						resolve([]);
				  })
		])
			.then(([unpatchedStops, pictures, patch]) => {
				picsPerStop = pictures;

				const patchedStops = unpatchedStops;
				for (const stop of patch) {
					patchedStops[stop.id] = stop;
				}

				stops = patchedStops;

				if (mapLoaded) {
					loadStops();
				}
			})
			.catch((e) => {
				alert('Failed to load stops');
				console.log(e);
			});
	})();

	let selectedStop = writable(null);

	let showVisualizationSettings = false;
	let stopFilters = [];
	let stopVisualization = 'attrs_log';

	let previewedPic = undefined;

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

	const hasSidewalk = writable(null);
	const hasSidewalkedPath = writable(null);
	const hasShelter = writable(null);
	const hasCover = writable(null);
	const hasBench = writable(null);
	const hasTrashCan = writable(null);
	const hasWaitingTimes = writable(null);
	const hasTicketSeller = writable(null);
	const hasCostumerSupport = writable(null);
	let advertisementQty = null;

	const hasCrossing = writable(null);
	const hasFlatAccess = writable(null);
	const hasWideAccess = writable(null);
	const hasTactileAccess = writable(null);

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
		info: 'info',
		pics: 'pics',
		service: 'service',
		infra: 'infra',
		extra: 'extra'
	};

	let currentSubform = subforms.info;

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

	let uploadingPics = false;

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

	const newPictures = writable([]);
	stopPictures.subscribe(() => {
		newPictures.set([]);
	});

	selectedStop.subscribe((stop) => {
		if (map) {
			if (stop == null) {
				map.easeTo({
					padding: { bottom: 0 },
					duration: 750
				});
				return;
			} else {
				map.easeTo({
					padding: { bottom: 350 },
					duration: 750
				});
			}
		} else if (stop == null) {
			return;
		}

		id = stop.id;
		name = stop.name ?? null;
		shortName = stop.short_name ?? null;
		officialName = stop.official_name ?? null;
		officialId = stop.refs.join(';');
		locality = stop.locality ?? null;
		street = stop.street ?? null;
		door = stop.door ?? null;
		notes = stop.notes ?? null;
		tags = stop.tags ?? null;
		tmpIssues = stop.tmp_issues ?? [];

		if (stop.flags === undefined || stop.flags === null) {
			hasFlags = null;
		} else if (stop.flags.length === 0) {
			hasFlags = false;
		} else {
			hasFlags = true;
		}
		flagsData = deepCopy(stop.flags) || [];

		if (stop.schedules === undefined || stop.schedules === null) {
			hasSchedules = null;
		} else if (stop.schedules.length === 0) {
			hasSchedules = false;
		} else {
			hasSchedules = true;
		}
		schedulesData = deepCopy(stop.schedules) || [];

		$hasSidewalk = stop.has_sidewalk ?? null;
		$hasSidewalkedPath = stop.has_sidewalked_path ?? null;
		$hasShelter = stop.has_shelter ?? null;
		$hasCover = stop.has_cover ?? null;
		$hasBench = stop.has_bench ?? null;
		$hasTrashCan = stop.has_trash_can ?? null;
		$hasWaitingTimes = stop.has_waiting_times ?? null;
		$hasTicketSeller = stop.has_ticket_seller ?? null;
		$hasCostumerSupport = stop.has_costumer_support ?? null;
		advertisementQty = stop.advertisement_qty ?? null;

		$hasCrossing = stop.has_crossing ?? null;
		$hasFlatAccess = stop.has_flat_access ?? null;
		$hasWideAccess = stop.has_wide_access ?? null;
		$hasTactileAccess = stop.has_tactile_access ?? null;

		illuminationStrength = stop.illumination_strength ?? null;
		illuminationPosition = stop.illumination_position ?? null;
		$hasIlluminatedPath = stop.has_illuminated_path ?? null;
		$hasVisibilityFromWithin = stop.has_visibility_from_within ?? null;
		$hasVisibilityFromArea = stop.has_visibility_from_area ?? null;
		$isVisibleFromOutside = stop.is_visible_from_outside ?? null;
		parkingVisibilityImpairment = stop.parking_visibility_impairment ?? null;
		parkingLocalAccessImpairment = stop.parking_local_access_impairment ?? null;
		parkingAreaAccessImpairment = stop.parking_area_access_impairment ?? null;

		serviceCheckDate = stop.service_check_date ?? null;
		infrastructureCheckDate = stop.infrastructure_check_date ?? null;

		verificationLevel = stop.verification_level ?? 0;
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
		if (hasFlags) {
			if (flagsData.length === 0) {
				alert('Nenhum postalete inserido');
				return;
			}

			// Check if there are flags without ids
			if (flagsData.some((flag) => flag.id === null)) {
				alert('Campo id em falta no postalete');
				return;
			}
		}
		if (hasSchedules) {
			if (hasSchedules.length === 0) {
				alert('Nenhum horário inserido');
				return;
			}

			// Check if there are schedules with null types
			if (schedulesData.some((schedule) => schedule.type === null)) {
				alert('Campo origem em falta no horário');
				return;
			}
		}

		const headers = {
			'Content-Type': 'application/json',
			authorization: `Bearer ${$token}`
		};

		let newMeta = {
			id: id,
			name: name,
			short_name: shortName,
			official_name: officialName,
			refs: officialId
				.split(';')
				.map((ref) => ref.trim())
				.filter((ref) => ref !== ''),
			locality: locality,
			street: street,
			door: door,
			tags: tags,
			notes: !notes || notes.trim() === '' ? null : notes.trim(),

			flags: hasFlags === null ? null : hasFlags ? flagsData : [],
			schedules: hasSchedules === null ? null : hasSchedules ? schedulesData : [],
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
			advertisement_qty: advertisementQty,

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

			service_check_date: serviceCheckDate || null,
			infrastructure_check_date: infrastructureCheckDate || null,
			verification_level: verificationLevel
		};

		let currStop = $selectedStop;
		let newStop = Object.assign({}, currStop, newMeta);
		const stopChanged = !isDeepEqual(newStop, currStop);

		if (stopChanged) {
			console.log('Foram feitas alterações');
			let request;
			if ($decodedToken?.permissions.is_admin) {
				request = fetch(`${apiServer}/v1/stops/update/${currStop.id}`, {
					method: 'PATCH',
					headers: headers,
					body: JSON.stringify(newStop)
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

				request = fetch(`${apiServer}/v1/contrib/stops/update/${currStop.id}`, {
					method: 'POST',
					headers: headers,
					body: JSON.stringify({ contribution: newStop, comment: comment })
				});
			}
			// If the request answer is ok, update the stop in the stops array
			// otherwise show an error message with the response body
			request
				.then((r) => {
					if (r.ok) {
						const applyChanges = () => {
							Object.assign(currStop, newStop);
							map.getSource('stops').setData(getFilteredData());
							$selectedStop = null;
						};
						if ($decodedToken?.permissions.is_admin) {
							applyChanges();
						} else {
							r.json().then((id) => {
								if (id === -1) {
									alert('Erro a atualizar:\nO servidor não reconheceu as alterações');
								} else {
									applyChanges();
								}
							});
						}
					} else {
						r.text()
							.then((error) => {
								alert(`Erro a atualizar:\n${error}`);
							})
							.catch(() => {
								alert('Erro a atualizar');
							});
					}
				})
				.catch(() => {
					alert('Error requesting update');
				});
		} else {
			console.log('Não foram feitas alterações na paragem');
			$selectedStop = null;
		}
	}

	export function stopScore(stop) {
		// This funcion is a bit less than ideal as this condition must be verified for every stop
		// If there ever is a performance issue, this is a good place to start
		switch (stopVisualization) {
			case 'attrs_weighted':
				return weightedStopScore(stop);
			case 'attrs':
				return linearStopScore(stop);
			case 'attrs_log':
				return logStopScore(stop);
			case 'attrs_weighted_log':
				return logWeightedStopScore(stop);
			case 'refs':
				return stop.tml_id ? 1.0 : 0.0;
			case 'pics':
				const pics = picsPerStop[stop.id];
				if (!pics) {
					return 0.0;
				}
				switch (pics) {
					case 0:
						return 0.0;
					case 1:
						return 0.4;
					case 2:
						return 0.6;
					case 3:
						return 0.8;
					default:
						return 1.0;
				}
		}
	}

	function getFilteredData() {
		const filters = stopFilters.map((filter) => {
			switch (filter.type) {
				case 'name':
					return (stops) => {
						stops.filter((s) => {
							if (!filter.nameExp) {
								return s.name === null || s.osm_name === null;
							}

							return (
								(s.name && filter.nameExp.test(s.name)) ||
								(s.official_name && filter.nameExp.test(s.official_name)) ||
								(s.osm_name && filter.nameExp.test(s.osm_name))
							);
						});
					};
				case 'flags':
					return (stops) => {
						return stops.filter((s) => {
							const flags = s.flags;
							if (!schedules) {
								return false;
							}

							if (filter.idExp) {
								const idMatch = flags.some((id) => flag.id && filter.idExp.test(flag.id));
								if (!idMatch) {
									return false;
								}
							}

							if (filter.nameExp) {
								const nameMatch = flags.some((flag) => flag.name && filter.nameExp.test(flag.name));
								if (!nameMatch) {
									return false;
								}
							}

							return true;
						});
					};
				case 'schedules':
					return (stops) => {
						return stops.filter((s) => {
							const schedules = s.schedules;
							if (!schedules) {
								return filter.negated;
							}

							let codeMatch = true;
							// TODO
							// let fromMatch = false;
							// let toMatch = false;

							if (filter.routeCode) {
								codeMatch = schedules.some((schedule) => filter.routeCode.test(schedule.code));
							}
							if (filter.negated) {
								return !codeMatch;
							} else {
								return codeMatch;
							}
						});
					};
				case 'attr':
					return (stops) => stops.filter((s) => s[filter.attr] === filter.expectedVal);
				case 'infrastructure_check_date':
					return stops.filter((s) => {
						if (!s.infrastructure_check_date) {
							return false;
						}

						let valid = true;

						if (filter.dateLessThan && s.infrastructure_check_date >= filter.dateLessThan) {
							valid = false;
						}

						if (filter.dateGreaterThan && s.infrastructure_check_date <= filter.dateGreaterThan) {
							valid = false;
						}

						return valid;
					});
				case 'service_check_date':
					return stops.filter((s) => {
						if (!s.service_check_date) {
							return false;
						}

						let valid = true;

						if (filter.dateLessThan && s.service_check_date >= filter.dateLessThan) {
							valid = false;
						}

						if (filter.dateGreaterThan && s.service_check_date <= filter.dateGreaterThan) {
							valid = false;
						}

						return valid;
					});
				case 'authenticity':
					return (stops) => stops.filter((s) => s.verification_level === filter.expectedVal);
			}
		});

		let filteredStops = Object.values(stops);

		for (const filter of filters) {
			filteredStops = filter(filteredStops);
		}

		return {
			type: 'FeatureCollection',
			features: filteredStops.map((stop) => {
				return {
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: [stop.lon, stop.lat]
					},
					properties: {
						stopId: stop.id,
						name: `${stop.id} - ${stop.osm_name || stop.official_name}`,
						score: stopScore(stop)
					}
				};
			})
		};
	}

	function loadStops() {
		map.getSource('stops').setData(getFilteredData());
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
			name: null,
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

	function addSourcesAndLayers() {
		map.addSource('stops', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			},
			clusterRadius: 40,
			clusterMinPoints: 3
		});

		map.addLayer({
			id: 'gtfsLabels',
			type: 'symbol',
			source: 'stops',
			layout: {
				'text-field': ['get', 'name'],
				'text-font': ['Open Sans', 'Arial Unicode MS'],
				'text-size': 10,
				'text-offset': [2, 0],
				'text-anchor': 'left',
				'text-max-width': 150,
				'text-allow-overlap': false
			},
			minzoom: 16
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
					'rgb(220, 30, 50)',
					0.5,
					'rgb(220, 220, 50)',
					1.0,
					'rgb(30, 220, 50)'
				],
				'circle-radius': {
					base: 1.75,
					stops: [
						[0, 2],
						[11, 3],
						[18, 20]
					]
				},
				'circle-stroke-width': 1,
				'circle-stroke-color': '#fff'
			}
		});
	}

	function addEvents() {
		const canvas = map.getCanvas();

		map.on('mouseenter', 'unclustered-point', () => {
			canvas.style.cursor = 'pointer';
		});

		map.on('mouseleave', 'unclustered-point', () => {
			canvas.style.cursor = '';
		});

		map.on('click', 'unclustered-point', (e) => {
			$selectedStop = stops[e.features[0].properties.stopId];
		});
	}

	onMount(() => {
		map = new Map({
			container: 'map',
			style: 'https://tiles2.intermodal.pt/styles/iml/style.json',
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
			addSourcesAndLayers();
			addEvents();

			mapLoaded = true;
			if (stopsLoaded) {
				loadStops();
			}
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

<div id="map" class="h-full relative">
	{#if loading}
		<div style="background-color: #33336699" class="z-[2000] absolute inset-0" />
		<div class="absolute inset-x-0 m-auto w-full md:w-96 w z-[2001]">
			<div
				class="m-2 p-4 bg-base-100 flex flex-col gap-4 rounded-2xl shadow-3xl border-2 border-warning max-h-full"
			>
				<span class="text-xl">A carregar</span>
				<span
					>Mapa: <progress
						class="progress progress-primary w-full"
						value={mapLoaded ? 100 : 0}
						max="100"
					/></span
				>
				<span
					>Paragens: <progress
						class="progress progress-primary w-full"
						value={stopsLoaded ? 100 : 0}
						max="100"
					/></span
				>
				<span
					>Fotografias: <progress
						class="progress progress-primary w-full"
						value={stopPicsLoaded ? 100 : 0}
						max="100"
					/></span
				>
			</div>
		</div>
	{/if}

	<div class="absolute top-2 left-2 z-10">
		<input
			type="button"
			class="btn btn-sm btn-secondary btn-outline bg-white shadow-lg"
			value="Visualização"
			on:click={() => (showVisualizationSettings = true)}
			on:keypress={() => (showVisualizationSettings = true)}
		/>
	</div>
	<div
		class="absolute top-0 z-[11] flex justify-center w-full transition duration-750"
		class:-translate-y-[110px]={!showVisualizationSettings}
	>
		<div
			class="h-[110px] w-full bg-zinc-500 grid grid-cols-1 lg:w-[95%] lg:rounded-b-xl lg:shadow-xl border-b-2 border-neutral"
			style="grid-template-rows: 1fr auto;"
		>
			<div class="w-full h-full overflow-y-scroll p-2 bg-base-100">
				<VisualizationSettings
					bind:filters={stopFilters}
					bind:visualization={stopVisualization}
					on:filter_change={loadStops}
					on:visualization_change={loadStops}
				/>
			</div>
			<div class="flex gap-1 justify-between flex-wrap-reverse p-1">
				<div class="flex gap-2 flex-grow justify-end">
					<input
						type="button"
						class="btn btn-error btn-xs"
						on:click={() => (showVisualizationSettings = false)}
						on:keypress={() => (showVisualizationSettings = false)}
						value="Fechar"
					/>
				</div>
			</div>
		</div>
	</div>
	<div
		class="absolute bottom-0 z-10 flex justify-center w-full transition duration-750"
		class:translate-y-[350px]={!$selectedStop}
	>
		<div
			class="h-[350px] w-full bg-zinc-500 grid grid-cols-1 lg:w-[95%] lg:rounded-t-xl lg:shadow-xl border-t-2 border-neutral"
			style="grid-template-rows: auto 1fr;"
		>
			<div class="flex gap-1 justify-between flex-wrap-reverse p-1">
				<div class="btn-group btn-group-horizontal">
					<span
						class="btn btn-xs"
						class:btn-active={currentSubform === subforms.info}
						on:click={() => (currentSubform = subforms.info)}
						on:keypress={() => (currentSubform = subforms.info)}>Info</span
					>
					<span
						class="btn btn-xs"
						class:btn-active={currentSubform === subforms.pics}
						on:click={() => (currentSubform = subforms.pics)}
						on:keypress={() => (currentSubform = subforms.pics)}>Fotos</span
					>
					<span
						class="btn btn-xs"
						class:btn-active={currentSubform === subforms.service}
						on:click={() => (currentSubform = subforms.service)}
						on:keypress={() => (currentSubform = subforms.service)}>Serviço</span
					>
					<span
						class="btn btn-xs"
						class:btn-active={currentSubform === subforms.infra}
						on:click={() => (currentSubform = subforms.infra)}
						on:keypress={() => (currentSubform = subforms.infra)}>Infra</span
					>
					<span
						class="btn btn-xs"
						class:btn-active={currentSubform === subforms.extra}
						on:click={() => (currentSubform = subforms.extra)}
						on:keypress={() => (currentSubform = subforms.extra)}>Extra</span
					>
				</div>
				<div class="flex gap-2 flex-grow justify-end">
					<select
						class="select select-primary max-w-xs select-xs hidden lg:block"
						bind:value={verificationLevel}
						disabled={!$decodedToken?.permissions.is_admin}
					>
						<!-- The binary mask -->
						<option value={0}>Não verificado</option>
						<option value={8}>Infra muito provável</option>
						<option value={48}>Serviço verificado</option>
						<option value={12}>Infraestrutura verificada</option>
						<option value={84}>Errado</option>
						<option value={252}>Tudo verificado</option>
					</select>
					<input
						type="button"
						class="btn btn-success btn-xs"
						disabled={!$decodedToken}
						on:click={saveStopMeta}
						on:keypress={saveStopMeta}
						value="Guardar"
					/>
					<input
						type="button"
						class="btn btn-error btn-xs"
						on:click={() => ($selectedStop = null)}
						on:keypress={() => ($selectedStop = null)}
						value="Fechar"
					/>
				</div>
			</div>
			<div class="w-full overflow-y-scroll p-2 bg-base-100">
				<div
					class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
					class:hidden={currentSubform != subforms.info}
				>
					<div class="flex flex-col gap-1">
						<span class="font-light text-lg">#{$selectedStop?.id}</span>
						<div class="flex gap-2">
							<div class="flex">
								<input
									class="btn btn-neutral btn-outline btn-xs rounded-r-none"
									type="button"
									value={$selectedStop?.lat.toFixed(6)}
									on:click={() => {
										navigator.clipboard.writeText($selectedStop?.lat.toFixed(6));
									}}
									on:keypress={() => {
										navigator.clipboard.writeText($selectedStop?.lat.toFixed(6));
									}}
								/>
								<input
									class="btn btn-neutral btn-outline btn-xs rounded-l-none -ml-[1px]"
									type="button"
									value={$selectedStop?.lon.toFixed(6)}
									on:click={() => {
										navigator.clipboard.writeText($selectedStop?.lon.toFixed(6));
									}}
									on:keypress={() => {
										navigator.clipboard.writeText($selectedStop?.lon.toFixed(6));
									}}
								/>
							</div>
							<input
								class="btn btn-secondary btn-xs"
								type="button"
								value="Copiar"
								on:click={() => {
									navigator.clipboard.writeText(
										$selectedStop?.lat.toFixed(6) + ',' + $selectedStop?.lon.toFixed(6)
									);
								}}
								on:keypress={() => {
									navigator.clipboard.writeText(
										$selectedStop?.lat.toFixed(6) + ',' + $selectedStop?.lon.toFixed(6)
									);
								}}
							/>
						</div>
						<span>OpenStreetMap</span>
						<a
							class="link link-neutral ml-2 text-base"
							href="https://www.openstreetmap.org/node/{$selectedStop?.external_id}"
							>{$selectedStop?.osm_name}</a
						>
						<span>Completude</span>
						<div class="flex flex-col gap-2 ml-2 text-base">
							<div>
								Serviço:
								<span class="bg-slate-200 rounded-full"
									>{(hasFlags === null ? 0 : 1) + (hasSchedules === null ? 0 : 1)}/2</span
								>
							</div>
							<div>
								Atributos:
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
										(advertisementQty === null ? 0 : 1) +
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
										(parkingAreaAccessImpairment === null ? 0 : 1)}/{$hasShelter === true
										? 23
										: 22}</span
								>
							</div>
						</div>
						<div class="flex items-baseline">
							<span class="label">Autenticidade</span>
							<select
								class="select select-primary max-w-xs select-xs"
								bind:value={verificationLevel}
								disabled={!$decodedToken?.permissions.is_admin}
							>
								<!-- The binary mask -->
								<option value={0}>Não verificado</option>
								<option value={8}>Infra muito provável</option>
								<option value={48}>Serviço verificado</option>
								<option value={12}>Infraestrutura verificada</option>
								<option value={84}>Errado</option>
								<option value={252}>Tudo verificado</option>
							</select>
						</div>
					</div>
					<div class="flex flex-col gap-1">
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
									disabled
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
				<div class="w-full" class:hidden={currentSubform != subforms.pics}>
					<div class="flex flex-col gap-2 grow">
						<div class="flex flex-wrap gap-1">
							{#if $stopPictures !== undefined && $stopPictures.length > 0}
								{#each $stopPictures as picture}
									<a target="_blank" rel="noreferrer" href={picture.url_full}>
										<img
											src={picture.url_medium}
											rel="noreferrer"
											alt="Fotografia da paragem"
											class="rounded-box transition-all hover:scale-150 h-40"
										/>
									</a>
								{/each}
							{/if}
						</div>
						<div class="flex justify-end">
							<input
								class="btn btn-sm btn-primary"
								type="button"
								value="Editar fotos"
								on:click={() => {
									uploadingPics = true;
								}}
								on:keypress={() => {
									uploadingPics = true;
								}}
								disabled={!$decodedToken}
							/>
						</div>
					</div>
				</div>
				<div class="w-full hidden" class:hidden={currentSubform != subforms.service}>
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 items-start">
						<div class="rounded-lg border-base-300 border-l-2 border-r-2">
							<div class="flex gap-2 items-baseline">
								<span class="text-base">Postaletes</span>
								<div class="btn-group items-center">
									<button
										class="btn btn-xs px-4"
										class:btn-active={hasFlags === true}
										on:click={() => (hasFlags = true)}
										on:keypress={() => (hasFlags = true)}>Sim</button
									>
									<button
										class="btn btn-xs px-6"
										class:btn-active={hasFlags === null}
										on:click={() => (hasFlags = null)}
										on:keypress={() => (hasFlags = null)}>?</button
									>
									<button
										class="btn btn-xs px-4"
										class:btn-active={hasFlags === false}
										on:click={() => (hasFlags = false)}
										on:keypress={() => (hasFlags = false)}>Não</button
									>
								</div>
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
														class="w-32 input input-xs input-bordered px-0"
														bind:value={flag.id}
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
											<tr>
												<th class="text-xs">Nome</th>
												<th class="w-full">
													<input
														type="text"
														class="w-32 input input-xs input-bordered px-0"
														bind:value={flag.name}
													/>
												</th>
												<th>
													<input
														type="button"
														class="btn btn-success btn-xs"
														value="+linha"
														disabled={!$decodedToken}
														on:click={() => addFlagRoute(i)}
														on:keypress={() => addFlagRoute(i)}
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
													on:keypress={() => removeFlagRoute(i, j)}
												>
													✕
												</div>
											</div>
										{/each}
									</div>
									<hr />
								{/each}

								<div class="flex justify-end">
									<input
										type="button"
										class="btn btn-success btn-xs"
										value="+ postalete"
										on:click={addFlag}
										on:keypress={addFlag}
									/>
								</div>
							{/if}
						</div>
						<div class="rounded-lg border-base-300 border-l-2 border-r-2">
							<div class="flex gap-2 items-baseline">
								<span class="text-base">Horários</span>
								<div class="btn-group items-center">
									<button
										class="btn btn-xs px-4"
										class:btn-active={hasSchedules === true}
										on:click={() => (hasSchedules = true)}
										on:keypress={() => (hasSchedules = true)}>Sim</button
									>
									<button
										class="btn btn-xs px-6"
										class:btn-active={hasSchedules === null}
										on:click={() => (hasSchedules = null)}
										on:keypress={() => (hasSchedules = null)}>?</button
									>
									<button
										class="btn btn-xs px-4"
										class:btn-active={hasSchedules === false}
										on:click={() => (hasSchedules = false)}
										on:keypress={() => (hasSchedules = false)}>Não</button
									>
								</div>
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
													on:keypress={addScheduleEntry}
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
														<option value="frequency">Periód.</option>
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
						<div class="grow">
							<span class="label-text">Verificação</span>
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
									on:keypress={() => {
										serviceCheckDate = new Date().toISOString().split('T')[0];
									}}
								/>
							</div>
						</div>
					</div>
				</div>
				<div
					class="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2"
					class:hidden={currentSubform != subforms.infra}
				>
					<div class="flex flex-col gap-1">
						<span>Infraestrutura</span>
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
							description="A paragem encontra-se debaixo de uma cobertura que não um abrigo (ex: telhado)"
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
						<select
							class="select select-primary max-w-xs select-xs"
							bind:value={advertisementQty}
							disabled={!$decodedToken}
						>
							<option selected value={null}>Anúncios?</option>
							<option value={0}>Sem anúncios</option>
							<option value={2}>Pouca área de anúncio</option>
							<option value={4}>Muita área de anúncio</option>
							<option value={6}>Anúncios intrusivos</option>
						</select>
					</div>
					<div class="flex flex-col gap-1">
						<span>Acesso</span>
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
							description="O acesso é suficientemente largo (incluindo obstáculos) que possibilite a passagem de uma cadeira de rodas."
							state={hasWideAccess}
							disabled={!$decodedToken}
						/>
						<StopCheckbox
							text="Acesso táctil"
							description="É possível alcançar a paragem através de um percurso táctil"
							state={hasTactileAccess}
							disabled={!$decodedToken}
						/>
						<span>Iluminação</span><br />
						<select
							class="select select-primary max-w-xs select-xs"
							bind:value={illuminationPosition}
							disabled={!$decodedToken}
						>
							<option selected value={null}>Posição?</option>
							<option value={0}>Iluminação Indireta</option>
							<option value={10}>Iluminação Directa</option>
							<option value={20}>Iluminação Própria</option>
						</select>
						<select
							class="select select-primary max-w-xs select-xs"
							bind:value={illuminationStrength}
							disabled={!$decodedToken}
						>
							<option selected value={null}>Intensidade?</option>
							<option value={0}>Sem iluminação</option>
							<option value={1}>Iluminação Fraca</option>
							<option value={3}>Iluminação Moderada</option>
							<option value={5}>Iluminação Forte</option>
						</select>
						<StopCheckbox
							text="No acesso"
							description="O acesso para a paragem encontra-se bem iluminado todas as 24 horas"
							state={hasIlluminatedPath}
							disabled={!$decodedToken}
						/>
					</div>
					<div class="flex flex-col gap-1">
						<span>Visibilidade</span>
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
						<span>Apoios</span>
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
					</div>
					<div class="flex flex-col gap-1">
						<span>Parque automóvel</span>
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
					</div>
					<div>
						<span class="label-text">Verificação</span>
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
								on:keypress={() => {
									infrastructureCheckDate = new Date().toISOString().split('T')[0];
								}}
							/>
						</div>
					</div>
				</div>
				<div class="flex gap-2 flex-wrap" class:hidden={currentSubform != subforms.extra}>
					<div class="form-control max-w-xs grow basis-64">
						<span class="text-sm">Defeitos</span>
						<div class="flex flex-col gap-2">
							{#each tmpIssues as issue}
								<div class="badge badge-outline badge-lg">
									{tmpIssueLabels[issue]}
									<div
										class="btn btn-error btn-circle btn-xs"
										on:click={() => removeIssue(issue)}
										on:keypress={() => removeIssue(issue)}
									>
										✕
									</div>
								</div>
							{/each}
							<div class="grow">
								<label for="defect-modal" class="btn btn-sm btn-secondary modal-button w-full"
									>Novo defeito</label
								>
								<input type="checkbox" id="defect-modal" class="modal-toggle" />
								<label for="defect-modal" class="modal cursor-pointer">
									<label class="modal-box relative max-w-2xl" for="">
										<span class="text-lg"> Que defeito adicionar? </span>
										<ul class="menu bg-base-100 w-full rounded-box">
											{#each tmpIssuesOptions as tmpIssue}
												<li>
													<span
														on:mouseup={() => {
															selectedTmpIssue = tmpIssue;
															addIssue();
															document.getElementById('defect-modal').checked = false;
														}}
													>
														{tmpIssue.label}
													</span>
												</li>
											{/each}
										</ul>
									</label>
								</label>
							</div>
						</div>
					</div>
					<div class="form-control max-w-xs grow basis-64">
						<span class="text-sm">Etiquetas</span>
						<div class="flex flex-col gap-2">
							<div class="flex w-full">
								<input
									id="tag-text"
									type="text"
									class="input input-bordered input-sm grow"
									placeholder="Creche ABC123"
									disabled={!$decodedToken}
								/>
								<input
									class="btn btn-sm btn-primary"
									type="button"
									value="+"
									on:click={addTag}
									on:keypress={addTag}
									disabled={!$decodedToken}
								/>
							</div>
							{#each tags as tag}
								<div class="badge badge-outline badge-lg">
									{tag}
									<div
										class="btn btn-error btn-circle btn-xs"
										on:click={() => removeTag(tag)}
										on:keypress={() => removeTag(tag)}
									>
										✕
									</div>
								</div>
							{/each}
						</div>
					</div>
					<div class="form-control grow basis-96">
						<span class="text-sm">Notas</span>
						<textarea
							class="textarea textarea-bordered h-32 w-full"
							placeholder="Falta obter-se uma foto que mostre que a paragem se encontra frente a xyz"
							bind:value={notes}
							disabled={!$decodedToken}
						/>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

{#if uploadingPics}
	<StopImagesEditor
		stop={selectedStop}
		{stopPictures}
		{newPictures}
		on:save={() => {
			uploadingPics = false;
		}}
	/>
{/if}

{#if previewedPic}
	<input type="checkbox" id="pic-preview" class="modal-toggle" checked />
	<div class="modal">
		<div class="modal-box w-11/12 max-w-5xl">
			<a target="_blank" rel="noreferrer" href={previewedPic.url_full}>
				<img src={previewedPic.url_medium} alt="Fotografia da paragem" class="rounded-box w-full" />
			</a>
			<div class="modal-action">
				<label
					for="pic-preview"
					class="btn"
					on:click={() => {
						previewedPic = undefined;
					}}
					on:keypress={() => {
						previewedPic = undefined;
					}}>Close</label
				>
			</div>
		</div>
	</div>
{/if}
