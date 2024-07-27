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
			<table class="table table-compact">
				<thead><tr><td>Permissões</td><td /></tr></thead>
				<tbody>
					{#each permissions as permission}
						<tr>
							<td>{permission.perm}</td>
							<td>
								<ul>
									{#each Object.entries(permission) as [key, val]}
										{#if key !== 'perm'}
											<li class="flex gap-1">
												<b>{key}</b>
												{#if val}
													<span class="text-success font-bold">Sim</span>
												{:else}
													<span class="text-error font-bold">Não</span>
												{/if}
											</li>
										{/if}
									{/each}
								</ul>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
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
							<textarea disable class="w-full">{contribution.comment}</textarea>
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
							<textarea disable class="w-full">{contribution.comment}</textarea>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	</div>
</div>
