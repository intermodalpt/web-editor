<script>
	import { createEventDispatcher } from 'svelte';
	import { writable } from 'svelte/store';
	import { deepCopy } from '$lib/utils';
	import { toast, permissions } from '$lib/stores';

	import InfoForm from './InfoForm.svelte';
	import ServiceForm from './ServiceForm.svelte';
	import InfraForm from './InfraForm.svelte';
	import ExtraForm from './ExtraForm.svelte';
	import AuthenticityIndicator from './AuthenticityIndicator.svelte';
	import PicturesForm from './PicturesForm.svelte';

	const dispatch = createEventDispatcher();

	export let selectedStop;
	export let stopPictures;
	export let latestPictureDate;
	export let readOnly = !(
		$permissions?.stops?.modify_attrs || $permissions?.stops?.contrib_modify_attrs
	);

	let name = null;
	let shortName = null;
	let locality = null;
	let street = null;
	let door = null;

	let hasFlags = null;
	let flagsData = null;
	let hasSchedules = null;
	let schedulesData = null;
	let serviceCheckDate = null;
	let infrastructureCheckDate = null;

	const isGhost = writable(null);
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

	$: infraAttrCount =
		($hasSidewalk === null ? 0 : 1) +
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
		(parkingAreaAccessImpairment === null ? 0 : 1);
	$: totalInfraAttrCount = $hasShelter === true ? 23 : 22;
	$: serviceAttrCount = (hasFlags === null ? 0 : 1) + (hasSchedules === null ? 0 : 1);

	const subforms = {
		info: 'info',
		pics: 'pics',
		service: 'service',
		infra: 'infra',
		extra: 'extra'
	};

	let currentSubform = subforms.info;

	selectedStop.subscribe((stop) => {
		if (!stop) return;

		name = stop.name ?? null;
		shortName = stop.short_name ?? null;
		locality = stop.locality ?? null;
		street = stop.street ?? null;
		door = stop.door ?? null;
		notes = stop.notes ?? null;
		tags = stop.tags ?? null;
		tmpIssues = stop.a11y.tmp_issues ?? [];

		if (stop.a11y.flags === undefined || stop.a11y.flags === null) {
			hasFlags = null;
		} else if (stop.a11y.flags.length === 0) {
			hasFlags = false;
		} else {
			hasFlags = true;
		}
		flagsData = deepCopy(stop.a11y.flags) || [];

		if (stop.a11y.schedules === undefined || stop.a11y.schedules === null) {
			hasSchedules = null;
		} else if (stop.a11y.schedules.length === 0) {
			hasSchedules = false;
		} else {
			hasSchedules = true;
		}
		schedulesData = deepCopy(stop.a11y.schedules) || [];

		$isGhost = stop.is_ghost;
		$hasSidewalk = stop.a11y.has_sidewalk ?? null;
		$hasSidewalkedPath = stop.a11y.has_sidewalked_path ?? null;
		$hasShelter = stop.a11y.has_shelter ?? null;
		$hasCover = stop.a11y.has_cover ?? null;
		$hasBench = stop.a11y.has_bench ?? null;
		$hasTrashCan = stop.a11y.has_trash_can ?? null;
		$hasWaitingTimes = stop.a11y.has_waiting_times ?? null;
		$hasTicketSeller = stop.a11y.has_ticket_seller ?? null;
		$hasCostumerSupport = stop.a11y.has_costumer_support ?? null;
		advertisementQty = stop.a11y.advertisement_qty ?? null;

		$hasCrossing = stop.a11y.has_crossing ?? null;
		$hasFlatAccess = stop.a11y.has_flat_access ?? null;
		$hasWideAccess = stop.a11y.has_wide_access ?? null;
		$hasTactileAccess = stop.a11y.has_tactile_access ?? null;

		illuminationStrength = stop.a11y.illumination_strength ?? null;
		illuminationPosition = stop.a11y.illumination_position ?? null;
		$hasIlluminatedPath = stop.a11y.has_illuminated_path ?? null;
		$hasVisibilityFromWithin = stop.a11y.has_visibility_from_within ?? null;
		$hasVisibilityFromArea = stop.a11y.has_visibility_from_area ?? null;
		$isVisibleFromOutside = stop.a11y.is_visible_from_outside ?? null;
		parkingVisibilityImpairment = stop.a11y.parking_visibility_impairment ?? null;
		parkingLocalAccessImpairment = stop.a11y.parking_local_access_impairment ?? null;
		parkingAreaAccessImpairment = stop.a11y.parking_area_access_impairment ?? null;

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

	function saveStopMeta() {
		if (hasFlags) {
			if (flagsData.length === 0) {
				toast('Nenhum postalete inserido', 'error');
				return;
			}

			// Check if there are flags without ids
			if (flagsData.some((flag) => flag.id === null)) {
				toast('Campo id em falta no postalete', 'error');
				return;
			}
		}
		if (hasSchedules) {
			if (hasSchedules.length === 0) {
				toast('Nenhum horário inserido', 'error');
				return;
			}

			// Check if there are schedules with null types
			if (schedulesData.some((schedule) => schedule.type === null)) {
				toast('Campo origem em falta no horário', 'error');
				return;
			}
		}

		let newAttrs = {
			is_ghost: $isGhost,
			name: name,
			short_name: shortName,
			locality: locality,
			street: street,
			door: door,
			tags: tags,
			notes: !notes || notes.trim() === '' ? null : notes.trim(),

			a11y: {
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
				parking_area_access_impairment: parkingAreaAccessImpairment
			},

			service_check_date: serviceCheckDate || null,
			infrastructure_check_date: infrastructureCheckDate || null,
			verification_level: verificationLevel
		};

		let currStop = $selectedStop;
		let newStop = Object.assign({}, currStop, newAttrs);
		dispatch('save', { stop: newStop });
	}
</script>

<div class="flex gap-1 justify-between flex-wrap-reverse p-2">
	<div class="btn-group btn-group-horizontal tabs tabs-boxed">
		<button
			class="tab tab-sm"
			class:tab-active={currentSubform === subforms.info}
			on:click={() => (currentSubform = subforms.info)}>Info</button
		>
		<button
			class="tab tab-sm"
			class:tab-active={currentSubform === subforms.pics}
			on:click={() => (currentSubform = subforms.pics)}>Fotos</button
		>
		<button
			class="tab tab-sm"
			class:tab-active={currentSubform === subforms.service}
			on:click={() => (currentSubform = subforms.service)}>Serviço</button
		>
		<button
			class="tab tab-sm"
			class:tab-active={currentSubform === subforms.infra}
			on:click={() => (currentSubform = subforms.infra)}>Infra</button
		>
		<button
			class="tab tab-sm"
			class:tab-active={currentSubform === subforms.extra}
			on:click={() => (currentSubform = subforms.extra)}>Extra</button
		>
	</div>
	<div class="flex gap-2 flex-grow justify-end">
		<AuthenticityIndicator bind:value={verificationLevel} />
		<span class="w-2" />
		<button
			class="btn btn-success btn-xs"
			disabled={!($permissions.stops.modify_attrs || $permissions.stops.contrib_modify_attrs)}
			on:click={saveStopMeta}
		>
			Guardar
		</button>
		<button class="btn btn-error btn-xs" on:click={() => ($selectedStop = null)}>Fechar</button>
	</div>
</div>
<div class="w-full overflow-y-auto p-2 pt-0 bg-base-100">
	{#if currentSubform == subforms.info}
		<InfoForm
			{selectedStop}
			bind:name
			bind:shortName
			bind:locality
			bind:street
			bind:door
			bind:verificationLevel
			{serviceAttrCount}
			{infraAttrCount}
			{totalInfraAttrCount}
			{readOnly}
		/>
	{:else if currentSubform == subforms.pics}
		<PicturesForm {stopPictures} on:pictureClick on:pictureEditorRequest {readOnly} />
	{:else if currentSubform == subforms.service}
		<ServiceForm
			bind:hasFlags
			bind:flagsData
			bind:hasSchedules
			bind:schedulesData
			bind:serviceCheckDate
			{latestPictureDate}
			{readOnly}
		/>
	{:else if currentSubform == subforms.infra}
		<InfraForm
			{isGhost}
			{hasSidewalk}
			{hasSidewalkedPath}
			{hasShelter}
			{hasCover}
			{hasBench}
			{hasTrashCan}
			bind:advertisementQty
			{hasCrossing}
			{hasFlatAccess}
			{hasWideAccess}
			{hasTactileAccess}
			bind:illuminationPosition
			bind:illuminationStrength
			{hasIlluminatedPath}
			{hasVisibilityFromArea}
			{hasVisibilityFromWithin}
			{isVisibleFromOutside}
			{hasWaitingTimes}
			{hasTicketSeller}
			{hasCostumerSupport}
			bind:parkingVisibilityImpairment
			bind:parkingLocalAccessImpairment
			bind:parkingAreaAccessImpairment
			bind:infrastructureCheckDate
			{latestPictureDate}
			{readOnly}
		/>
	{:else if currentSubform == subforms.extra}
		<ExtraForm bind:tags bind:tmpIssues bind:notes {readOnly} />
	{/if}
</div>
