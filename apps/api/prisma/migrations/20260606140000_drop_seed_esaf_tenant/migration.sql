-- Remove o tenant de exemplo 'esaf' (id 'tenant_esaf') inserido pela migration
-- de fundação 20260531100000_add_tenant_foundation. Em bases de dados novas
-- (ex.: após um wipe) esse tenant volta a ser criado; esta migration limpa-o.
--
-- Idempotente e seguro: só apaga se o tenant não tiver QUALQUER dado associado.
-- Se tiver (instalação legada que ainda usa o tenant inicial), não faz nada.

DELETE FROM "TenantWhatsappConfig"
WHERE "tenantId" IN (SELECT id FROM "Tenant" WHERE slug = 'esaf')
  AND NOT EXISTS (
    SELECT 1 FROM "Student" s
    WHERE s."tenantId" IN (SELECT id FROM "Tenant" WHERE slug = 'esaf')
  );

DELETE FROM "Tenant"
WHERE slug = 'esaf'
  AND NOT EXISTS (SELECT 1 FROM "Student" s WHERE s."tenantId" = "Tenant".id)
  AND NOT EXISTS (SELECT 1 FROM "Plan" p WHERE p."tenantId" = "Tenant".id)
  AND NOT EXISTS (SELECT 1 FROM "Payment" pay WHERE pay."tenantId" = "Tenant".id)
  AND NOT EXISTS (SELECT 1 FROM "Receipt" r WHERE r."tenantId" = "Tenant".id)
  AND NOT EXISTS (SELECT 1 FROM "SystemUser" su WHERE su."tenantId" = "Tenant".id)
  AND NOT EXISTS (SELECT 1 FROM "Attendance" a WHERE a."tenantId" = "Tenant".id)
  AND NOT EXISTS (SELECT 1 FROM "Activity" ac WHERE ac."tenantId" = "Tenant".id)
  AND NOT EXISTS (SELECT 1 FROM "Court" c WHERE c."tenantId" = "Tenant".id)
  AND NOT EXISTS (SELECT 1 FROM "ClassSlot" cs WHERE cs."tenantId" = "Tenant".id)
  AND NOT EXISTS (SELECT 1 FROM "StudentStatusHistory" h WHERE h."tenantId" = "Tenant".id)
  AND NOT EXISTS (SELECT 1 FROM "EmailJob" ej WHERE ej."tenantId" = "Tenant".id)
  AND NOT EXISTS (SELECT 1 FROM "WhatsappJob" wj WHERE wj."tenantId" = "Tenant".id);
