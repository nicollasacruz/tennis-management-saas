# Decisao: migracao Evolution Go para Evolution API

## Contexto

O servico antigo `evolution-go` foi substituido pelo container oficial `atendai/evolution-api:v2.1.1`.

O dominio reservado para acesso direto ao servico continua separado da aplicacao SaaS:

```env
EVOLUTION_API_VIRTUAL_HOST=tenisevolution.clubtenispro.com
```

## Decisao

- O servico Docker passa a chamar-se `evolution-api`.
- O Postgres dedicado do Evolution mantem o nome `evolution-postgres`.
- O profile `evolution` continua obrigatorio, para impedir que o deploy padrao religue o Evolution enquanto estiver pausado.
- As variaveis novas usam prefixo `EVOLUTION_API_*`.
- As variaveis antigas `EVOLUTION_GO_*` ficam apenas como fallback de transicao no Compose e no seed.
- O envio de documentos passa a usar a rota Evolution API v2 `POST /message/sendMedia/{instance}`.
- O painel WhatsApp passa a ter acao de ligacao por QR code. A API cria ou reutiliza a instancia do tenant em `POST /instance/create`, pede o QR em `GET /instance/connect/{instance}` e grava `instanceName`, `instanceId` e `instanceToken` em `TenantWhatsappConfig`.
- O utilizador nao escolhe `instanceId` nem `instanceToken` no fluxo normal. O token e gerado pela aplicacao e o ID e preenchido com o valor devolvido pela Evolution API.

## Variaveis novas

```env
EVOLUTION_API_BASE_URL=http://evolution-api:8080
EVOLUTION_API_KEY=CHANGE_ME
EVOLUTION_API_INSTANCE_ID=CHANGE_ME
EVOLUTION_API_INSTANCE_TOKEN=CHANGE_ME
EVOLUTION_API_VIRTUAL_HOST=tenisevolution.clubtenispro.com
```

## Compatibilidade temporaria

Durante a transicao, estes nomes antigos ainda sao aceites se existirem no `.env` remoto:

```env
EVOLUTION_GO_BASE_URL
EVOLUTION_GO_API_KEY
EVOLUTION_GO_INSTANCE_ID
EVOLUTION_GO_INSTANCE_TOKEN
EVOLUTION_GO_VIRTUAL_HOST
```

Depois de atualizar o `.env` de producao para `EVOLUTION_API_*`, os nomes `EVOLUTION_GO_*` podem ser removidos.

## Endpoints internos da aplicacao

```txt
GET  /api/whatsapp/config
PUT  /api/whatsapp/config
POST /api/whatsapp/connect
POST /api/whatsapp/test
```

`POST /api/whatsapp/connect` exige permissao `ADMIN` e devolve:

```ts
{
  config: WhatsappConfig;
  qrCodeBase64: string | null;
  qrCodeText: string | null;
}
```
