-- Condição de pagamento (prazo, parcelamento, sinal etc.) — diferente da forma de pagamento
-- (Pix, transferência). Prestador cadastra uma condição padrão; cada cotação pode usá-la
-- ou especificar outra, igual ao padrão já usado pra forma_pagamento.

alter table prestadores add column condicao_pagamento_padrao text;
alter table cotacoes add column condicao_pagamento text;
