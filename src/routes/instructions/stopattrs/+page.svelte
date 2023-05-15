<script>
	import InstructionCard from '$lib/instructions/InstructionCard.svelte';

	import Flags from '$lib/instructions/stopattrs/Flags.svelte';
	import Schedules from '$lib/instructions/stopattrs/Schedules.svelte';
	import Sidewalk from '$lib/instructions/stopattrs/Sidewalk.svelte';
	import Shelter from '$lib/instructions/stopattrs/Shelter.svelte';
	import Cover from '$lib/instructions/stopattrs/Cover.svelte';
	import Bench from '$lib/instructions/stopattrs/Bench.svelte';
	import Trash from '$lib/instructions/stopattrs/Trash.svelte';
	import WaitingTimes from '$lib/instructions/stopattrs/WaitingTimes.svelte';
	import CostumerSupport from '$lib/instructions/stopattrs/CostumerSupport.svelte';
	import TicketSeller from '$lib/instructions/stopattrs/TicketSeller.svelte';
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
	<title>Intermodal - Atributos de paragens</title>
	<meta name="description" content="Atributos de paragens" />
</svelte:head>

<div class="flex flex-col gap-2 w-full max-w-5xl mt-4 self-center">
	<div class="card bg-base-100 shadow-lg rounded-lg">
		<div class="card-body">
			<h1 class="card-title">Indice de atributos de paragens</h1>
			<ul>
				<li><a class="link" href="#flags">Postaletes</a></li>
				<li><a class="link" href="#schedules">Horários</a></li>
				<li><a class="link" href="#has_sidewalk">Passeio/Passeio no acesso</a></li>
				<li><a class="link" href="#has_shelter">Abrigo</a></li>
				<li><a class="link" href="#has_cover">Coberura</a></li>
				<li><a class="link" href="#has_bench">Banco</a></li>
				<li><a class="link" href="#has_trash_can">Balde do lixo</a></li>
				<li><a class="link" href="#has_waiting_times">Tempos de espera</a></li>
				<li><a class="link" href="#has_ticket_seller">Ponto de venda</a></li>
				<li><a class="link" href="#has_costumer_support">Apoio ao cliente</a></li>
				<li><a class="link" href="#advertisements">Anúncios</a></li>
				<li><a class="link" href="#has_crossing">Atravessamento de via</a></li>
				<li><a class="link" href="#has_flat_access">Acesso sem ressaltos</a></li>
				<li><a class="link" href="#has_wide_access">Acesso largo</a></li>
				<li><a class="link" href="#has_tactile_access">Acesso tatil</a></li>
				<li><a class="link" href="#illumination_position">Posição da iluminação</a></li>
				<li><a class="link" href="#illumination_strength">Intensidade da iluminação</a></li>
				<li><a class="link" href="#has_illuminated_path">Iluminação no acesso</a></li>
				<li><a class="link" href="#has_visibility_from_area">Visibilidade da paragem para o veiculo</a></li>
				<li><a class="link" href="#has_visibility_from_within">Visibilidade do abrigo para o veiculo</a></li>
				<li><a class="link" href="#is_visible_from_outside">Visibilidade do veiculo para a paragem</a></li>
				<li><a class="link" href="#parking_visibility_impairment">Parque automóvel / Limitação visual</a></li>
				<li><a class="link" href="#parking_local_access_impairment">Parque automóvel / Disfuncional à paragem</a></li>
				<li><a class="link" href="#parking_area_access_impairment">Parque automóvel / Disfuncional ao acesso</a></li>
				<li><a class="link" href="#issues">Defeitos</a></li>
			</ul>
		</div>
	</div>

	<InstructionCard><Flags /></InstructionCard>
	<InstructionCard><Schedules /></InstructionCard>
	<InstructionCard><Sidewalk /></InstructionCard>
	<InstructionCard><Shelter /></InstructionCard>
	<InstructionCard><Cover /></InstructionCard>
	<InstructionCard><Bench /></InstructionCard>
	<InstructionCard><Trash /></InstructionCard>
	<InstructionCard><WaitingTimes /></InstructionCard>
	<InstructionCard><CostumerSupport /></InstructionCard>
	<InstructionCard><TicketSeller /></InstructionCard>
	<InstructionCard><Ads /></InstructionCard>
	<InstructionCard><Crossing /></InstructionCard>
	<InstructionCard><FlatAccess /></InstructionCard>
	<InstructionCard><WideAccess /></InstructionCard>
	<InstructionCard><TactileAccess /></InstructionCard>
	<InstructionCard><IlluminationPosition /></InstructionCard>
	<InstructionCard><IlluminationStrength /></InstructionCard>
	<InstructionCard><IlluminatedPath /></InstructionCard>
	<InstructionCard><VisibilityArea /></InstructionCard>
	<InstructionCard><VisibilityWithin /></InstructionCard>
	<InstructionCard><VisibleFromOutside /></InstructionCard>
	<InstructionCard><ParkingVisibilityImpairment /></InstructionCard>
	<InstructionCard><ParkingLocalImpairment /></InstructionCard>
	<InstructionCard><ParkingAccessImpairment /></InstructionCard>
	<InstructionCard><Issues /></InstructionCard>
</div>
