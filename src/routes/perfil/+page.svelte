<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import Menu from './Menu.svelte';

	export let data;
	const info = data.info;
	const stats = data.stats;

	const registrationDate = new Date(info.registration_date);
	const dateOptions = { year: 'numeric', month: 'numeric', day: 'numeric' };
	const formattedRegistrationDate = registrationDate.toLocaleDateString('pt-PT', dateOptions);
</script>

<div class="card-body">
	<Menu {data} page="root" />

	{#if info.survey_version == 0}
		<div role="alert" class="alert border-info shadow-sm">
			<Icon name="info" class="h-6 w-6" />
			<div>
				<h3 class="font-bold">Inquérito geral</h3>
				<div class="text-xs">Conte-nos sobre si</div>
			</div>
			<div>
				<button class="btn btn-sm btn-info">Abrir</button>
				<!-- <button class="btn btn-sm btn-neutral">Não quero</button> -->
			</div>
		</div>
	{/if}

	{#if info.verification_level == 0}
		<div role="alert" class="alert border-error shadow-sm">
			<Icon name="envelope" class="h-6 w-6" />
			<div>
				<h3 class="font-bold">Conta não verificada</h3>
				<div class="text-xs">Valide a sua conta através do seu email ou falando connosco</div>
			</div>
			<button class="btn btn-sm btn-error">Validar por email</button>
		</div>
	{/if}

	{#if info.is_suspended}
		<div role="alert" class="alert border-neutral shadow-sm">
			<Icon name="block" class="h-6 w-6" />
			<div>
				<h3 class="font-bold">A sua conta foi suspensa</h3>
				<div class="text-xs">Não lhe será possível fazer qualquer edição</div>
			</div>
		</div>
	{/if}

	<div class="stats border-2 stats-vertical md:stats-horizontal">
		<div class="stat place-items-center">
			<div class="stat-title">Registo</div>
			<div class="stat-value">{formattedRegistrationDate}</div>
		</div>
		<div class="stat place-items-center">
			<div class="stat-title">Contribuições</div>
			<div class="stat-value">{stats?.contributions_cnt}</div>
		</div>
		<div class="stat place-items-center">
			<div class="stat-title">Alterações</div>
			<div class="stat-value">{stats?.changelog_cnt}</div>
		</div>
		<div class="stat place-items-center">
			<div class="stat-title">Fotografias</div>
			<div class="stat-value">{stats?.pics_cnt}</div>
		</div>
	</div>
</div>
