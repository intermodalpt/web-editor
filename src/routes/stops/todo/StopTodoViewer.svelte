<script>
	import { createEventDispatcher } from 'svelte';
	import { derived } from 'svelte/store';
	import { apiServer } from '$lib/settings';
	import { isDeepEqual } from '$lib/utils';
	import { toast } from '$lib/stores';
	import Icon from '$lib/components/Icon.svelte';
	import CoordViewer from '$lib/components/CoordViewer.svelte';
	import BooleanToggle from '$lib/components/BooleanToggle.svelte';
	import { updateStopTodos } from '$lib/api';

	const dispatch = createEventDispatcher();

	export let canEdit = false;

	export let selectedStop;

	let todo = [];

	$: changed = !isDeepEqual(todo, $selectedStop?.todo ?? []);
	$: hasVerifyLocation = todo.includes('verifyLocation');
	$: hasImproveLocation = todo.includes('improveLocation');
	$: hasRecheckLater = todo.find((item) => item.recheckLater) != undefined;
	$: hasGatherPics = todo.find((item) => item.gatherPics) != undefined;
	$: hasGatherPano = todo.includes('gatherPano');
	$: hasRedoOsm = todo.find((item) => item.redoOsm) != undefined;
	$: hasAssertCopyright = todo.find((item) => item.assertCopyright) != undefined;
	$: hasReportIssue = todo.find((item) => item.reportIssue) != undefined;

	selectedStop.subscribe((stop) => {
		if (!stop) return;

		todo = structuredClone(stop?.todo ?? []);
	});

	const todoTypes = {
		verifyLocation: 1,
		improveLocation: 2,
		recheckLater: 3,
		gatherPics: 4,
		gatherPano: 5,
		redoOsm: 6,
		assertCopyright: 7,
		reportIssue: 8
	};
	const todoTypeNames = {
		[todoTypes.verifyLocation]: 'Verificar localização',
		[todoTypes.improveLocation]: 'Melhorar localização',
		[todoTypes.recheckLater]: 'Re-verificar',
		[todoTypes.gatherPics]: 'Fotografar',
		[todoTypes.gatherPano]: 'Fotografar panorama',
		[todoTypes.redoOsm]: 'Refazer OSM',
		[todoTypes.assertCopyright]: 'Refazer (Copyright)',
		[todoTypes.reportIssue]: 'Reportar ao operador'
	};

	let newTodoDialog;
	let newTodoType = null;
	let newTodoReason;
	let newTodoNotBefore;

	function resetTodoDialog() {
		newTodoType = null;
		newTodoReason = null;
		newTodoNotBefore = null;
	}

	function removeTodoItem(index) {
		todo = todo.filter((_, i) => i != index);
	}

	function handleAddTodo() {
		switch (newTodoType) {
			case todoTypes.verifyLocation:
				todo.push('verifyLocation');
				break;
			case todoTypes.improveLocation:
				todo.push('improveLocation');
				break;
			case todoTypes.recheckLater:
				todo.push({
					recheckLater: {
						reason: newTodoReason,
						not_before: newTodoNotBefore || null,
						req_date: new Date().toISOString().split('T')[0]
					}
				});
				break;
			case todoTypes.gatherPics:
				todo.push({
					gatherPics: {
						reason: newTodoReason
					}
				});
				break;
			case todoTypes.gatherPano:
				todo.push('gatherPano');
				break;
			case todoTypes.redoOsm:
				todo.push({
					redoOsm: {
						reason: newTodoReason
					}
				});
				break;
			case todoTypes.assertCopyright:
				todo.push({
					assertCopyright: {
						reason: newTodoReason
					}
				});
				break;
			case todoTypes.reportIssue:
				todo.push({
					reportIssue: {
						reason: newTodoReason
					}
				});
				break;
		}
		newTodoDialog.close();
		todo = todo;
	}

	async function handleSave() {
		await updateStopTodos($selectedStop.id, todo, {
			onSuccess: () => {
				toast('Guardado com sucesso', 'success');
				$selectedStop.todo = structuredClone(todo);
				dispatch('todo-update', { id: $selectedStop.id });
			},
			onError: () => {
				toast('Erro ao guardar', 'error');
			},
			onAfter: () => {
				dispatch('refresh');
			}
		});
	}
</script>

<div class="flex gap-1 items-center">
	<button
		class="btn btn-xs text-blue-200 bg-blue-500 border-blue-600"
		on:click={() => dispatch('fly-to', [$selectedStop.lon, $selectedStop.lat])}
	>
		{$selectedStop?.id}
	</button>
	<span class="font-bold">{$selectedStop?.name}</span>
</div>
<CoordViewer lat={$selectedStop.lat} lon={$selectedStop.lon} />

<div class="flex flex-col gap-2 p-2">
	{#each todo as item, i}
		<div class="relative bg-base-200 shadow-sm rounded-md p-2">
			<button
				class="btn btn-xs btn-error self-start absolute top-2 right-2"
				class:hidden={!canEdit}
				on:click={() => {
					removeTodoItem(i);
				}}
			>
				Del
			</button>
			{#if item == 'verifyLocation'}
				<span class="font-bold text-lg">Verificar a localização</span>
			{:else if item == 'improveLocation'}
				<span class="font-bold text-lg">Melhorar a localização</span>
			{:else if item.recheckLater}
				<div class="flex flex-col">
					<span class="font-bold text-lg">Re-verificar</span>
					<span>
						<span class="font-bold">Solicitado</span>
						<span>{item.recheckLater.req_date}</span>
					</span>
					{#if item.recheckLater.not_before}
						<span>{item.recheckLater.not_before}</span>
					{/if}
					<span>{item.recheckLater.reason}</span>
				</div>
			{:else if item.gatherPics}
				<div class="flex flex-col">
					<span class="font-bold text-lg">Fotografar</span>
					{#if item.reason}
						<span>{item.gatherPics.reason}</span>
					{/if}
				</div>
			{:else if item == 'gatherPano'}
				<span class="font-bold text-lg">Obter panorama</span>
			{:else if item.redoOsm}
				<div class="flex flex-col">
					<span class="font-bold text-lg">Refazer OSM</span>
					{#if item.redoOsm.reason}
						<span>{item.redoOsm.reason}</span>
					{/if}
				</div>
			{:else if item.assertCopyright}
				<div class="flex flex-col">
					<span class="font-bold text-lg">Refazer (Copyright)</span>
					<span>{item.assertCopyright.reason}</span>
				</div>
			{:else if item.reportIssue}
				<div class="flex flex-col">
					<span class="font-bold text-lg">Reportar problema</span>
					<span>{item.reportIssue.reason}</span>
				</div>
			{:else}
				<textarea class="w-full bg-red-200">{JSON.stringify(item)}</textarea>
			{/if}
		</div>
	{/each}
	<div class="flex gap-2" class:hidden={!canEdit}>
		<button
			class="btn btn-success btn-sm grow"
			on:click={() => {
				resetTodoDialog();
				newTodoDialog.showModal();
			}}
		>
			Adicionar
		</button>
		<button class="btn btn-primary btn-sm grow" disabled={!changed} on:click={handleSave}
			>Guardar</button
		>
	</div>
</div>

<dialog bind:this={newTodoDialog} class="modal modal-bottom sm:modal-middle">
	<div class="modal-box relative">
		<form method="dialog">
			<button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
				<Icon name="close" class="h-4 stroke-current" />
			</button>
		</form>
		<h3 class="font-bold text-lg">{newTodoType ? todoTypeNames[newTodoType] : 'Nova tarefa'}</h3>
		<form method="dialog" class="flex flex-col gap-1 mt-2 overflow-y-scroll">
			{#if newTodoType == null}
				<div class="join join-vertical">
					<button
						class="btn join-item"
						class:hidden={hasVerifyLocation}
						on:click={() => {
							newTodoType = todoTypes.verifyLocation;
							handleAddTodo();
						}}>Verificar localização</button
					>
					<button
						class="btn join-item"
						class:hidden={hasImproveLocation}
						on:click={() => {
							newTodoType = todoTypes.improveLocation;
							handleAddTodo();
						}}>Melhorar localização</button
					>
					<button
						class="btn join-item"
						class:hidden={hasRecheckLater}
						on:click={() => (newTodoType = todoTypes.recheckLater)}>Re-verificar</button
					>
					<button
						class="btn join-item"
						class:hidden={hasGatherPics}
						on:click={() => (newTodoType = todoTypes.gatherPics)}>Fotografar</button
					>
					<button
						class="btn join-item"
						class:hidden={hasGatherPano}
						on:click={() => {
							newTodoType = todoTypes.gatherPano;
							handleAddTodo();
						}}>Fotografar panorama</button
					>
					<button
						class="btn join-item"
						class:hidden={hasRedoOsm}
						on:click={() => (newTodoType = todoTypes.redoOsm)}>Refazer OSM</button
					>
					<button
						class="btn join-item"
						class:hidden={hasAssertCopyright}
						on:click={() => (newTodoType = todoTypes.assertCopyright)}>Refazer (Copyright)</button
					>
					<button
						class="btn join-item"
						class:hidden={hasReportIssue}
						on:click={() => (newTodoType = todoTypes.reportIssue)}>Reportar ao operador</button
					>
				</div>
			{:else if newTodoType == todoTypes.recheckLater}
				<div class="form-control w-full">
					<label class="input-group">
						<span class="w-36">Motivo</span>
						<input
							type="text"
							bind:value={newTodoReason}
							class="input input-bordered w-full input-sm"
							class:input-error={(newTodoReason ?? '').trim() == ''}
						/>
					</label>
				</div>
				<div class="form-control w-full">
					<label class="input-group">
						<span class="w-36">A partir de</span>
						<input
							type="date"
							on:change={(e) => {
								console.log(e.target.value);
							}}
							class="input input-bordered w-full input-sm"
						/>
					</label>
				</div>
			{:else if newTodoType == todoTypes.gatherPics}
				<div class="form-control w-full">
					<label class="input-group">
						<span class="w-36">Motivo</span>
						<input
							type="text"
							bind:value={newTodoReason}
							class="input input-bordered w-full input-sm"
						/>
					</label>
				</div>
			{:else if newTodoType == todoTypes.redoOsm}
				<div class="form-control w-full">
					<label class="input-group">
						<span class="w-36">Motivo</span>
						<input
							type="text"
							bind:value={newTodoReason}
							class="input input-bordered w-full input-sm"
						/>
					</label>
				</div>
			{:else if newTodoType == todoTypes.assertCopyright}
				<div class="form-control w-full">
					<label class="input-group">
						<span class="w-36">Motivo</span>
						<input
							type="text"
							bind:value={newTodoReason}
							class="input input-bordered w-full input-sm"
							class:input-error={(newTodoReason ?? '').trim() == ''}
						/>
					</label>
				</div>
			{:else if newTodoType == todoTypes.reportIssue}
				<div class="form-control w-full">
					<label class="input-group">
						<span class="w-36">Motivo</span>
						<input
							type="text"
							bind:value={newTodoReason}
							class="input input-bordered w-full input-sm"
							class:input-error={(newTodoReason ?? '').trim() == ''}
						/>
					</label>
				</div>
			{/if}
			{#if newTodoType != null}
				<div class="flex justify-end">
					<button class="btn btn-primary" on:click={handleAddTodo}>Adicionar</button>
				</div>
			{/if}
		</form>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
