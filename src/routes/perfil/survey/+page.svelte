<script lang="ts">
	import { uploadSurvey } from '$lib/api';
	import Survey from '$lib/components/Survey.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { toast } from '$lib/stores';
	import Menu from '../Menu.svelte';
	import { tick } from 'svelte';

	export let data;

	let survey = data.survey;
	if (survey.version != 1) {
		survey.data = undefined;
	}

	let isProcessing = false;

	async function save() {
		isProcessing = true;
		await tick();

		await uploadSurvey(
			{
				user_id: data.uid,
				survey: survey.data
			},
			{
				onSuccess: () => {
					toast('Guardado com sucesso', 'success');
				},
				onError: () => {
					toast('Erro a guardar.', 'error');
				},
				onAfter: () => {
					isProcessing = false;
				}
			}
		);
	}
</script>

<Menu {data} page="survey" />

<div class="card-body">
	<p>
		Este inquérito serve para nos ajudar a saber quem temos na comunidade. É de preenchimento
		<b>opcional</b>.
	</p>
	<p>Nenhum destes dados será partilhado ou utilizado para comunicação em massa.</p>

	<Survey bind:data={survey.data} />

	<div class="flex justify-end items-center">
		{#if isProcessing}
			<Icon name="spinner" class="animate-spin mr-3 h-6 w-6" />
		{/if}
		<button class="btn btn-primary" on:click={save} disabled={isProcessing}>Enviar</button>
	</div>
</div>
