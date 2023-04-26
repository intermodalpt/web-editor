<script>
	import ScheduleCMet from '$lib/instructions/artwork/schedule-cmet.svg';
	import SchedulesWidget from '$lib/instructions/widgets/Schedules.svelte';

	let exampleTab = 0;

	const cmetSchedule = [
		{
			code: '1001',
			discriminator: '01022023',
			type: 'origin'
		}
	];

	const cmetSchedule2 = [
		{
			code: '1001',
			discriminator: '01022023',
			type: 'prediction'
		}
	];
</script>

<h2 id="schedules" class="card-title">
	Horários <span class="font-mono text-xs">schedules</span>
</h2>
<p>
	Horários são suplementos informacionais <b>estáticos</b> que indicam quando é que é prevista a passagem
	de serviços. Podem ser gerais (respeitantes à rede), bem como podem ser afetos a linhas.
</p>
<p>
	Horários podem indicar <b>partidas da origem</b>, competindo ao passageiro deduzir a hora de
	passagem; podem indicar <b>previsões de passagem</b> no local ou podem indicar
	<b>frequências esperadas de passagem</b>.
</p>
<p>
	Cada horário, quando possível, deve de ser inserido com um código que indique a sua versão (<b
		>discriminador</b
	>). No caso de operadoras como a Carris Metropolitana, tal código é a data de emissão (tipicamente
	escrito no formato <span class="font-mono">ddmmaaa</span>).
</p>
<p class="pl-2 border-warning border-l-2">
	<b>Não deverá de haver inserção parcial de informação de horários.</b><br />
	As inserções deverão de ser plenas (passagem de nada para a totalidade dos horários existentes no local).
</p>

<h3 class="text-lg font-semibold">Exemplos</h3>
<div class="btn-group btn-group-vertical md:btn-group-horizontal">
	<button class="btn" class:btn-active={exampleTab === 0} on:click={() => (exampleTab = 0)}
		>Horário Carris Metropolitana</button
	>
</div>

{#if exampleTab === 0}
	<div class="flex flex-wrap items-start justify-between">
		<img class="h-72 grow" src={ScheduleCMet} alt="Horário Carris Metropolitana" />
		<div class="flex flex-col basis-80 gap-2">
			<p>Caso o horário diga respeito a partidas da paragem inícial:</p>
			<SchedulesWidget schedulesData={cmetSchedule} />
			<hr class="py-2" />
			<p>Caso o horário diga respeito à paragem em que se encontra:</p>
			<SchedulesWidget schedulesData={cmetSchedule2} />
		</div>
	</div>
{/if}

<div class="pl-2 border-info border-l-2">
	É possível concluir a paragem à qual o horário diz respeito:
	<ul class="list-disc ml-4">
		<li>Verificando se o código no horário corresponde ao código no postalete.</li>
		Ou
		<li>
			Verificando se paragem atual tem uma seta na esquerda do seu nome no diagrama da espinha.
		</li>
	</ul>
</div>
<p class="pl-2 border-info border-l-2">A ordem de inserção não importa.</p>
