<script lang="ts">
	import ChangeViewer from '$lib/changes/ChangeViewer.svelte';

	export let data;
	const decidedContributions = data.decidedContributions;
	const undecidedContributions = data.undecidedContributions;
	const permissions = data.permissions;
</script>

<svelte:head>
	<title>Perfil</title>
	<meta name="description" content="Perfil" />
</svelte:head>

<div class="flex flex-col gap-4 py-4">
	<div class="card card-compact self-center bg-base-100 shadow-sm w-full max-w-[900px]">
		<div class="card-body">
			<h2 class="card-title">
				{data.uname}<span class="text-xs">(#{data.uid})</span>
			</h2>
			<h2 class="card-title">Permissões</h2>

			<div class="flex flex-col gap-4">
				{#each Object.entries(permissions) as [scope, perms]}
					{#if Object.keys(perms).length > 0}
						<div>
							<h3 class="text-lg">{scope}</h3>
							<div class="flex gap-4 ml-4 flex-wrap max-w-full">
								{#each Object.entries(perms) as [key, val]}
									<div class="flex items-start">
										<span>{key}</span>
										{#if val}
											<i class="bg-success p-1 rounded-full"></i>
										{:else}
											<i class="bg-error p-1 rounded-full"></i>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/if}
				{/each}
			</div>
		</div>
	</div>

	<div class="card card-compact self-center bg-base-100 shadow-sm w-full max-w-[900px]">
		<div class="card-body">
			<h2 class="card-title">Alterações pendentes</h2>
			{#if undecidedContributions.length === 0}
				Sem contribuições pendentes.
			{/if}
			<ul>
				{#each undecidedContributions as contribution}
					<li>
						<h2 class="card-title text-lg">
							#{contribution.id}
							{new Date(contribution.submission_date).toString().split(' GMT')[0]}
						</h2>
						<ChangeViewer change={contribution.change} />
						{#if contribution.comment}
							<h4 class="font-bold">Comentário:</h4>
							<textarea disabled class="w-full">{contribution.comment}</textarea>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	</div>
	<div class="card card-compact self-center bg-base-100 shadow-sm w-full max-w-[900px]">
		<div class="card-body">
			<h2 class="card-title">Contribuições aceites</h2>
			{#if decidedContributions.length === 0}
				Sem contribuições aceites.
			{/if}
			<ul>
				{#each decidedContributions as contribution}
					<li>
						<h2 class="card-title text-lg">
							#{contribution.id}
							{new Date(contribution.submission_date).toString().split(' GMT')[0]}
						</h2>
						<ChangeViewer change={contribution.change} />
						{#if contribution.comment}
							<h4 class="font-bold">Comentário:</h4>
							<textarea disabled class="w-full">{contribution.comment}</textarea>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	</div>
</div>
