<script>
	import SharedStreet from '$lib/instructions/artwork/sharedstreet.svg';
	import SidewalkCrossing from '$lib/instructions/artwork/sidewalk.svg';
	import SidewalkFar from '$lib/instructions/artwork/sidewalkfar.svg';
	import SidewalkPhysical from '$lib/instructions/artwork/sidewalkphysicalblocks.svg';
	import SidewalkRaised from '$lib/instructions/artwork/sidewalkraised.svg';
	import StreetSide from '$lib/instructions/artwork/streetside.svg';
</script>

<h2 id="has_sidewalk" class="card-title">
	Passeio/Plataforma <span class="text-xs"
		><span class="font-mono text-xs">has_sidewalk</span>;
		<span class="font-mono text-xs">has_sidewalked_path</span></span
	>
</h2>
<p>
	Passeios e plataformas são vias <b>reservadas</b> a tráfego pedonal que estejam
	<b>finalizadas</b> de modo a garantir viabilidade na deslocação do peão. Tem de se apresentar enquanto
	caminhos segregados no pavimento, mesmo que rebaixados ao nível da estrada.
</p>
<img class="h-40" src={SidewalkRaised} alt="Passeio elevado" />
<p class="pl-2 border-info border-l-2">
	Qualquer pavimento, mesmo que terra batida, é viável à consideração enquanto passeio, desde que
	cumpra os requisitos, esteja finalizado e seja destinado ao propósito (ex. trilhos de terra batida
	tratados para oferecer um caminho compactado e desprovido de vegetação).
</p>

<p class="pl-2 border-error border-l-2">
	Passeios danificados por falta de manutenção (ex. calçada arrancada por raízes) tais que são
	desconfortáveis ou não formam caminhos viáveis, chegando inclusive a criar risco à integridade física do passageiro, deverão de ser desconsiderados.
</p>

<p>
	O <b>passeio</b> de uma zona de paragem diz respeito ao local onde os passageiros aguardam. Já o
	<b>passeio no acesso</b> diz respeito à existência desta caraterística em pelo menos um dos caminhos
	viáveis, para todos os segmentos de via pública adjacentes.
</p>

<p class="pl-2 border-warning border-l-2">
	<b>Passeio no acesso</b> considera os acessos que não oferecem constrangimento ao peão, tenham ou não
	atravessamento de via. Caso o passeio seja suprimido em dado local mas o peão tenha uma alternativa
	razoável, este deverá ser considerado. Se o acesso com passeio é um incomodo substancial e a generalidade
	dos peões opta por caminhar pela via/berma, é considerado que não existe passeio no acesso.
</p>
<img class="h-64" src={SidewalkCrossing} alt="Passeio" />

<p class="pl-2 border-error border-l-2">
	Bermas não são contabilizadas como passeio, independentemente do tipo de pavimento.
</p>
<img class="h-40" src={StreetSide} alt="Paragem na berma" />

<p class="pl-2 border-info border-l-2">
	Espaços de via pública onde o piso é adequado e onde o peão se encontra inerentemente seguro (tais
	como zona de coexistência ou espaços por trás de barreiras físicas que manifestam a detenção do espaço
	pelo peão) são considerados passeios.
</p>
<img class="h-40" src={SidewalkPhysical} alt="Barreiras físicas" />
<img class="h-40" src={SharedStreet} alt="Via partilhada" />

<p class="pl-2 border-warning border-l-2">
	Se o passeio da paragem se encontra fora do local onde passageiro realmente tem de aguardar pelo
	autocarro (seja porque limitação seja), é considerado que não existe um passeio nessa paragem. Um
	exemplo seria um poste de paragem de tal forma retraído que não representa o local onde os
	passageiros aguardam o serviço.
</p>
<img class="h-40" src={SidewalkFar} alt="Passeio distante" />
