-- Ajuste: reinicia a sequência de códigos de especializações.
-- Um teste de inserção/exclusão durante a validação consumiu o primeiro valor
-- da sequência; este restart garante que o primeiro registro criado pelo
-- usuário receba ESP-0001.
ALTER SEQUENCE public.seq_especializacoes_codigo RESTART WITH 1;
