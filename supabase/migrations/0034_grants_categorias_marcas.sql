-- categorias_servico e marcas (tabelas antigas, de antes da Fase 5) só tinham GRANT de SELECT
-- pra authenticated/anon. A policy de RLS admin_gerencia_categorias_servico/admin_gerencia_marcas
-- (migração 0033) não tem efeito sem o GRANT de base do Postgres — resultava em
-- "permission denied for table categorias_servico" mesmo pra admin.
grant insert, update, delete on categorias_servico to authenticated;
grant insert, update, delete on marcas to authenticated;
