<script>
	import { createEventDispatcher } from 'svelte';
	import SubrouteGroup from './SubrouteGroup.svelte';
	import { annotateSubroute } from './aux.js';

	export let route;
	export let stops;
	export let canEdit = true;
	export let routeStops;

	const dispatch = createEventDispatcher();

	let initialSubroutes = [];
	$: subroutesByGroup = ((r) => {
		initialSubroutes = r.subroutes;

		// TODO move me elsewhere
		initialSubroutes.forEach((sr) => {
			if (sr.group == undefined) {
				sr.group = 0;
				sr._modified = true;
			}
		});

		let groups = Object.fromEntries(
			initialSubroutes.map((sr) => [sr.group, { group: sr.group, subroutes: [] }])
		);

		initialSubroutes.forEach((sr) => {
			groups[sr.group].subroutes.push(sr);
		});

		return Object.values(groups)
			.sort((a, b) => a.group - b.group)
			.map((g) => g.subroutes);
	})(route);

	function dropSubrouteIntoExistingGroup(e) {
		const data = e.detail;

		const [subroute] = subroutesByGroup[data.srcGroup].splice(data.itemIndex, 1);
		if (subroute.id != data.subrouteId) {
			console.error('subroute.id != data.subrouteId');
			return;
		}

		subroutesByGroup[data.dstGroup].push(subroute);

		if (subroutesByGroup[data.srcGroup].length == 0) {
			subroutesByGroup.splice(data.srcGroup, 1);
		}

		subroutesByGroup.forEach((subroutes, i) => {
			subroutes.forEach((subroute) => {
				subroute.group = i;
			});
		});

		subroutesByGroup = subroutesByGroup;
		subroute._updateModified();
		dispatch('subroute-change', { id: subroute.id });
	}

	function dropSubrouteIntoNewGroup(e) {
		const json = e.dataTransfer.getData('text/plain');
		const data = JSON.parse(json);

		const group = subroutesByGroup[data.groupIndex];
		if (!group || !group[data.itemIndex]) {
			return;
		}

		const [subroute] = subroutesByGroup[data.groupIndex].splice(data.itemIndex, 1);
		if (subroute.id != data.subrouteId) {
			console.error('subroute.id != data.subrouteId');
			return;
		}

		if (subroutesByGroup[data.groupIndex].length == 0) {
			subroutesByGroup.splice(data.groupIndex, 1);
		}

		subroutesByGroup.push([subroute]);

		subroutesByGroup.forEach((subroutes, i) => {
			subroutes.forEach((subroute) => {
				subroute.group = i;
			});
		});

		subroutesByGroup = subroutesByGroup;
		hoveringNewGroup = null;
		subroute._updateModified();
		dispatch('subroute-change', { id: subroute.id });
	}

	let hoveringNewGroup = false;

	function handleAddSubroute() {
		const sr = {
			id: -Date.now(),
			group: subroutesByGroup.length,
			circular: false,
			headsign: '',
			origin: '',
			destination: '',
			polyline: null,
			via: [],
			_deleted: false,
			_modified: true,
		};
		
		route.subroutes.push(annotateSubroute(sr));
		route = route;
		dispatch('subroute-change', { id: sr.id });
	}

	function handleDelSubroute(e) {
		const subroute = route.subroutes.find((sr) => sr.id == e.detail.id);

		if (
			!subroute.id < 0 &&
			!confirm(
				'Quer mesmo apagar a variante' +
					`${subroute.origin} - ${subroute.destination} (${subroute.id})?`
			)
		) {
			return;
		}

		subroute._deleted = true;

		if (subroute.id < 0) {
			route.subroutes = route.subroutes.filter((sr) => sr != subroute);
		} else {
			subroute._deleted = true;
		}
		route = route;
		dispatch('subroute-delete', { id: subroute.id });
	}
</script>

<div
	class="flex flex-col gap-4 overflow-y-auto"
	on:dragenter={() => (hoveringNewGroup = true)}
	on:dragleave={() => {
		hoveringNewGroup = false;
	}}
	on:drop={(event) => dropSubrouteIntoNewGroup(event)}
>
	{#each subroutesByGroup || [] as subroutes, i}
		<SubrouteGroup
			{subroutes}
			{stops}
			{routeStops}
			{canEdit}
			groupIndex={i}
			on:move-subroute={dropSubrouteIntoExistingGroup}
			on:subroute-change
			on:delete-subroute={handleDelSubroute}
		/>
	{/each}
	<button
		class="btn border-green-500 text-green-700 bg-green-100 hover:bg-green-300 btn-xs flex justify-center rounded-lg"
		class:hidden={!canEdit}
		ondragover="return false"
		on:click={handleAddSubroute}
	>
		+
	</button>
</div>