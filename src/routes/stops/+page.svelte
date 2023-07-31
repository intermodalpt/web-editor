<script>
	import { onDestroy, onMount } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import { apiServer, tileStyle } from '$lib/settings.js';
	import { decodedToken, token,toast } from '$lib/stores.js';
	import { isDeepEqual, deepCopy } from '$lib/utils.js';
	import { fetchStops, getStops, loadMissing } from '$lib/db';
	import {
		logStopScore,
		logWeightedStopScore,
		linearStopScore,
		weightedStopScore
	} from '$lib/stops/scoring.js';
	import { GeolocateControl, Map, NavigationControl } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import BooleanFormAttr from '$lib/editor/BooleanFormAttr.svelte';
	import AuthenticityIndicator from '$lib/editor/AuthenticityIndicator.svelte';
	import AuthenticitySelectors from '$lib/editor/AuthenticitySelectors.svelte';
	import StopImagesEditor from '$lib/editor/StopImagesEditor.svelte';
	import PicDialog from '$lib/editor/PicDialog.svelte';
	import VisualizationSettings from './VisualizationSettings.svelte';
	import { liveQuery } from 'dexie';

	class SearchControl {
		onAdd(map) {
			this._map = map;
			this._container = document.createElement('div');
			this._container.className =
				'maplibregl-ctrl maplibregl-ctrl-group mapboxgl-ctrl mapboxgl-ctrl-group';

			// Create a child button
			this._button = document.createElement('button');
			// this._button.className = 'maplibregl-ctrl-icon mapboxgl-ctrl-icon mapboxgl-ctrl-search';
			this._button.textContent = '🔍';
			this._container.appendChild(this._button);

			// Seach for the element "stop-search-modal" inside the map
			this._modal = this._map.getContainer().querySelector('#stop-search-modal');

			// When the button is clicked, show the modal
			this._button.addEventListener('click', () => {
				this._modal.checked = true;
			});

			return this._container;
		}

		onRemove() {
			this._container.parentNode.removeChild(this._container);
			this._map = undefined;
		}
	}

	let picsPerStop = {};
	let map;

	let stopsLoaded = false;
	let stopPicsLoaded = false;
	let mapLoaded = false;
	$: loading = !stopsLoaded || !stopPicsLoaded || !mapLoaded;

	const stops = liveQuery(() => getStops());
	const userPatches = writable([]);

	const patchedStops = derived([stops, userPatches], ([$stops, $userPatches], set) => {
		if ($stops && $token) {
			const patched = Object.assign({}, $stops);

			for (const stop of $userPatches) {
				patched[stop.id] = stop;
			}
			set(patched);
		} else {
			set($stops);
		}
	});

	async function loadData() {
		Promise.all([
			// Ensure that stops are available in indexedDB
			fetchStops().then((r) => {
				stopsLoaded = true;
				return r;
			}),
			// Get the pictures each stop has (TODO this can be loaded in background)
			fetch(`${apiServer}/v1/stop_pics/by_stop`)
				.then((r) => r.json())
				.then((r) => {
					stopPicsLoaded = true;
					return r;
				}),
			// Either get the current user's patches or an empty array if no user is logged in
			$token
				? fetch(`${apiServer}/v1/contrib/pending_stop_patch/own`, {
						headers: {
							authorization: `Bearer ${$token}`
						}
				  }).then((res) => res.json())
				: new Promise((resolve) => {
						resolve([]);
				  })
		])
			.then(([unpatchedStops, pictures, patches]) => {
				$userPatches = patches;
				picsPerStop = pictures;

				if (mapLoaded) {
					loadStops();
				}
			})
			.catch((e) => {
				toast('Failed to load stops', 'error');
				console.log(e);
			})
			.then(async () => {
				console.log('data loaded');
				await loadMissing();
			});
	}

	loadData().then(async () => {
		console.log('data loaded');
		await loadMissing();
	});

	let selectedStop = writable(null);

	const stopSearchInput = writable(null);

	const stopSearchResults = derived(
		[stopSearchInput, patchedStops],
		([$stopSearchInput, $patchedStops]) => {
			if (!$stopSearchInput) return [];

			if ($stopSearchInput.length < 3) return [];

			if (!$patchedStops) return [];

			// Not a terribly efficient search engine
			// Waiting for a proper endpoint

			let lowerInput = $stopSearchInput.toLowerCase();

			const results = Object.values($patchedStops).filter((stop) => {
				return (
					(stop.tml_id && stop.tml_id.includes($stopSearchInput)) ||
					(stop.id && ('' + stop.id).includes($stopSearchInput)) ||
					(stop.name && stop.name.toLowerCase().includes(lowerInput)) ||
					(stop.official_name && stop.official_name.toLowerCase().includes(lowerInput))
				);
			});

			return results
				.map((result) => {
					let id_score = 0;
					if (result.tml_id && result.tml_id.includes($stopSearchInput)) {
						result.tml_id == $stopSearchInput ? (id_score += 100) : (id_score += 50);
					}

					if (('' + stop.id).includes($stopSearchInput)) {
						'' + stop.id == $stopSearchInput ? (id_score += 100) : (id_score += 50);
					}

					let name_score = 0;

					if (result.name && result.name.toLowerCase().includes(lowerInput)) {
						name_score = Math.max(name_score, result.name.toLowerCase() == lowerInput ? 100 : 50);
					}

					if (result.official_name && result.official_name.toLowerCase().includes(lowerInput)) {
						name_score = Math.max(
							name_score,
							result.official_name.toLowerCase() == lowerInput ? 100 : 50
						);
					}

					const score = id_score + name_score;
					return [score, result];
				})
				.sort((a, b) => a[0] - b[0])
				.map(([, result]) => result);
		}
	);

	let showVisualizationSettings = false;
	let stopFilters = [];
	let stopVisualization = 'attrs_log';

	let previewedPic;

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

	const latestPictureDate = derived(stopPictures, ($stopPictures) => {
		if (!$stopPictures || !$stopPictures.length) {
			return null;
		}
		// Find the newest date
		let newestDate = null;
		for (const pic of $stopPictures) {
			if (!pic.capture_date) continue;
			const date = new Date(pic.capture_date);
			if (newestDate == null || date > newestDate) {
				newestDate = date;
			}
		}

		return newestDate;
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
		$selectedStop = $patchedStops[stopId];
	}

	function saveStopMeta() {
		if (hasFlags) {
			if (flagsData.length === 0) {
				toast('Nenhum postalete inserido', 'error')
				return;
			}

			// Check if there are flags without ids
			if (flagsData.some((flag) => flag.id === null)) {
				toast('Campo id em falta no postalete', 'error')
				return;
			}
		}
		if (hasSchedules) {
			if (hasSchedules.length === 0) {
				toast('Nenhum horário inserido', 'error')
				return;
			}

			// Check if there are schedules with null types
			if (schedulesData.some((schedule) => schedule.type === null)) {
				toast('Campo origem em falta no horário', 'error')
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
				}).then((r) => {
					fetchStops(true).then(() => {
						console.log('Stop database updated');
					});
					return r;
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
							fetchStops(false).then(() => {
								console.log('Stop database updated');
							});
							map.getSource('stops').setData(getFilteredData());
							$selectedStop = null;
						};
						if ($decodedToken?.permissions.is_admin) {
							applyChanges();
						} else {
							r.json().then((id) => {
								if (id === -1) {
									toast('Erro a atualizar: O servidor não reconheceu as alterações', 'error')
								} else {
									applyChanges();
								}
							});
						}
					} else {
						r.text()
							.then((error) => {
								toast(`Erro a atualizar:\n${error}`, 'error');
							})
							.catch(() => {
								toast('Erro a atualizar', 'error')
							});
					}
				})
				.catch(() => {
					alert('Error requesting update');
				});
		} else {
			console.log('Não foram feitas alterações na paragem');
			toast('Não foram feitas alterações na paragem')
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
				if (!stop.tml_id) {
					return 0.0;
				}
				switch (stop.tml_id_source) {
					case 'manual':
						return 1.0;
					case 'flags':
						return 0.9;
					case 'h1':
						return 0.8;
					default:
						return 0.5;
				}
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
						return stops.filter((s) => {
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
							if (!flags) {
								return false;
							}

							if (filter.idExp) {
								const idMatch = flags.some((flag) => flag.id && filter.idExp.test(flag.id));
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
					return (stops) => {
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
					};
				case 'service_check_date':
					return (stops) => {
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
					};
				case 'authenticity':
					return (stops) => stops.filter((s) => s.verification_level === filter.expectedVal);
				case 'score':
					return (stops) => {
						const lowerBound = filter.lowerBound || 0.0;
						const upperBound = filter.upperBound || 1.0;

						return stops.filter((s) => {
							let score = stopScore(s);
							return score >= lowerBound && score <= upperBound;
						});
					};
			}
		});

		let filteredStops = Object.values($patchedStops);

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

	function flyToStop(stop) {
		document.getElementById('stop-search-modal').checked = false;

		map.flyTo({
			center: [stop.lon, stop.lat],
			zoom: 18
		});
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
			$selectedStop = $patchedStops[e.features[0].properties.stopId];
		});
	}

	onMount(() => {
		map = new Map({
			container: 'map',
			style: tileStyle,
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
		map.addControl(new SearchControl());

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
		mapLoaded = false;
		map.remove();
	});
</script>

<svelte:head>
	<title>Intermodal - Paragens</title>
	<meta name="description" content="Dados de paragens do Intermodal" />
</svelte:head>

<div id="map" class="h-full relative">
	{#if loading}
		<div style="background-color: #33336699" class="z-[2000] absolute inset-0 backdrop-blur-sm" />
		<div class="absolute inset-x-0 m-auto w-full md:w-96 w z-[2001]">
			<div
				class="m-2 p-4 bg-base-100 flex flex-col gap-4 rounded-2xl shadow-3xl max-h-full"
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
			class="btn btn-sm shadow-lg"
			value="Visualização"
			on:click={() => (showVisualizationSettings = true)}
			on:keypress={() => (showVisualizationSettings = true)}
		/>
	</div>
	<div
		class="absolute lg:left-3 lg:top-3 left-0 top-0 z-[11] flex justify-center h-96 lg:w-72 w-full transition"
		style:display={showVisualizationSettings ? 'block' : 'none'}
	>
		<div
			class="h-full w-full bg-base-100 lg:rounded-xl shadow-md grid grid-cols-1 p-2 gap-2"
			style:grid-template-rows="minmax(0, 1fr)"
		>
			<div class="w-full">
				<VisualizationSettings
					bind:filters={stopFilters}
					bind:visualization={stopVisualization}
					on:filter_change={loadStops}
					on:visualization_change={loadStops}
				/>
			</div>
			<div class="flex justify-end">
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
	<div class="absolute">
		<input type="checkbox" id="stop-search-modal" class="modal-toggle" />
		<div class="modal z-[11]">
			<div class="modal-box relative z-[11] max-w-5xl">
				<label for="stop-search-modal" class="btn btn-sm btn-circle absolute right-2 top-2">✕</label
				>
				<h3 class="text-lg font-bold">Pesquisar por paragem</h3>
				<input
					type="text"
					class="input input-primary input-bordered w-full"
					placeholder="id ou nome"
					bind:value={$stopSearchInput}
				/>
				{#if $stopSearchResults}
					<div class="flex flex-col gap-1 overflow-y-scroll">
						{#each $stopSearchResults as result}
							<div
								class="card card-compact w-full bg-base-100 shadow-md cursor-pointer"
								on:click={() => {
									flyToStop(result);
								}}
								on:keypress={() => {
									flyToStop(result);
								}}
							>
								<div class="card-body">
									<h2 class="card-title text-md">
										({result.id}) {result.name || result.official_name}
									</h2>
									<h3 class="text-md">{result.tml_id}</h3>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
	<div
		class="absolute bottom-0 z-10 flex justify-center w-full transition duration-750"
		class:translate-y-[350px]={!$selectedStop}
	>
		<div
			class="h-[350px] w-full bg-base-100 grid grid-cols-1 lg:w-[95%] lg:rounded-t-xl shadow-md"
			style="grid-template-rows: auto 1fr;"
		>
			<div class="flex gap-1 justify-between flex-wrap-reverse p-2">
				<div class="btn-group btn-group-horizontal tabs tabs-boxed">
					<span
						class="tab tab-sm"
						class:tab-active={currentSubform === subforms.info}
						on:click={() => (currentSubform = subforms.info)}
						on:keypress={() => (currentSubform = subforms.info)}>Info</span
					>
					<span
						class="tab tab-sm"
						class:tab-active={currentSubform === subforms.pics}
						on:click={() => (currentSubform = subforms.pics)}
						on:keypress={() => (currentSubform = subforms.pics)}>Fotos</span
					>
					<span
						class="tab tab-sm"
						class:tab-active={currentSubform === subforms.service}
						on:click={() => (currentSubform = subforms.service)}
						on:keypress={() => (currentSubform = subforms.service)}>Serviço</span
					>
					<span
						class="tab tab-sm"
						class:tab-active={currentSubform === subforms.infra}
						on:click={() => (currentSubform = subforms.infra)}
						on:keypress={() => (currentSubform = subforms.infra)}>Infra</span
					>
					<span
						class="tab tab-sm"
						class:tab-active={currentSubform === subforms.extra}
						on:click={() => (currentSubform = subforms.extra)}
						on:keypress={() => (currentSubform = subforms.extra)}>Extra</span
					>
				</div>
				<div class="flex gap-2 flex-grow justify-end">
					<AuthenticityIndicator bind:value={verificationLevel}/>
					<span class="w-2"/>
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
			<div class="w-full overflow-y-auto p-2 pt-0 bg-base-100">
				<div
					class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
					class:hidden={currentSubform != subforms.info}
				>
					<div class="flex flex-col gap-1 items-start">
						<div class="flex gap-2 items-center">
							<span class=" text-lg">#{$selectedStop?.id}</span>
							<div class="join">
								<input
									class="join-item p-1 btn btn-xs"
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
									class="join-item p-1 btn btn-xs"
									type="button"
									value={$selectedStop?.lon.toFixed(6)}
									on:click={() => {
										navigator.clipboard.writeText($selectedStop?.lon.toFixed(6));
									}}
									on:keypress={() => {
										navigator.clipboard.writeText($selectedStop?.lon.toFixed(6));
									}}
								/>
								<input
									class="btn btn-info btn-xs join-item"
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
						</div>
						<span>OpenStreetMap</span>
						<a
							class="link link-neutral ml-2 text-base border rounded-lg p-2"
							href="https://www.openstreetmap.org/node/{$selectedStop?.external_id}"
							>{$selectedStop?.osm_name}</a
						>
						<span>Completude</span>
						<div class="flex flex-col gap-2 ml-2 text-base border rounded-lg p-2">
							<div>
								Serviço:
								<span>{(hasFlags === null ? 0 : 1) + (hasSchedules === null ? 0 : 1)}/2</span>
							</div>
							<div>
								Atributos:
								<span
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
						<span>Autenticidade</span>
						<div class="flex flex-col gap-2 ml-2 text-base border rounded-lg p-2">
							<AuthenticitySelectors bind:value={verificationLevel} disabled={!$decodedToken?.permissions.is_admin}/>
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
									<img
										src={picture.url_medium}
										rel="noreferrer"
										alt="Fotografia da paragem"
										class="rounded-box transition-all hover:scale-150 h-40"
										on:click={() => {
											previewedPic = picture;
										}}
									/>
								{/each}
							{:else}
								<div class="flex flex-col items-center justify-center w-full h-40">
									<span class="text-gray-500">Sem fotos</span>
								</div>
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
						<div class="rounded-lg border p-2">
							<div class="flex gap-2 items-center">
								<span class="text-base">Postaletes</span>
								<a
									class="btn btn-circle btn-ghost btn-xs text-info"
									href="/instructions/stopattrs#flags"
									target="_blank"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										class="w-4 h-4 stroke-current"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</a>
								<div class="join items-center">
									<button
										class="btn btn-xs px-4 join-item"
										class:btn-active={hasFlags === true}
										on:click={() => (hasFlags = true)}
										on:keypress={() => (hasFlags = true)}>Sim</button
									>
									<button
										class="btn btn-xs px-6 join-item"
										class:btn-active={hasFlags === null}
										on:click={() => (hasFlags = null)}
										on:keypress={() => (hasFlags = null)}>?</button
									>
									<button
										class="btn btn-xs px-4 join-item"
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
						<div class="border rounded-lg p-2">
							<div class="flex gap-2 items-center">
								<span class="text-base">Horários</span>
								<a
									class="btn btn-circle btn-ghost btn-xs text-info"
									href="/instructions/stopattrs#schedules"
									target="_blank"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										class="w-4 h-4 stroke-current"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</a>
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
						<div class="grow border rounded-lg p-2">
							<div class="flex gap-2">
								<div class="label-text">Verificação</div>
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
								{#if $latestPictureDate}
									<input
										type="button"
										class="btn btn-info btn-xs"
										value="Fotos"
										on:click={() => {
											serviceCheckDate = $latestPictureDate.toISOString().split('T')[0];
										}}
										on:keypress={() => {
											serviceCheckDate = $latestPictureDate.toISOString().split('T')[0];
										}}
									/>
								{/if}
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
						<BooleanFormAttr
							label="Passeio"
							bind:state={$hasSidewalk}
							disabled={!$decodedToken}
							infoUrl="/instructions/stopattrs#has_sidewalk"
						/>
						<BooleanFormAttr
							label="Passeio no acesso"
							bind:state={$hasSidewalkedPath}
							disabled={!$decodedToken}
							infoUrl="/instructions/stopattrs#has_sidewalk"
						/>
						<BooleanFormAttr
							label="Abrigo"
							bind:state={$hasShelter}
							disabled={!$decodedToken}
							infoUrl="/instructions/stopattrs#has_shelter"
						/>
						<BooleanFormAttr
							label="Cobertura"
							bind:state={$hasCover}
							disabled={!$decodedToken}
							infoUrl="/instructions/stopattrs#has_cover"
						/>
						<BooleanFormAttr
							label="Banco"
							bind:state={$hasBench}
							disabled={!$decodedToken}
							infoUrl="/instructions/stopattrs#has_bench"
						/>
						<BooleanFormAttr
							label="Caixote do lixo"
							bind:state={$hasTrashCan}
							disabled={!$decodedToken}
							infoUrl="/instructions/stopattrs#has_trash_can"
						/>

						<select
							class="select select-bordered max-w-xs select-xs"
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

						<BooleanFormAttr
							label="Atravessamento de via"
							bind:state={$hasCrossing}
							disabled={!$decodedToken}
							infoUrl="/instructions/stopattrs#has_crossing"
						/>
						<BooleanFormAttr
							label="Acesso sem ressaltos"
							bind:state={$hasFlatAccess}
							disabled={!$decodedToken}
							infoUrl="/instructions/stopattrs#has_flat_access"
						/>
						<BooleanFormAttr
							label="Acesso largo"
							bind:state={$hasWideAccess}
							disabled={!$decodedToken}
							infoUrl="/instructions/stopattrs#has_wide_access"
						/>
						<BooleanFormAttr
							label="Acesso táctil"
							bind:state={$hasTactileAccess}
							disabled={!$decodedToken}
							infoUrl="/instructions/stopattrs#has_tactile_access"
						/>
						<span>Iluminação</span><br />
						<select
							class="select select-bordered max-w-xs select-xs"
							bind:value={illuminationPosition}
							disabled={!$decodedToken}
						>
							<option selected value={null}>Posição?</option>
							<option value={0}>Iluminação Indireta</option>
							<option value={10}>Iluminação Directa</option>
							<option value={20}>Iluminação Própria</option>
						</select>
						<select
							class="select select-bordered max-w-xs select-xs"
							bind:value={illuminationStrength}
							disabled={!$decodedToken}
						>
							<option selected value={null}>Intensidade?</option>
							<option value={0}>Sem iluminação</option>
							<option value={1}>Iluminação Fraca</option>
							<option value={3}>Iluminação Moderada</option>
							<option value={5}>Iluminação Forte</option>
						</select>
						<BooleanFormAttr
							label="No acesso"
							bind:state={$hasIlluminatedPath}
							disabled={!$decodedToken}
							infoUrl="/instructions/stopattrs#has_illuminated_path"
						/>
					</div>
					<div class="flex flex-col gap-1">
						<span>Visibilidade</span>
						<BooleanFormAttr
							label="Da paragem para autocarro"
							bind:state={$hasVisibilityFromArea}
							disabled={!$decodedToken}
							infoUrl="/instructions/stopattrs#has_visibility_from_area"
						/>
						{#if $hasShelter}
							<BooleanFormAttr
								label="Do abrigo para autocarro"
								bind:state={$hasVisibilityFromWithin}
								disabled={!$decodedToken}
								infoUrl="/instructions/stopattrs#has_visibility_from_within"
							/>
						{/if}
						<BooleanFormAttr
							label="Do autocarro para paragem"
							bind:state={$isVisibleFromOutside}
							disabled={!$decodedToken}
							infoUrl="/instructions/stopattrs#is_visible_from_outside"
						/>
						<span>Apoios</span>
						<BooleanFormAttr
							label="Tempos de espera"
							bind:state={$hasWaitingTimes}
							disabled={!$decodedToken}
							infoUrl="/instructions/stopattrs#has_waiting_times"
						/>
						<BooleanFormAttr
							label="Ponto de venda"
							bind:state={$hasTicketSeller}
							disabled={!$decodedToken}
							infoUrl="/instructions/stopattrs#has_ticket_seller"
						/>
						<BooleanFormAttr
							label="Apoio ao passageiro"
							bind:state={$hasCostumerSupport}
							disabled={!$decodedToken}
							infoUrl="/instructions/stopattrs#has_costumer_support"
						/>
					</div>
					<div class="flex flex-col gap-1">
						<span>Parque automóvel</span>
						<select
							class="select select-bordered max-w-xs select-xs"
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
							class="select select-bordered max-w-xs select-xs"
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
							class="select select-bordered max-w-xs select-xs"
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
						<div class="flex gap-1">
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
							{#if $latestPictureDate}
								<input
									type="button"
									class="btn btn-info btn-xs"
									value="Fotos"
									on:click={() => {
										infrastructureCheckDate = $latestPictureDate.toISOString().split('T')[0];
									}}
									on:keypress={() => {
										infrastructureCheckDate = $latestPictureDate.toISOString().split('T')[0];
									}}
								/>
							{/if}
						</div>
					</div>
				</div>
				<div class="flex gap-2 flex-wrap" class:hidden={currentSubform != subforms.extra}>
					<div class="form-control max-w-xs grow basis-64">
						<span class="text-sm">Defeitos</span>
						<div class="flex flex-col items-start flex-wrap gap-1">
							{#each tmpIssues as issue}
								<div class="border rounded-xl p-1">
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
						<div class="flex flex-col gap-2 items-start">
							<div class="flex w-full gap-1">
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
							<div class="flex flex-row flex-wrap gap-1">
								{#each tags as tag}
									<span class="border rounded-xl p-1">
										{tag}
										<span
											class="btn btn-error btn-circle btn-xs"
											on:click={() => removeTag(tag)}
											on:keypress={() => removeTag(tag)}
										>
											✕
										</span>
									</span>
								{/each}
							</div>
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
	{#if uploadingPics}
		<StopImagesEditor
			stops={$stops}
			stop={selectedStop}
			{stopPictures}
			{newPictures}
			on:save={() => {
				uploadingPics = false;
			}}
		/>
	{/if}
</div>

{#if previewedPic}
	<input type="checkbox" id="pic-preview" class="modal-toggle" checked />
	<div class="modal">
		<div class="modal-box w-11/12 max-w-[100em]">
			<label
				for="pic-preview"
				class="btn btn-sm btn-circle btn-error absolute right-2 top-2"
				on:click={() => {
					previewedPic = undefined;
				}}
				on:keypress={() => {
					previewedPic = undefined;
				}}>✕</label
			>
			<div />
			<PicDialog picture={previewedPic} />
			<div class="flex modal-actions justify-between">
				<button class="btn">
					<!-- Font Awesome Free 6.4.0 https://fontawesome.com/license/free (Free License). -->
					<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 512 512">
						<path
							d="M344 0H488c13.3 0 24 10.7 24 24V168c0 9.7-5.8 18.5-14.8 22.2s-19.3
							1.7-26.2-5.2l-39-39-87 87c-9.4 9.4-24.6 9.4-33.9 0l-32-32c-9.4-9.4-9.4-24.6
							0-33.9l87-87L327 41c-6.9-6.9-8.9-17.2-5.2-26.2S334.3 0 344 0zM168 512H24c-13.3
							0-24-10.7-24-24V344c0-9.7 5.8-18.5 14.8-22.2s19.3-1.7 26.2 5.2l39 39 87-87c9.4-9.4
							24.6-9.4 33.9 0l32 32c9.4 9.4 9.4 24.6 0 33.9l-87 87 39 39c6.9 6.9 8.9 17.2 5.2
							26.2s-12.5 14.8-22.2 14.8z"
						/>
					</svg>
				</button>
				<input type="button" class="btn btn-secondary" value="Editar" />
			</div>
		</div>
	</div>
{/if}
