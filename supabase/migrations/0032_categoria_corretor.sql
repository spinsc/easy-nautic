insert into categorias_servico (nome, ordem)
select 'Corretor', (select coalesce(max(ordem), 0) + 1 from categorias_servico)
where not exists (select 1 from categorias_servico where nome = 'Corretor');
