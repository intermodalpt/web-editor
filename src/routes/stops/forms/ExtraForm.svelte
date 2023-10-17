<script>
	export let tags;
	export let tmpIssues;
	export let notes;

	export let readOnly = true;

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

	function removeIssue(tag) {
		tmpIssues.splice(tmpIssues.indexOf(tag), 1);
		tmpIssues = tmpIssues;
	}
</script>

<div class="flex gap-2 flex-wrap">
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
					disabled={readOnly}
				/>
				<input
					class="btn btn-sm btn-primary"
					type="button"
					value="+"
					on:click={addTag}
					on:keypress={addTag}
					disabled={readOnly}
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
			disabled={readOnly}
		/>
	</div>
</div>
