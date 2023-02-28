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
				<b>concede-se uma licensa perpetua e sem restrições ao projeto</b>, para facilidade de
				gestão legal. Nós comprometemo-nos a creditar o autor como tal e garantimos que todos os
				dados submetidos serão colocados no dominio público com uma licensa aberta. Serão utilizadas
				licensas
				<a href="https://creativecommons.org/" class="link">Creative Commons</a> (por escolher entre
				BY-SA e BY-NC-SA),
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
					<b>Postaletes</b> - Este campo agrega os identificadores da paragem. Cada postalete deve de
					conter um nome e um número de série quando disponíveis, bem como as linhas que estão presentes
					nesse postalete.
				</li>
				<li>
					<b>Horários</b> - Quais os horários que a paragem dispõe e para que linhas.<br />
					O tipo de horário diz respeito formato semântico, se são horas de partida de
					<b>Origem</b>, se são <b>Previsões</b> de passagem na paragem atual ou se são
					<b>Frequências</b> médias de passagem (ex. 10 em 10 minutos).<br />
					Já o discriminador é algum valor que permita concluir qual a versão do horário (típicamente
					a data de publicação num formato como aaaammdd).
				</li>
				<li>
					<b>Verificação</b> - Estes campos servem para indicar a data da consulta dos dados para o
					bloco em que se encontram.<br />
					Por exemplo, o campo verificação dentro do bloco <b>Serviço</b> indica quando é que foi observado
					que aqueles seriam os horários e postaletes da paragem.
				</li>
				<li>
					<b>Passeio</b> - Se a paragem dispõe de passeio na localização; um local próprio para ficar
					que é exclusivo da via de circulação.
				</li>
				<li>
					<b>Passeio no acesso</b> - Se existe um passeio ao longo de todo o acesso para a paragem.
				</li>
				<li>
					<b>Abrigo</b> - Se a paragem dispõe de um abrigo com proteções laterais.
				</li>
				<li>
					<b>Cobertura</b> - Se a paragem se encontra num local que oferece cobertura por cima. Ie. se
					tem um telhado por cima, ou está construida por baixo de um edifício (ex. num viaduto). Abrigos
					não são contabilizados como cobertura.
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
					<b>Tempos de espera</b> - Se existe um painel informativo que disponibilize informação em tempo
					real sobre os tempos de espera.
				</li>
				<li>
					<b>Apoio ao passageiro</b> - Se existe alguma forma do passageiro contactar a empresa de transporte
					para obter ajuda ou informação.
				</li>
				<li>
					<b>Anúncios</b> - A prevalecência de anúncios na paragem. <b>Pouca área</b> seriam, por
					exemplo, anúncios no painel dos horários, num limite de 1m²; ou em casos de paragens
					notoriamente grandes, uma quantidade residual.
					<b>Muita area</b> seria um um mais paineis de mobiliario urbano dedicados a anúncios.
					<b>intrusivos</b> são os casos em que os paineis de anúncios obstroem o serviço, por exemplo,
					cortando a visibilidade.
				</li>
				<li>
					<b>Atravessamento de via</b> - Se uma forma segura de atravessar a via nas imediações próximas
					à paragem. Regra geral, isto implica uma passadeira a menos de 30-50 metros. Em grandes avenidas
					a tolerância deverá de ser maior. Uma rua local de muito baixo transito considera-se atravessavel
					mesmo que sem passadeira, desde que não exista possibilidade de atropelamento sem malicia.
				</li>
				<li>
					<b>Acesso sem ressaltos</b> - Se não existem degraus (mais de 1cm) ou grandes declives (mais
					de 6%) na generalidade dos acessos à paragem. (ie. sem alternativa razoável) Tem de se possível
					uma cadeira de rodas manual alcançar a paragem.
				</li>
				<li>
					<b>Acesso largo</b> - Se o espaço nos acessos permite a passagem de uma cadeira de rodas. Contemplo
					quaisquer obstaculos no caminho como postes, mobiliario urbano e a própria infraestrutura da
					paragem (se o poste ou abrigo é impeditivo ao atravessamento da paragem).
				</li>
				<li>
					<b>Acesso táctil</b> - Se o espaço nos acessos permite a passagem de uma cadeira de rodas.
					Contemplo quaisquer obstaculos no caminho como postes, mobiliario urbano e a própria infraestrutura
					da paragem (se o poste ou abrigo é impeditivo ao atravessamento da paragem).
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
					<b>Parque automóvel/Limitação visual</b> - Se o parque automóvel impede a visibilidade da paragem
					(em qualquer dos sentidos), sendo indiferente se é referente a estacionamento legitimo ou se
					o local é propicio a estacionamento ilegal.
				</li>
				<li>
					<b>Parque automóvel/Disfuncional à paragem</b> - Se o parque automóvel impede a utilização
					da paragem alem de questões visuais, por exemplo, bloqueando o acesso à paragem, bloqueando
					o acesso aos transportes, colocando situações de risco aos utentes, etc... Conta para este
					indicador o estacionamento ilegal bem como as paragens, caso sejam recorrentes.
				</li>
				<li>
					<b>Parque automóvel/Disfuncional ao acesso</b> - Se o parque automóvel prejudica o acesso à
					paragem, seja em matéria de convenciência, segurança ou acessibilidade. Conta para este indicador
					o estacionamento ilegal bem como as paragens, caso sejam recorrentes.
				</li>

				<li>
					<b>Defeitos</b> - Assinala defeitos, particularmente efémeros, que afectem a paragem.
					<ol class="list-disc ml-8">
						<li><b>Luz fundida</b> - A fonte primária de iluminação encontra-se fundida</li>
						<li>
							<b>Acesso fundido</b> - Existem fontes primárias de iluminação do acesso fundidas
						</li>
						<li><b>Dano leve</b> - Vandalismo cosmético, ...</li>
						<li>
							<b>Dano moderado</b> - Postaletes partidos, horários rasgados ou pintados por cima, ...
						</li>
						<li>
							<b>Dano grave</b> - Paineis partidos em abrigos, bancos inutilizados, riscos à integridade
							física dos passageiros, etc...
						</li>
						<li>
							<b>Suja</b> - Indícios de falta de limpeza. Sujidade forte tal que seja pouco higiénica
							aos passageiros ou prejudique a funcionalidade da paragem.
						</li>
						<li>
							<b>Recolha lixo insuf.</b> - O lixo é recolhido com uma frequência de tal forma insuficiente
							que os caixotes se encontram recorrentemente cheios e os chão apresenta lixo resultante.
						</li>
						<li>
							<b>Vegetação excessiva</b> - Se existe mata ou outras plantas em proporções que afectem
							o funcionamento da paragem ou dos seus acessos.
						</li>
						<li>
							<b>Info obsoleta</b> - Se a paragem tem postaletes que já não se aplicam, horários antigos,
							avisos que já não vigoram, etc...
						</li>
						<li><b>Obras</b> - Se a paragem se encontra obstruida por obras.</li>
					</ol>
					(Por favor indicar motivo no campo das notas)
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
