<script>
	import FlagsMess from '$lib/instructions/artwork/flags-mess.svg';
	import FlagsDiverse from '$lib/instructions/artwork/flags-diverse.svg';
	import FlagsWidget from '$lib/instructions/widgets/Flags.svelte';

	let exampleTab = 0;

	const flagsDataMess = [
		{
			id: '123456',
			name: 'Rua das Flores',
			route_codes: ['1001', '1002', '1701', '1702', '1703', '1704', '1710']
		},
		{
			id: '123999',
			name: 'Rua d Flors',
			route_codes: ['4701', '4702']
		},
		{
			id: '123999',
			name: 'Rua d Flors (Sombra)',
			route_codes: ['4901', '4902']
		}
	];

	const flagsDataDiverse = [
		{
			id: '10',
			name: null,
			route_codes: ['2', '702']
		},
		{
			id: '123456',
			name: 'Rua das Flores',
			route_codes: ['1001', '1002', '2345']
		},
		{
			id: '01234',
			name: 'Ciclovia Moedas',
			route_codes: ['700', '701']
		},
		{
			id: '',
			name: '',
			route_codes: ['M1', 'M10']
		}
	];
</script>

<h2 id="flags" class="card-title">Postaletes <span class="font-mono text-xs">flags</span></h2>
<p>
	Postaletes são os identificadores (geralmente textuais) primários da paragem. Cada postalete
	contem os serviços efetuados no ponto de paragem bem como, tipicamente, um nome e um
	identificador.
</p>
<p>
	Múltiplos postaletes com o mesmo identificador são considerados o mesmo pelo que deverão de ser
	uma entrada única. Postaletes com o mesmo identificador e nomes distintos são um erro que deverá
	de ser reportado ao projeto e à operadora. Em caso de dúvida, poderão ser colocados enquanto
	entradas distintas.
</p>
<p class="pl-2 border-warning border-l-2">
	<b>Não deverá de haver inserção parcial de informação de postaletes.</b><br />
	As inserções deverão de ser plenas (passagem de nada para a totalidade dos postaletes bem como totalidade
	das linhas afetadas).
</p>

<h3 class="text-lg font-semibold">Exemplos</h3>
<div class="btn-group btn-group-vertical md:btn-group-horizontal">
	<button class="btn" class:btn-active={exampleTab === 0} on:click={() => (exampleTab = 0)}
		>Múltiplas operadoras</button
	>
	<button class="btn" class:btn-active={exampleTab === 1} on:click={() => (exampleTab = 1)}
		>Postaletes conflituosos</button
	>
</div>

{#if exampleTab === 0}
	<div class="flex flex-wrap items-start justify-between">
		<img class="h-96 grow" src={FlagsDiverse} alt="Múltiplos postaletes" />
		<FlagsWidget flagsData={flagsDataDiverse} />
	</div>
{:else if exampleTab === 1}
	<div class="flex flex-wrap items-start justify-between">
		<img class="h-96 grow" src={FlagsMess} alt="Postaletes conflituosos" />
		<FlagsWidget flagsData={flagsDataMess} />
	</div>
{/if}

<p class="pl-2 border-info border-l-2">
    A ordem de inserção não importa.
</p>