# Decisao: local de build e deploy na VPS

## Contexto

O repositorio `tennis-management-saas` foi clonado na VPS de producao para servir como local operacional de build e deploy.

## Decisao

Usar o seguinte caminho como diretorio da aplicacao na VPS:

```txt
/root/projects/tennis-management-saas
```

Servidor:

```txt
62.169.28.198
```

Repositorio remoto:

```txt
git@github.com:nicollasacruz/tennis-management-saas.git
```

## Consequencias

- O secret `DEPLOY_PATH` do GitHub Actions deve apontar para `/root/projects/tennis-management-saas`.
- Comandos de deploy manual devem ser executados a partir desse diretorio.
- O clone da VPS deve receber novas alteracoes com `git pull origin main`.
- O diretorio antigo `/root/projects/tenis-management`, se ainda existir, nao deve ser usado para este novo SaaS sem decisao explicita.
