<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import maplibre from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { defaultMapBounds, tileStyle } from '$lib/settings';
	import { permissions, toast, isAuthenticated } from '$lib/stores';
	import { isDeepEqual, regionMapParams } from '$lib/utils';
	import { SearchControl } from '$lib/stops/SearchControl.js';
	import {
		updateStopMeta,
		contribUpdateStopMeta,
		getStopPicsRels,
		getOwnStopPatch,
		getStopPics,
		getAllStopPics,
		getRegionStops
	} from '$lib/api';
	import {
		logStopScore,
		logWeightedStopScore,
		linearStopScore,
		weightedStopScore
	} from './scoring.js';
	import Icon from '$lib/components/Icon.svelte';
	import Menu from '../Menu.svelte';
	import StopPicsMetaEditor from '$lib/pics/wrappers/StopPicsMetaEditor.svelte';
	import PicDialog from '$lib/pics/PicDialog.svelte';
	import VisualizationSettings from './VisualizationSettings.svelte';
	import StopAttributesForm from './forms/StopAttributesForm.svelte';

	export let data;
	const region = data.region;
	console.log(region);


	let picsPerStop = {};
	let map;

	let stopsLoaded = false;
	let stopPicsLoaded = false;
	let mapLoaded = false;
	$: loading = !stopsLoaded || !stopPicsLoaded || !mapLoaded;
	let queryStringDataLoaded = false;
	$: loadQueryStringData(loading);

	function loadQueryStringData(loading) {
		if (loading || queryStringDataLoaded) {
			return;
		}
		queryStringDataLoaded = true;

		const id = $page.url.searchParams.get('id');
		if (!id) {
			return;
		}

		const parsed = parseInt(id);

		if (parsed != NaN) {
			if (!$stops) {
				console.error('$stops not loaded as of loadQueryStringData');
			}
			const stop = $stops[parsed];

			if (stop) {
				$selectedStop = stop;
				map.easeTo({ padding: { bottom: 350 }, duration: 0 });
				map.flyTo({ center: [stop.lon, stop.lat], zoom: 18 });
			}
		}
	}

	const stops = writable(null);
	const userPatches = writable([]);

	const patchedStops = derived([stops, userPatches], ([$stops, $userPatches], set) => {
		if ($userPatches) {
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
		await Promise.all([
			getRegionStops(1, {
				onSuccess: (r) => {
					$stops = Object.fromEntries(r.map((stop) => [stop.id, stop]));
				},
				onError: (res) => {
					toast('Erro a carregar as paragens', 'error');
				},
				toJson: true
			}),
			getStopPicsRels({
				onSuccess: (r) => {
					stopPicsLoaded = true;
					picsPerStop = r;
				},
				onError: () => {
					toast('Erro a carregar as fotografias', 'error');
				},
				toJson: true
			}),
			$isAuthenticated
				? getOwnStopPatch({
						onSuccess: (r) => ($userPatches = r),
						onError: () => {
							toast('Erro a carregar as contribuições pendentes', 'error');
						},
						toJson: true
					})
				: null
		]).then(async () => {
			stopsLoaded = true;
			if (mapLoaded) loadStops();
		});
	}

	let selectedStop = writable(null);
	selectedStop.subscribe((stop) => {
		if (stop) {
			goto('?id=' + stop.id);
		}

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
	});

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

			return Object.values($patchedStops)
				.map((stop) => {
					let id_score = 0;
					let name_score = 0;

					if (('' + stop.id).includes($stopSearchInput)) {
						'' + stop.id == $stopSearchInput ? (id_score += 100) : (id_score += 50);
					}

					if (stop.name && stop.name.toLowerCase().includes(lowerInput)) {
						name_score = Math.max(name_score, stop.name.toLowerCase() == lowerInput ? 100 : 50);
					}

					// GTFS ID
					if (stop.operators.some((op) => op.stop_ref?.toLowerCase().includes($stopSearchInput))) {
						stop.operators.some((op) => op.stop_ref?.toLowerCase() == $stopSearchInput)
							? (id_score += 100)
							: (id_score += 50);
					}

					if (stop.operators.some((op) => op.name?.toLowerCase().includes($stopSearchInput))) {
						name_score = Math.max(
							name_score,
							stop.operators.some((op) => op.name?.toLowerCase() == $stopSearchInput) ? 100 : 50
						);
					}

					const score = id_score + name_score;
					return [score, stop];
				})
				.filter(([score, result]) => score > 0)
				.sort((a, b) => a[0] - b[0])
				.map(([, result]) => result);
		}
	);

	let showVisualizationSettings = false;
	let stopFilters = [];
	let stopVisualization = 'attrs_log';

	let previewedPic;
	let editingStopPics = false;

	const stopPicturesNonce = writable(Date.now());
	const stopPictures = derived(
		[selectedStop, stopPicturesNonce],
		([$selectedStop, stopPicturesNonce], set) => {
			if ($selectedStop) {
				const callbacks = {
					onSuccess: async (r) => {
						set(await r.json());
					},
					onError: () => {
						toast('Erro a carregar as fotografias', 'error');
					}
				};
				($isAuthenticated
					? getAllStopPics($selectedStop.id, callbacks)
					: getStopPics($selectedStop.id, callbacks)
				).then(() => {});
			} else {
				return [];
			}
		}
	);

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

	export function selectStop(stopId) {
		$selectedStop = $patchedStops[stopId];
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
				if (stop.operators.length == 0) {
					return 0.0;
				}
				Math.min(
					0,
					...stop.operators.map((operatorStop) => {
						switch (operatorStop.source) {
							case 'manual':
								return 1.0;
							case 'flags':
								return 0.9;
							case 'h1':
								return 0.8;
							default:
								return 0.5;
						}
					})
				);
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
								return s.name === null;
							}

							return (
								(s.name && filter.nameExp.test(s.name)) ||
								s.operators.some((rel) => {
									filter.nameExp.test(rel.name);
								})
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
						label: `${stop.id} - ${stop.name}`,
						score: stopScore(stop)
					}
				};
			})
		};
	}

	function loadStops() {
		map.getSource('stops').setData(getFilteredData());
	}

	function flyToStop(stop) {
		document.getElementById('stop-search-modal').checked = false;

		map.flyTo({
			center: [stop.lon, stop.lat],
			zoom: 18
		});
	}

	async function handleStopFormSave(e) {
		let currStop = $selectedStop;
		let newStop = e.detail.stop;
		const hasStopChanged = !isDeepEqual(newStop, currStop);

		if (!hasStopChanged) {
			toast('Não foram feitas alterações na paragem');
			$selectedStop = null;
			return;
		}

		const onError = async () => {
			toast('Erro a atualizar', 'error');
		};

		if ($permissions?.stops?.modifyAttrs) {
			await updateStopMeta(currStop.id, newStop, {
				onSuccess: async (res) => {
					let upstreamStop = await res.json();
					Object.assign(currStop, upstreamStop);

					$stops = $stops;

					map.getSource('stops').setData(getFilteredData());
					$selectedStop = null;
					toast('Guardado', 'success');
				},
				onError
			});
		} else if ($permissions?.stops?.contribModifyAttrs) {
			let comment = null;
			if (
				confirm(
					'A sua alteração será aplicada após uma revisão. Deseja deixar algum comentário para o revisor?'
				)
			) {
				comment = prompt('Insira o seu comentário');
			}

			await contribUpdateStopMeta(currStop.id, newStop, comment, {
				onSuccess: async (res) => {
					let id = await res.json();
					if (id === -1) {
						toast('Erro a atualizar: O servidor não reconheceu as alterações', 'error');
					} else {
						Object.assign(currStop, newStop);
						map.getSource('stops').setData(getFilteredData());
						$selectedStop = null;
						toast('Contribuição submetida. Registada com o ID ' + id);
					}
				},
				onError
			});
		} else {
			toast('Sem permissões para alterar a paragem', 'error');
		}
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
			id: 'stop-labels',
			type: 'symbol',
			source: 'stops',
			layout: {
				'text-field': ['get', 'label'],
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
						[16, 5],
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

	onMount(async () => {
		const mapParams = regionMapParams(region);
		map = new maplibre.Map({
			container: 'map',
			style: tileStyle,
			center: mapParams.center,
			zoom: mapParams.zoom,
			minZoom: 8,
			maxZoom: 20,
			maxBounds: defaultMapBounds
		});

		map.addControl(new maplibre.NavigationControl());
		map.addControl(new SearchControl());
		map.addControl(new maplibre.FullscreenControl());

		map.addControl(
			new maplibre.GeolocateControl({
				positionOptions: {
					enableHighAccuracy: true
				},
				showUserHeading: true,
				trackUserLocation: true
			})
		);

		map.on('load', async () => {
			addSourcesAndLayers();
			addEvents();

			mapLoaded = true;

			if (stopsLoaded) loadStops();
		});

		await loadData();
	});

	onDestroy(() => map?.remove());
</script>



<Menu {region} page="stops" />

<div id="map" class="relative h-[min(75dvh,750px)]">
	{#if loading}
		<div style="background-color: #33336699" class="z-[2000] absolute inset-0 backdrop-blur-sm" />
		<div class="absolute inset-x-0 m-auto w-full md:w-96 w z-[2001]">
			<div class="m-2 p-4 bg-base-100 flex flex-col gap-4 rounded-2xl shadow-3xl max-h-full">
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
		<button
			class="btn btn-sm bg-base-100 border-2 shadow-md"
			on:click={() => (showVisualizationSettings = true)}>Visualização</button
		>
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
				<button class="btn btn-error btn-xs" on:click={() => (showVisualizationSettings = false)}
					>Fechar</button
				>
			</div>
		</div>
	</div>
	<div class="absolute">
		<input type="checkbox" id="stop-search-modal" class="modal-toggle" />
		<div class="modal z-30">
			<div
				class="modal-box relative z-30 max-w-5xl grid grid-cols-1"
				style="grid-template-rows: auto 1fr;"
			>
				<div>
					<label for="stop-search-modal" class="btn btn-sm btn-circle absolute right-2 top-2">
						<Icon name="close" class="h-4 stroke-current" />
					</label>
					<h3 class="text-lg font-bold">Pesquisar por paragem</h3>
					<input
						type="text"
						class="input input-primary input-bordered w-full"
						placeholder="id ou nome"
						bind:value={$stopSearchInput}
					/>
				</div>
				{#if $stopSearchResults}
					<div class="flex flex-col gap-1 mt-2 overflow-y-scroll">
						{#each $stopSearchResults as result}
							<div
								class="card card-compact w-full bg-base-100 border-2 shadow-sm cursor-pointer"
								on:click={() => {
									flyToStop(result);
								}}
								on:keypress={() => {
									flyToStop(result);
								}}
							>
								<div class="card-body">
									<h2 class="text-md font-semibold">
										<span class="text-md border-b-2 border-blue-500">{result.id}</span>
										{result.name}
									</h2>
									{#each result.operators as operator}
										<div class="ml-2">
											<span class="text-md border-b-2 border-orange-600">{operator.stop_ref}</span>
											<span class="text-sm">{operator.name}</span>
										</div>
									{/each}
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
		class:hidden={!mapLoaded}
	>
		<div
			class="h-[350px] w-full bg-base-100 grid grid-cols-1 lg:w-[95%] lg:rounded-t-xl shadow-md"
			style="grid-template-rows: auto 1fr;"
		>
			<StopAttributesForm
				{selectedStop}
				{stopPictures}
				{latestPictureDate}
				on:pictureClick={(e) => (previewedPic = e.detail.picture)}
				on:pictureEditorRequest={(e) => (editingStopPics = true)}
				on:save={handleStopFormSave}
			/>
		</div>
	</div>
</div>

<div class="card-body">
	<!-- <h2 class="card-title">Em falta</h2>
	... -->
</div>


{#if editingStopPics}
	<StopPicsMetaEditor
		{stops}
		stop={selectedStop}
		on:upload={() => {
			$stopPicturesNonce = Date.now();
		}}
		on:save={() => {
			$stopPicturesNonce = Date.now();
		}}
		on:delete={() => {
			$stopPicturesNonce = Date.now();
		}}
		on:close={() => {
			editingStopPics = false;
		}}
	/>
{/if}

{#if previewedPic}
	<PicDialog picture={previewedPic} {stops} on:close={() => (previewedPic = undefined)} />
{/if}
