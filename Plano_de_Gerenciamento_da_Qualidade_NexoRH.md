# Nexo RH --- Plano de Gerenciamento da Qualidade de Software

## 1. Contexto e objetivos da qualidade

O Nexo RH é um sistema web destinado ao gerenciamento de informações e
processos relacionados aos Recursos Humanos de uma organização.

O sistema tem como objetivo centralizar informações dos colaboradores e
disponibilizar funcionalidades relacionadas à gestão de funcionários,
férias e folha de pagamento, além de fornecer um dashboard com
informações resumidas para facilitar o acompanhamento das atividades.

O sistema será desenvolvido utilizando **React** no frontend e
**Supabase** como plataforma de backend, banco de dados e autenticação.

### 1.1 Principais usuários

-   Profissionais de Recursos Humanos, responsáveis pelo gerenciamento
    dos colaboradores, férias e informações relacionadas à folha;
-   Colaboradores, que poderão consultar suas informações e utilizar
    funcionalidades destinadas aos funcionários;
-   Administradores, responsáveis por configurações e gerenciamento do
    sistema.

### 1.2 Principais funcionalidades

-   Login e logout;
-   Dashboard com indicadores;
-   Cadastro e consulta de funcionários;
-   Organização e visualização dos funcionários;
-   Solicitação de férias;
-   Consulta de férias;
-   Aprovação ou rejeição de solicitações de férias;
-   Consulta de informações básicas da folha de pagamento;
-   Visualização de holerite.

### 1.3 Possíveis impactos provocados por falhas

-   Acesso não autorizado às informações dos funcionários;
-   Apresentação incorreta de dados cadastrais;
-   Erros no processo de solicitação ou aprovação de férias;
-   Informações incorretas relacionadas à folha de pagamento;
-   Indisponibilidade de funcionalidades importantes;
-   Perda ou inconsistência de informações.

O Nexo RH será classificado como um sistema de **criticidade
média/alta**, principalmente devido à natureza das informações
armazenadas e às funcionalidades relacionadas à gestão de colaboradores
e folha de pagamento.

### 1.4 Objetivos gerais da qualidade

-   Garantir que as funcionalidades implementadas atendam aos requisitos
    definidos;
-   Proteger as informações dos usuários;
-   Garantir o funcionamento correto dos fluxos principais;
-   Proporcionar uma interface clara e consistente;
-   Reduzir a quantidade de defeitos;
-   Identificar problemas o mais cedo possível;
-   Facilitar a manutenção e evolução do sistema;
-   Acompanhar a qualidade por meio de métricas objetivas.

Entregar um software de qualidade no projeto Nexo RH significa
disponibilizar um sistema seguro, confiável, funcional e fácil de
utilizar, no qual os principais processos de Recursos Humanos funcionem
de acordo com os requisitos definidos, as informações dos colaboradores
sejam protegidas e os defeitos críticos sejam identificados e corrigidos
antes da entrega.

## 2. Características de qualidade do produto

Foram selecionadas quatro características de qualidade prioritárias para
o Nexo RH.

  -----------------------------------------------------------------------
  Característica          Importância para o      Prioridade
                          projeto                 
  ----------------------- ----------------------- -----------------------
  Adequação Funcional     O sistema precisa       Alta
                          executar corretamente   
                          os processos de login,  
                          funcionários, férias e  
                          folha de pagamento      
                          conforme os requisitos  
                          definidos.              

  Segurança               O sistema manipula      Muito Alta
                          informações de          
                          colaboradores e deve    
                          impedir acessos não     
                          autorizados.            

  Confiabilidade          As funcionalidades      Alta
                          precisam funcionar de   
                          forma consistente,      
                          principalmente nos      
                          processos de            
                          autenticação, férias e  
                          consulta de dados.      

  Capacidade de Interação A interface deve        Alta
                          permitir que usuários   
                          de RH e colaboradores   
                          compreendam e executem  
                          as tarefas de forma     
                          clara.                  
  -----------------------------------------------------------------------

## 3. Critérios e métricas de qualidade

  ------------------------------------------------------------------------
  Característica   Métrica                           Meta Forma de
                                                          verificação
  ---------------- ---------------- --------------------- ----------------
  Adequação        Percentual de                    ≥ 95% Checklist de
  Funcional        requisitos                             requisitos e
                   funcionais                             testes
                   validados                              

  Segurança        Percentual de                     100% Testes
                   testes de                              funcionais e de
                   autenticação e                         segurança
                   autorização                            
                   aprovados                              

  Confiabilidade   Taxa de sucesso                  ≥ 95% Execução dos
                   dos testes dos                         testes
                   fluxos críticos                        

  Capacidade de    Percentual de                    ≥ 90% Testes de
  Interação        tarefas críticas                       interface e
                   concluídas sem                         usabilidade
                   erro de                                
                   interface                              
  ------------------------------------------------------------------------

Como critério complementar, o tempo médio de resposta das operações
principais deverá ser de até **2 segundos** em condições normais de
utilização.

## 4. Estratégia de Garantia da Qualidade (SQA)

  ----------------------------------------------------------------------------------
  Prática         Objetivo          Quando será       Responsável     Evidência
                                    realizada                         
  --------------- ----------------- ----------------- --------------- --------------
  Code Review     Identificar       A cada Pull       Membro da       PR revisado
                  problemas antes   Request           equipe          
                  da integração                       diferente do    
                                                      autor           

  Pull Request    Controlar         A cada alteração  Desenvolvedor   Pull Request
                  alterações no     relevante                         
                  código                                              

  Padrão de       Manter            Durante todo o    Toda a equipe   Código
  código          consistência e    desenvolvimento                   padronizado
                  facilitar                                           
                  manutenção                                          

  Testes          Detectar          Durante o         Desenvolvedor   Resultado dos
  automatizados   regressões        desenvolvimento                   testes
                  automaticamente                                     

  Testes de       Verificar         Antes da          Equipe          Resultado dos
  integração      comunicação entre integração e                      testes
                  frontend, backend entrega                           
                  e banco                                             

  Validação de    Garantir que o    Durante cada      Equipe          Checklist
  requisitos      software          funcionalidade                    
                  corresponde ao                                      
                  definido                                            

  Análise de      Identificar       Durante o         Desenvolvedor   Verificação de
  dependências    dependências      desenvolvimento                   dependências
                  inadequadas ou                                      
                  vulneráveis                                         

  Revisão         Avaliar a         Ao final de cada  Equipe          Registro da
  periódica       evolução da       Sprint                            revisão
                  qualidade                                           
  ----------------------------------------------------------------------------------

## 5. Responsabilidades relacionadas à qualidade

  -----------------------------------------------------------------------
  Atividade                           Responsável
  ----------------------------------- -----------------------------------
  Revisão de código                   Desenvolvedor que não seja o autor
                                      da alteração

  Execução dos testes                 Desenvolvedores e responsável pelos
                                      testes

  Validação dos requisitos            Equipe

  Acompanhamento das métricas         Responsável pela qualidade e equipe

  Registro de defeitos                Pessoa que identificar o problema

  Classificação dos defeitos          Equipe

  Aprovação das entregas              Equipe responsável pelo projeto

  Ações corretivas                    Responsável pela correção e equipe

  Verificação da correção             Pessoa diferente do responsável
                                      pela correção, quando possível
  -----------------------------------------------------------------------

## 6. Estratégia de testes

  -------------------------------------------------------------------------------
  Tipo de teste  Objetivo        Escopo         Momento           Ferramenta
  -------------- --------------- -------------- ----------------- ---------------
  Unitário       Validar funções Componentes e  Durante o         Vitest
                 e regras        funções        desenvolvimento   
                 isoladas                                         

  Integração     Validar         React +        Durante o         Vitest
                 comunicação     Supabase       desenvolvimento   
                 entre                                            
                 componentes                                      

  Interface      Validar         Login,         Durante o         Testing Library
                 comportamento   Dashboard e    desenvolvimento   
                 das telas       formulários                      

  E2E            Validar fluxos  Fluxos         Antes da entrega  Playwright
                 completos do    críticos                         
                 usuário                                          

  Segurança      Verificar       Login, sessão  Durante o         Testes manuais
                 autenticação e  e permissões   desenvolvimento e e automatizados
                 controle de                    antes da entrega  
                 acesso                                           

  Desempenho     Verificar tempo Operações      Antes da entrega  Ferramenta de
                 de resposta     principais                       testes de
                                                                  desempenho
  -------------------------------------------------------------------------------

### 6.1 Fluxos prioritários para testes

-   Login;
-   Primeiro acesso;
-   Alteração de senha;
-   Logout;
-   Bloqueio de acesso ao Dashboard sem autenticação;
-   Cadastro e consulta de funcionário;
-   Solicitação de férias;
-   Aprovação e rejeição de férias;
-   Consulta de folha;
-   Visualização de holerite.

## 7. Tratamento de defeitos e não conformidades

O fluxo de tratamento de defeitos será:

**Identificação → Registro → Classificação → Priorização → Correção →
Verificação → Encerramento**

  -----------------------------------------------------------------------
  Severidade              Definição               Exemplo no Nexo RH
  ----------------------- ----------------------- -----------------------
  Crítica                 Impede utilização de    Usuário não consegue
                          funcionalidade          autenticar ou acessa
                          essencial ou compromete dados sem autorização
                          a segurança             

  Alta                    Funcionalidade          Solicitação de férias
                          importante apresenta    não é registrada
                          falha significativa     corretamente

  Média                   Existe alternativa para Filtro de funcionários
                          concluir a operação     apresenta resultado
                                                  incorreto

  Baixa                   Problema sem impacto    Pequeno erro visual ou
                          significativo na        de alinhamento
                          operação                
  -----------------------------------------------------------------------

## 8. Indicadores de acompanhamento

  -------------------------------------------------------------------------
  Indicador        Objetivo                           Meta Periodicidade
  ---------------- ----------------- --------------------- ----------------
  Percentual de    Acompanhar a                      ≥ 95% A cada Sprint
  requisitos       implementação dos                       
  validados        requisitos                              

  Taxa de sucesso  Verificar                         ≥ 95% A cada Sprint
  dos testes       quantidade de                           
                   testes aprovados                        

  Cobertura de     Acompanhar partes                 ≥ 70% A cada Sprint
  testes           verificadas                             
                   automaticamente                         

  Quantidade de    Monitorar                             0 Contínuo
  defeitos         problemas que                           
  críticos         impedem a entrega                       

  Tempo médio de   Acompanhar               ≤ 3 dias úteis A cada Sprint
  correção         eficiência na                           
                   resolução de                            
                   problemas                               
  -------------------------------------------------------------------------

## 9. Integração da qualidade ao ciclo de desenvolvimento

  -----------------------------------------------------------------------
  Etapa                               Ação de qualidade
  ----------------------------------- -----------------------------------
  Planejamento                        Definição dos critérios de
                                      qualidade e métricas

  Requisitos                          Revisão dos requisitos e definição
                                      dos critérios de aceitação

  Design                              Revisão das interfaces e fluxos do
                                      sistema

  Desenvolvimento                     Padrão de código e testes unitários

  Pull Request                        Code Review e execução dos testes

  Integração                          Testes de integração

  Testes                              Testes funcionais, de interface,
                                      segurança e E2E

  Deploy                              Verificação dos fluxos críticos

  Monitoramento                       Acompanhamento de erros, desempenho
                                      e defeitos encontrados após a
                                      entrega
  -----------------------------------------------------------------------

## 10. Critérios de aceitação da qualidade --- Quality Gate

Uma versão do Nexo RH somente poderá ser considerada apta para entrega
quando atender aos seguintes critérios:

-   Não possuir defeitos classificados como Críticos;
-   Todos os fluxos críticos de autenticação estiverem funcionando;
-   Login e logout estiverem funcionando corretamente;
-   O fluxo de primeiro acesso estiver funcionando;
-   O controle de acesso estiver funcionando;
-   Pelo menos 95% dos testes estiverem aprovados;
-   A cobertura de testes atingir pelo menos 70%;
-   Pelo menos 95% dos requisitos da versão estiverem validados;
-   Os testes de segurança dos fluxos críticos estiverem aprovados;
-   As métricas prioritárias estiverem dentro das metas definidas;
-   Os defeitos encontrados durante os testes estiverem registrados e
    tratados;
-   A equipe tiver realizado a revisão final da versão.
