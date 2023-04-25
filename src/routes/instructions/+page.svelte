<script>
	import InstructionCard from '$lib/instructions/InstructionCard.svelte';

	import Flags from '$lib/instructions/stopattrs/Flags.svelte';
	import Schedules from '$lib/instructions/stopattrs/Schedules.svelte';
	import Sidewalk from '$lib/instructions/stopattrs/Sidewalk.svelte';
	import Bench from '$lib/instructions/stopattrs/Bench.svelte';
	import Trash from '$lib/instructions/stopattrs/Trash.svelte';
	import WaitingTimes from '$lib/instructions/stopattrs/WaitingTimes.svelte';
	import CostumerSupport from '$lib/instructions/stopattrs/CostumerSupport.svelte';
	import Ads from '$lib/instructions/stopattrs/Ads.svelte';
	import Crossing from '$lib/instructions/stopattrs/Crossing.svelte';
	import FlatAccess from '$lib/instructions/stopattrs/FlatAccess.svelte';
	import WideAccess from '$lib/instructions/stopattrs/WideAccess.svelte';
	import TactileAccess from '$lib/instructions/stopattrs/TactileAccess.svelte';
	import IlluminationPosition from '$lib/instructions/stopattrs/IlluminationPosition.svelte';
	import IlluminationStrength from '$lib/instructions/stopattrs/IlluminationStrength.svelte';
	import IlluminatedPath from '$lib/instructions/stopattrs/IlluminatedPath.svelte';
	import VisibilityArea from '$lib/instructions/stopattrs/VisibilityArea.svelte';
	import VisibilityWithin from '$lib/instructions/stopattrs/VisibilityWithin.svelte';
	import VisibleFromOutside from '$lib/instructions/stopattrs/VisibleFromOutside.svelte';
	import ParkingVisibilityImpairment from '$lib/instructions/stopattrs/ParkingVisibilityImpairment.svelte';
	import ParkingLocalImpairment from '$lib/instructions/stopattrs/ParkingLocalImpairment.svelte';
	import ParkingAccessImpairment from '$lib/instructions/stopattrs/ParkingAccessImpairment.svelte';
	import Issues from '$lib/instructions/stopattrs/Issues.svelte';
</script>

<svelte:head>
	<title>Intermodal - Instruções</title>
	<meta name="description" content="Instruções" />
</svelte:head>

<div class="flex flex-col gap-4 w-full max-w-5xl mt-4 self-center">
	<div class="card w-full bg-base-100 shadow-md rounded-lg">
		<div class="card-body">
			<h2 class="card-title">Qual é a licença dos dados?</h2>
			<p>
				Ao submeterem-se dados e fotografias para o Intermodal
				<b>concede-se uma licença perpetua e sem restrições ao projeto</b>, para facilidade de
				gestão legal. Nós comprometemo-nos a creditar o autor como tal e garantimos que todos os
				dados submetidos serão colocados no domínio público com uma licença aberta. Serão utilizadas
				licenças
				<a href="https://creativecommons.org/" class="link">Creative Commons</a> (por escolher entre
				BY-SA e BY-NC-SA),
				<a href="https://opendatacommons.org/licenses/odbl/summary/" class="link"
					>Open Data Commons</a
				> ou análogas em matéria de abertura.
			</p>
		</div>
	</div>

	<div class="card w-full bg-base-100 shadow-md rounded-lg">
		<div id="edit-stops" class="card-body">
			<h2 class="card-title">Como editar paragens</h2>
			<p>
				Abrindo o editor de paragens é possível, selecionando, visualizar os meta-atributos de cada
				paragem.
			</p>
			<p>
				É importante que o editor tenha em consideração as orientações do <a
					href="/instructions/stopattrs"
					class="link">guia de meta-atributos</a
				>.
			</p>
			<p>
				Contas gerais permitem um grau finito de edição. Para estas contas, a generalidade dos
				atributos são de edição aberta sujeita a moderação todavia alguns são restritos a contas
				confiadas.
			</p>
		</div>
	</div>
	<div class="card w-full bg-base-100 shadow-md rounded-lg">
		<div class="card-body">
			<h2 class="card-title">Como adicionar fotografias</h2>
			<p>...</p>
		</div>
	</div>
	<div class="card w-full bg-base-100 shadow-md rounded-lg">
		<div class="card-body">
			<h2 class="card-title">Porquê é que apenas eu consigo ver as minhas alterações?</h2>
			<p>
				A localidade das alterações significa que estão numa fila de moderação. Isto não quer dizer
				que existe algo de errado com as mesmas, apenas que ainda não foram aprovadas.
			</p>
		</div>
	</div>
	<div class="card w-full bg-base-100 shadow-md rounded-lg">
		<div class="card-body">
			<h2 class="card-title">Como adicionar linhas, horários ou calendários?</h2>
			<p>
				Essas informações só podem ser alteradas por elementos da equipa de moderação do Intermodal
			</p>
		</div>
	</div>
</div>
