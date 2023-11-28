<script>
	import { onDestroy, onMount, tick } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import { GeolocateControl, Map, NavigationControl } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { liveQuery } from 'dexie';
	import { apiServer, tileStyle } from '$lib/settings.js';
	import { decodedToken, token, toast } from '$lib/stores.js';
	import { isDeepEqual } from '$lib/utils.js';
	import { SearchControl } from '$lib/stops/SearchControl.js';
	import { fetchStops, getStops, patchStop, loadMissing } from '$lib/db';
	import {
		logStopScore,
		logWeightedStopScore,
		linearStopScore,
		weightedStopScore
	} from '$lib/stops/scoring.js';
	import StopPicsMetaEditor from '$lib/pics/wrappers/StopPicsMetaEditor.svelte';
	import PicDialog from '$lib/pics/PicDialog.svelte';
	import VisualizationSettings from './VisualizationSettings.svelte';
	import StopAttributesForm from './forms/StopAttributesForm.svelte';

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
			.then(async ([unpatchedStops, pictures, patches]) => {
				$userPatches = patches;
				picsPerStop = pictures;

				await tick();
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
								return s.name === null || s.osm_name === null;
							}

							return (
								(s.name && filter.nameExp.test(s.name)) ||
								(s.osm_name && filter.nameExp.test(s.osm_name)) ||
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
						label: `${stop.id} - ${stop.name || stop.osm_name}`,
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

	function handleStopFormSave(e) {
		let currStop = $selectedStop;
		let newStop = e.detail.stop;
		const hasStopChanged = !isDeepEqual(newStop, currStop);

		const headers = {
			'Content-Type': 'application/json',
			authorization: `Bearer ${$token}`
		};
		const isAdmin = $decodedToken?.permissions.is_admin;

		if (!hasStopChanged) {
			console.log('Não foram feitas alterações na paragem');
			toast('Não foram feitas alterações na paragem');
			$selectedStop = null;
			return;
		}

		console.log('Foram feitas alterações');
		let request;
		if (isAdmin) {
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
			.then(async (r) => {
				if (r.ok) {
					if (isAdmin) {
						let upstreamStop = await r.json();

						// Object.assign(currStop, newStop);
						Object.assign(currStop, upstreamStop);

						patchStop(upstreamStop).then(() => {
							console.log('Stop database updated');
						});
						map.getSource('stops').setData(getFilteredData());
						$selectedStop = null;
					} else {
						let id = await r.json();
						if (id === -1) {
							toast('Erro a atualizar: O servidor não reconheceu as alterações', 'error');
						} else {
							Object.assign(currStop, newStop);
							map.getSource('stops').setData(getFilteredData());
							$selectedStop = null;
							toast('Contribuição submetida. Registada com o ID ' + id);
						}
					}
				} else {
					r.text()
						.then((error) => {
							toast(`Erro a atualizar:\n${error}`, 'error');
						})
						.catch(() => {
							toast('Erro a atualizar', 'error');
						});
				}
			})
			.catch((e) => {
				console.log('Error requesting update');
				console.log(e);
				toast('Error requesting update');
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

		map.on('load', async () => {
			addSourcesAndLayers();
			addEvents();

			mapLoaded = true;
			await tick();

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
		<input
			type="button"
			class="btn btn-sm bg-base-100 border-2 shadow-md"
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
		<div class="modal z-30">
			<div
				class="modal-box relative z-30 max-w-5xl grid grid-cols-1"
				style="grid-template-rows: auto 1fr;"
			>
				<div>
					<label for="stop-search-modal" class="btn btn-sm btn-circle absolute right-2 top-2"
						>✕</label
					>
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
										{result.name || result.osm_name}
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
	>
		<div
			class="h-[350px] w-full bg-base-100 grid grid-cols-1 lg:w-[95%] lg:rounded-t-xl shadow-md"
			style="grid-template-rows: auto 1fr;"
		>
			<StopAttributesForm
				{selectedStop}
				{stopPictures}
				{latestPictureDate}
				readOnly={!$decodedToken}
				isAdmin={$decodedToken?.permissions.is_admin}
				on:pictureClick={(e) => {
					previewedPic = e.detail.picture;
				}}
				on:pictureEditorRequest={(e) => {
					editingStopPics = true;
				}}
				on:save={handleStopFormSave}
			/>
		</div>
	</div>
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
			editingStopPics = false;
		}}
	/>
{/if}

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
