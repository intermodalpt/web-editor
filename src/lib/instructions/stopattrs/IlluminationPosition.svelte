<script>
	import LightOwnPole from '$lib/instructions/artwork/lightownpole.svg';
	import LightOwnShelter from '$lib/instructions/artwork/lightownshelter.svg';

	import LightDirect from '$lib/instructions/artwork/lightdirect.svg';
	import LightDirectFar from '$lib/instructions/artwork/lightdirectfar.svg';

	import LightIndirect from '$lib/instructions/artwork/lightindirect.svg';
</script>

<h2 id="illumination_position" class="card-title">
	Posição da iluminação <span class="font-mono text-xs">illumination_position</span>
</h2>
<span class="text-xs">Referente à visibilidade noturna.</span>
<p>
	Infraestruturas auto-iluminadas tem <b>iluminação própria</b>. Iluminação posicionada
	imediatamente acima ou proveniente de feixes direcionados (como holofotes) conta como
	<b>iluminação direta</b>. Toda a demais iluminação é contabilizada como
	<b>iluminação indireta</b>. A aplicação ocorre por esta ordem, do mais notório para o menos
	notório.
</p>

<p class="-ml-2 pl-2 border-info border-l-2">
	Este atributo pode ser preenchido com fontes de iluminação fundidas, dado que as mesmas
	tipicamente operam.<br />
	Nesta circunstância também deve de ser colocado o <i>defeito</i> "<i>Iluminação fundida</i>".
</p>

<p class="-ml-2 pl-2 border-warning border-l-2">
	A posição deverá sempre de dizer respeito à fonte primária de iluminação, mesmo que esta se
	encontre fundida.
</p>

<h3 class="text-lg font-semibold">Exemplos</h3>
<div class="ml-2">
	<h4 class="text-md font-semibold">Iluminação própria</h4>
	<div class="flex flex-wrap gap-4">
		<img class="h-64" src={LightOwnPole} alt="Luz própria" />
		<img class="h-64" src={LightOwnShelter} alt="Luz própria num abrigo" />
	</div>
	<h4 class="text-md font-semibold mt-4">Iluminação Direta</h4>
	<div class="flex flex-wrap gap-4">
		<img class="h-52" src={LightDirect} alt="Luz direta de cima" />
		<img class="h-52" src={LightDirectFar} alt="Luz direta de um holofote" />
	</div>
	<h4 class="text-md font-semibold mt-4">Iluminação indireta</h4>
	<div class="flex">
		<img class="h-52" src={LightIndirect} alt="Luz indireta" />
	</div>
</div>
