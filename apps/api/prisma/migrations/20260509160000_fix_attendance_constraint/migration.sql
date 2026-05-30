-- Remove a antiga constraint única de 2 colunas que bloqueia o upsert com type
-- O DO block na migration anterior pode não ter encontrado a constraint
DO $$
DECLARE
    con_name text;
BEGIN
    SELECT con.conname INTO con_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'Attendance'
      AND con.contype = 'u'
      AND array_length(con.conkey, 1) = 2;

    IF con_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE "Attendance" DROP CONSTRAINT "' || con_name || '"';
    END IF;
END;
$$;
