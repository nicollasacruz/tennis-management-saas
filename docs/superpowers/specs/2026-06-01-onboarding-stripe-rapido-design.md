# Onboarding Stripe Rápido - Design

## Objectivo

Criar um onboarding de conversão rápida para novos clientes SaaS: recolher apenas os dados essenciais da escola e do administrador, mostrar claramente o plano mensal de 39,90 euros sem teste grátis, e enviar o cliente para Stripe Checkout alojado.

## Fluxo

1. O cliente abre `/pt/onboarding`.
2. Preenche nome da escola, endereço, nome do administrador, email e palavra-passe.
3. A página mostra um resumo fixo: Plano Mensal, 39,90 euros por mês, cobrança imediata, pagamento seguro por Stripe.
4. Ao submeter, a API cria uma sessão pendente de onboarding e devolve a URL do Stripe Checkout.
5. A Stripe cobra a assinatura mensal no checkout alojado.
6. O webhook `checkout.session.completed` provisiona o tenant e o utilizador admin.
7. A página de sucesso consulta o estado da sessão e mostra o endereço da escola quando estiver pronta.

## Decisões

- Usar Stripe Checkout alojado para reduzir fricção e risco técnico.
- Não guardar chaves Stripe no código; usar variáveis de ambiente.
- Manter modo mock quando `STRIPE_SECRET_KEY` não estiver configurada.
- A conta só fica activa depois da confirmação de pagamento.
- O layout segue a UI existente: Manrope, fundo claro, verde ESAF, bordas suaves e conteúdo em português de Portugal.

## Estados

- Slug disponível, indisponível, em validação ou inválido.
- Checkout a iniciar.
- Erro de checkout com mensagem clara.
- Sucesso pendente enquanto o webhook ainda não provisionou.
- Sucesso concluído com link para entrar na escola.
