<svelte:head>
	<title>Intermodal - Instruções</title>
	<meta name="description" content="Instruções" />
</svelte:head>

<div class="flex flex-col gap-2 w-full max-w-5xl mt-4 self-center">
	<div class="card w-full bg-base-100 shadow-xl">
		<div class="card-body">
			<h2 class="card-title">Qual é a licensa dos dados?</h2>
			<p>
				Ao submeterem-se dados e fotografias para o Intermodal
				<b>concede-se uma licensa perpetua e sem restrições ao projeto</b>,
				para facilidade de gestão legal. Nós comprometemo-nos a creditar o autor como tal e garantimos
				que todos os dados submetidos serão colocados no dominio público com uma licensa aberta. Serão
				utilizadas licensas
				<a href="https://creativecommons.org/" class="link">Creative Commons</a> (por escolher entre BY-SA e BY-NC-SA),
				<a href="https://opendatacommons.org/licenses/odbl/summary/" class="link"
					>Open Data Commons</a
				> ou análogas em matéria de abertura.
			</p>
		</div>
	</div>
	<div class="card w-full bg-base-100 shadow-xl">
		<div id="edit-stops" class="card-body">
			<h2 class="card-title">Como editar paragens</h2>
			<p>A adição de paragens ocorre no menu "paragens".</p>
			<ul>
				<li>
					<b>Postaletes</b>(este nome mudará) - Se a paragem está devidamente assinalada,
					típicamente por um postalete (bandeira rigida que identifica o serviço da paragem).
				</li>
				<li>
					<b>Horários</b> - Se a paragem dispõe da TOTALIDADE dos horários efectuados (este atributo
					mudará para um formato "para x de y horários").
				</li>
				<li>
					<b>Passeio</b> - Se a paragem dispõe de passeio na localização <b>e</b> no acesso.
				</li>
				<li>
					<b>Abrigo</b> - Se a paragem se encontra coberta, protegida contra a chuva; idealmente contra
					o vento.
				</li>
				<li>
					<b>Banco</b> - Se a paragem dispõe de local para sentar (este atributo poderá mudar para um
					número de lugares sentados).
				</li>
				<li>
					<b>Caixote do lixo</b> - Se existe nas imediações da paragem um caixote do lixo.
					Imediações entende-se pela área de influência da paragem, onde um passageiro pode aceder
					com esforço mínimo e sem arriscar perder o transporte.<br />
					Em estradas de baixo trafego e de boa visibilidade, o lado oposto da rua pode ser considerado
					imediações; já numa grande avenida, imediações serão as laterais da paragem. Uma regra de algibeira
					poderá ser até 20 metros ou 10 segundos para alcançar o balde do lixo.
				</li>
				<li>
					<b>Estacionamento abusivo</b> (Este atributo mudará) - Se a paragem se encontra numa
					situação em que:
					<ol class="list-disc ml-8">
						<li>É muito propicio pessoas lá deixarem o carro "só um minuto",</li>
						<li>
							A paragem não tem acesso à estrada que não através de um estacionamento que não foi
							removido aquando da criação.
						</li>
						<li>
							Um estacionamento (que pode ou não ser legal, desde que frequênte) corta
							recorrentemente a visibilidade sobre a paragem (mesmo que apenas sobre o abrigo).
						</li>
					</ol>
					Ou qualquer outra situação em que a presença passíva de veiculos prejudica substâncialmente
					o uso da paragem.
				</li>
				<li>
					<b>Informação obsoleta</b> - Assinala a existência de informação que já não se aplica.
					<ol class="list-disc ml-8">
						<li>Postaletes antigos</li>
						<li>Horários que já não se praticam</li>
						<li>Avisos respetivos a alterações que já não vigoram</li>
					</ol>
					(Por favor indicar motivo no campo das notas)
				</li>
				<li>
					<b>Danificada</b> - O material da paragem encontra-se fisicamente degradado ao ponto de
					prejudicar a utilização.
					<ul class="list-disc ml-8">
						<li>Abrigos com paredes em falta</li>
						<li>Banco partido</li>
						<li>Postes caidos</li>
						<li>Infiltrações</li>
					</ul>
					(Por favor indicar motivo no campo das notas)
				</li>
				<li>
					<b>Vandalizada</b> - Apesar do material se encontrar fisicamente utilizável, existe uma
					forte presença de vandalismo.
					<ul class="list-disc ml-8">
						<li>Graffiti</li>
						<li>Rasgões ou desenhos nos horários</li>
						<li>
							Publicidade (incluindo se afixada por individuos autorizados; o critério não é
							legalidade é o estrago ao serviço)
						</li>
					</ul>
				</li>
				<li>
					<b>Atravessamento de via</b> - Se uma forma segura de atravessar a via nas imediações próximas
					à paragem. Regra geral, isto implica uma passadeira a menos de 30-50 metros. Em grandes avenidas
					a tolerância deverá de ser maior. Uma rua local de muito baixo transito considera-se atravessavel
					mesmo que sem passadeira, desde que não exista possibilidade de atropelamento sem malicia.
				</li>
				<li>
					<b>Acesso de mobilidade reduzida</b> - Se existe infraestrutura de suporte a pessoas com problemas
					de locomoção ou invisuais. Este atributo mudará, mas para já é uma visão geral, portanto depende
					da existência de pavimento rebaixado, idealmente táctil.
				</li>
				<li>
					<b>Posição da iluminação</b> - Própria se a paragem se auto-ilumina; directa caso se
					enconte por cima ou se trate de um holofote direccionado à paragem; indirecta se a
					iluminação da paragem
					<div class="overflow-x-auto">
						<img src="/iluminacao-forca.svg" class="h-48 max-w-none" />
					</div>
				</li>
				<li>
					<b>Força da iluminação</b> - Referente à visibilidade noturna
					<ul class="list-disc ml-8">
						<li>
							<b>Forte</b>: Uma pessoa consegue confortávelmente estar a ler na paragem. Tudo é
							abundântemente visível
						</li>
						<li>
							<b>Média</b>: As imediações são bem visíveis. Um veiculo não terá problema em ver a
							paragem e pessoas nas imediações.
						</li>
						<li><b>Fraca</b>: Existe luz suficiente para perceber por onde andar e pouco mais.</li>
						<li>
							<b>Sem iluminação</b>: A iluminação é insuficiente para que um peão a olho nú consiga
							perceber, sem esforço, o meio em que a paragem se insere.
						</li>
					</ul>
				</li>
				<li>
					<b>Iluminação no acesso</b> - O trajecto até à paragem também tem uma iluminação no mínimo
					fraca (o traçado é perceptivel sem esforço).
				</li>
				<li>
					<b>Visibilidade da paragem para o veiculo</b> - Um passageiro nas imediações da paragem consegue
					ver os veiculos chegar.
				</li>
				<li>
					<b>Visibilidade do abrigo para o veiculo</b> - Um passageiro dentro do abrigo (idealmente sentado)
					consegue ver os veiculos chegar.
				</li>
				<li>
					<b>Visibilidade do veiculo para a paragem</b> - Um motorista consegue concluir se uma paragem
					tem passageiros (no exterior) enquanto ainda vai a tempo de efetual paragem. (Um problema por
					exemplo quando o acesso à paragem implica um desvio atempado)
				</li>
				<li>
					<b>Notas</b> - Servem para indicar detalhes sobre a paragem que são notórios e não se enquadram
					no restante formulário. Por exemplo: "A paragem deste lado faz serviço de empresa xyz mas a
					do lado oposto não. Poderá ser um erro, alguém que confirme sff."
				</li>
			</ul>
		</div>
	</div>
	<div class="card w-full bg-base-100 shadow-xl">
		<div class="card-body">
			<h2 class="card-title">Como adicionar fotografias</h2>
			<p>...</p>
		</div>
	</div>
	<div class="card w-full bg-base-100 shadow-xl">
		<div class="card-body">
			<h2 class="card-title">Porquê é que deixei de conseguir ver as minhas alterações?</h2>
			<p>
				Infelizmente, a partir do momento em que se recarregue o editor as alterações são perdidas
				da memória. Estão todavia guardadas na base de dados do serviço e serão visiveis assim que
				forem aprovadas (processo que poderá levar alguns dias). Poderás apressar o processo
				submetendo fotografias que confirmem o indicado.
			</p>
		</div>
	</div>
	<div class="card w-full bg-base-100 shadow-xl">
		<div class="card-body">
			<h2 class="card-title">Como adicionar linhas, horário ou calendários?</h2>
			<p>
				Essas informações só podem ser alteradas por elementos da equipa de moderação do Intermodal
			</p>
		</div>
	</div>
</div>
