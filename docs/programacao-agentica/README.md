# Programacao agentica

Esta pasta documenta o processo de programacao agentica usado no projeto. O objetivo e manter rastreaveis as decisoes, planos, execucoes e verificacoes feitas por agentes de codigo.

## Objetivos

- Registar o contexto antes de alteracoes relevantes.
- Documentar decisoes de produto, arquitetura e implementacao.
- Separar desenho, plano e execucao.
- Guardar evidencias de verificacao antes de concluir trabalho.
- Facilitar revisao humana do que foi decidido e implementado.

## Estrutura recomendada

```txt
docs/programacao-agentica/
├── README.md
├── decisoes/
├── planos/
├── execucoes/
└── verificacoes/
```

## Tipos de documento

### Decisoes

Registos curtos para decisoes que afetam produto, arquitetura, infraestrutura ou operacao.

Formato recomendado:

```md
# Decisao: titulo

## Contexto

## Opcoes consideradas

## Decisao

## Consequencias
```

### Planos

Planos de implementacao antes de alterar codigo.

Devem incluir:

- objetivo;
- escopo;
- ficheiros provaveis;
- passos de implementacao;
- plano de verificacao;
- riscos.

### Execucoes

Resumo do que foi feito durante uma tarefa.

Devem incluir:

- referencia ao plano;
- alteracoes realizadas;
- desvios ao plano;
- comandos relevantes;
- pendencias.

### Verificacoes

Evidencias de validacao antes de considerar trabalho concluido.

Devem incluir:

- comandos executados;
- resultado observado;
- falhas conhecidas;
- riscos residuais.

## Regras de uso

- Documentos devem ser escritos em portugues de Portugal.
- Decisoes importantes devem ser registadas antes da implementacao.
- Alteracoes substanciais devem ter plano e verificacao.
- O agente deve declarar quando nao conseguiu executar uma verificacao.
- Informacao sensivel, tokens, passwords e dados pessoais reais nao devem ser guardados aqui.

## Relacao com specs

Specs de desenho detalhado ficam em:

```txt
docs/superpowers/specs/
```

Esta pasta complementa essas specs com o historico operacional da programacao agentica.
