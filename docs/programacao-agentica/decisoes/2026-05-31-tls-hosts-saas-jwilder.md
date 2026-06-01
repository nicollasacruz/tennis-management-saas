# Decisao: TLS inicial apenas para dominio com DNS ativo

## Contexto

A stack SaaS usa `jwilder/nginx-proxy` com `nginxproxy/acme-companion`. O servico `web` pode receber varios hosts em `VIRTUAL_HOST`, mas o companion tenta emitir um certificado para todos os dominios configurados em `LETSENCRYPT_HOST`.

Durante o deploy de 2026-05-31, `https://tenis.esaf.run.place` respondia pela aplicacao, mas apresentava um certificado antigo de `esaf.run.place`. Os logs do `nginx-proxy-acme` mostraram falha de emissao porque `app.tenis.esaf.run.place` ainda nao tinha DNS ativo (`NXDOMAIN`). Como esse dominio estava no mesmo `LETSENCRYPT_HOST`, a emissao do certificado multi-domain falhou.

## Opcoes consideradas

- Incluir todos os subdominios conhecidos em `LETSENCRYPT_HOST` desde o inicio.
- Emitir TLS apenas para dominios que ja resolvem para a VPS.
- Criar DNS de todos os subdominios antes de qualquer deploy.

## Decisao

No MVP, `WEB_VIRTUAL_HOSTS` pode listar os hosts conhecidos para preparar o routing, mas `WEB_LETSENCRYPT_HOSTS` deve listar apenas dominios com DNS ativo.

Configuracao atual:

```env
WEB_VIRTUAL_HOSTS=tenis.esaf.run.place,app.tenis.esaf.run.place,demo.tenis.esaf.run.place,esaf.tenis.esaf.run.place
WEB_LETSENCRYPT_HOSTS=tenis.esaf.run.place
```

O Evolution permanece pausado por defeito e o host reservado para ele e:

```env
EVOLUTION_API_VIRTUAL_HOST=tenisevolution.esaf.run.place
```

## Consequencias

- `https://tenis.esaf.run.place` tem TLS valido e responde com `HTTP/2 200`.
- Os subdominios `app`, `demo` e `esaf` so devem ser adicionados a `WEB_LETSENCRYPT_HOSTS` depois de existirem no DNS.
- O deploy padrao nao deve subir Evolution; os servicos `evolution-api` e `evolution-postgres` ficam atras do profile `evolution`.
