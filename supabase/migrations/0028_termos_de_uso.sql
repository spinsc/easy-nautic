-- Termos de uso versionados + registro de aceite por usuário. Todo mundo (novo ou já
-- cadastrado) precisa aceitar a versão vigente antes de continuar usando o sistema —
-- a aplicação bloqueia a UI até existir uma linha em termos_aceites pra versão atual.

create table termos_uso (
  id uuid primary key default gen_random_uuid(),
  versao int not null unique,
  conteudo text not null,
  publicado_em timestamptz not null default now()
);

alter table termos_uso enable row level security;

create policy qualquer_um_le_termos on termos_uso
  for select using (true);

create table termos_aceites (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  termos_id uuid not null references termos_uso(id),
  aceito_em timestamptz not null default now(),
  unique (usuario_id, termos_id)
);

alter table termos_aceites enable row level security;

create policy ve_proprio_aceite on termos_aceites
  for select using (usuario_id = auth.uid() or sou_admin());

create policy cria_proprio_aceite on termos_aceites
  for insert with check (usuario_id = auth.uid());

-- Nome de quem representa legalmente a pessoa jurídica no cadastro (obrigatório só pra PJ).
alter table prestadores add column representante_legal text;

insert into termos_uso (versao, conteudo) values (1, $termos$TERMOS DE USO — EASY NAUTIC

Última atualização: 20 de agosto de 2026
Versão: 1

1. QUEM SOMOS E O QUE É A PLATAFORMA

O Easy Nautic ("Plataforma", "nós") é um marketplace que conecta proprietários e responsáveis por embarcações ("Tomadores") a profissionais e empresas que prestam serviços náuticos ("Prestadores") — incluindo, sem se limitar a, mecânica, elétrica, laminação, pintura, tapeçaria, marcenaria, reboque/transporte, limpeza/detailing, vistoria, marinharia temporária, estaleiros, revendedores de peças e equipamentos, marinas e corretores (brokers) de embarcações.

A Plataforma atua exclusivamente como intermediária tecnológica. Não somos parte dos contratos de prestação de serviço, compra e venda ou locação eventualmente firmados entre Tomadores e Prestadores, e não processamos pagamentos entre as partes — os valores e condições de pagamento são acordados diretamente entre Tomador e Prestador.

2. CADASTRO

2.1. Para usar a Plataforma, você deve criar uma conta com informações verdadeiras, completas e atualizadas. Você é responsável por manter a confidencialidade da sua senha e por toda atividade realizada na sua conta.

2.2. Pessoas jurídicas (lojas, estaleiros, revendedores autorizados e demais Prestadores cadastrados como CNPJ) devem indicar um representante legal no ato do cadastro e enviar documentação que comprove essa condição (ex: contrato social ou documento societário equivalente) para fins de conferência. Enquanto a documentação não for enviada e conferida, o acesso a funcionalidades operacionais da conta (abrir ou receber chamados, aparecer em buscas e cruzamentos, emitir cotações) permanece bloqueado.

2.3. O representante legal de uma pessoa jurídica pode autorizar outras pessoas físicas a atuar em nome da empresa na Plataforma, criando contas de acesso vinculadas ao CNPJ. O representante legal é responsável pelas ações dessas pessoas autorizadas dentro da Plataforma, e pode revogar essa autorização a qualquer momento.

2.4. Reservamo-nos o direito de recusar, suspender ou encerrar cadastros que contenham informações falsas, incompletas, ou que violem estes Termos.

3. FUNCIONAMENTO DO MARKETPLACE

3.1. Tomadores podem abrir solicitações de serviço ("Chamados") vinculadas a uma embarcação, um equipamento específico, uma marca de peça/equipamento, ou uma categoria de serviço.

3.2. A Plataforma notifica automaticamente Prestadores compatíveis com cada Chamado, com base em critérios como marca atendida, região de atuação e categoria de serviço declarados no cadastro do Prestador. Não garantimos que um Chamado será respondido, nem a qualidade, prazo ou preço do serviço eventualmente prestado.

3.3. Prestadores podem enviar cotações (valor, forma e condição de pagamento) para um Chamado. A aprovação de uma cotação é de responsabilidade exclusiva do Tomador (ou de tripulante por ele autorizado).

3.4. A conclusão de um serviço é confirmada pelo Tomador após o Prestador sinalizar o término. Caso o Tomador não se manifeste em até 3 (três) dias corridos, o serviço é considerado automaticamente concluído. Em caso de divergência, o Tomador pode rejeitar a conclusão, informando motivo e, se desejar, evidências (fotos, vídeos ou documentos).

3.5. Após a conclusão de um Chamado, Tomador e Prestador podem se avaliar mutuamente. As avaliações compõem a reputação pública de cada parte na Plataforma e não podem ser removidas a pedido, salvo em casos de conteúdo abusivo, ilegal ou comprovadamente falso, a critério exclusivo da Plataforma.

4. PAGAMENTOS

4.1. A Plataforma não processa, intermedeia ou garante pagamentos entre Tomador e Prestador. Toda negociação e liquidação financeira é de responsabilidade exclusiva das partes envolvidas no Chamado.

4.2. Não nos responsabilizamos por inadimplência, atraso ou qualquer disputa financeira entre Tomador e Prestador.

5. RESPONSABILIDADES E LIMITAÇÃO

5.1. A Plataforma não presta os serviços náuticos ofertados por Prestadores, não os supervisiona tecnicamente e não garante sua execução, qualidade, segurança ou legalidade. A responsabilidade pela prestação do serviço é integralmente do Prestador que o executa.

5.2. Cabe a cada Tomador avaliar, antes de contratar, a idoneidade, capacitação técnica e reputação do Prestador escolhido.

5.3. A Plataforma não se responsabiliza por danos diretos ou indiretos decorrentes de serviços contratados por meio dela, ressalvados os casos de dolo ou culpa grave diretamente atribuíveis à própria Plataforma.

6. NOTIFICAÇÕES

6.1. Ao se cadastrar, você concorda em receber notificações relacionadas ao funcionamento da Plataforma (por e-mail e, quando autorizado no seu navegador, por push) — como novos Chamados compatíveis com seu perfil, atualizações de cotações e status de serviços. Você pode desativar notificações push a qualquer momento nas configurações do seu navegador ou do seu perfil.

7. PRIVACIDADE E DADOS PESSOAIS

7.1. Tratamos os dados pessoais fornecidos no cadastro e durante o uso da Plataforma em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), utilizando-os exclusivamente para viabilizar o funcionamento do marketplace (cadastro, cruzamento de solicitações, comunicação entre as partes e notificações).

7.2. Documentos enviados para verificação de pessoa jurídica são utilizados exclusivamente para essa finalidade e não são compartilhados publicamente.

8. PROPRIEDADE INTELECTUAL

8.1. Marca, layout, código e demais elementos da Plataforma pertencem ao Easy Nautic ou a seus licenciadores, sendo vedada sua reprodução sem autorização prévia.

9. SUSPENSÃO E ENCERRAMENTO

9.1. Podemos suspender ou encerrar, a qualquer momento, contas que violem estes Termos, apresentem indícios de fraude, ou cujo comportamento coloque em risco outros usuários da Plataforma.

10. ALTERAÇÕES DESTES TERMOS

10.1. Estes Termos podem ser atualizados periodicamente. Alterações relevantes serão comunicadas e, quando aplicável, exigirão novo aceite para continuidade do uso da Plataforma.

11. FORO

11.1. Fica eleito o foro da comarca do domicílio do usuário para dirimir eventuais controvérsias decorrentes destes Termos, salvo disposição legal em contrário.

12. ACEITE

Ao marcar a opção de aceite no cadastro (ou na tela de atualização de termos), você declara ter lido, compreendido e concordado integralmente com este documento. Se estiver aceitando em nome de uma pessoa jurídica, você declara ter poderes de representação para tanto.
$termos$);
