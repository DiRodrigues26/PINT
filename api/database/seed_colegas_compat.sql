-- ============================================================
-- Seed complementar compativel com o schema atual - softinsa_badges
-- Objetivo: dar dados de teste aos perfis Consultor, Talent Manager
-- e Service Line sem destruir nem duplicar a hierarquia existente.
--
-- Seguro para correr varias vezes:
-- - nao usa DROP/TRUNCATE/DELETE
-- - usa INSERT IGNORE ou WHERE NOT EXISTS
-- - nao altera badges/niveis/requisitos ja existentes
--
-- Password das contas criadas: Password123!
-- ============================================================

START TRANSACTION;

-- Garantir perfis base.
INSERT IGNORE INTO perfil (id_perfil, nome_perfil, descricao) VALUES
(1, 'Consultor', 'Consultor da Softinsa'),
(2, 'Administrador', 'Gestor de conteudos e da plataforma'),
(3, 'Talent Manager', 'Valida evidencias dos consultores'),
(4, 'Service Line', 'Lider de Service Line - validacao final de badges');

-- Contas de teste para outros perfis.
INSERT INTO utilizador
  (nome, email, password_hash, ativo, email_confirmado, primeiro_login_pendente, idioma, url_slug)
SELECT 'Talent Manager Teste', 'talent.manager@softinsa.test',
       '$2b$10$z9ah5MBHnk6NiUUoj4xuJetV7YoGqmetxGeNDumkalUtAKM8u3OqC',
       1, 1, 0, 'pt', 'talent-manager-teste'
WHERE NOT EXISTS (SELECT 1 FROM utilizador WHERE email = 'talent.manager@softinsa.test');

INSERT INTO utilizador
  (nome, email, password_hash, ativo, email_confirmado, primeiro_login_pendente, idioma, url_slug)
SELECT 'Service Line Cloud Teste', 'service.line.cloud@softinsa.test',
       '$2b$10$z9ah5MBHnk6NiUUoj4xuJetV7YoGqmetxGeNDumkalUtAKM8u3OqC',
       1, 1, 0, 'pt', 'service-line-cloud-teste'
WHERE NOT EXISTS (SELECT 1 FROM utilizador WHERE email = 'service.line.cloud@softinsa.test');

INSERT INTO utilizador
  (nome, email, password_hash, ativo, email_confirmado, primeiro_login_pendente, idioma, url_slug)
SELECT 'Service Line DevOps Teste', 'service.line.devops@softinsa.test',
       '$2b$10$z9ah5MBHnk6NiUUoj4xuJetV7YoGqmetxGeNDumkalUtAKM8u3OqC',
       1, 1, 0, 'pt', 'service-line-devops-teste'
WHERE NOT EXISTS (SELECT 1 FROM utilizador WHERE email = 'service.line.devops@softinsa.test');

INSERT INTO utilizador
  (nome, email, password_hash, ativo, email_confirmado, primeiro_login_pendente, idioma, url_slug)
SELECT 'Consultor Cloud Teste', 'consultor.cloud@softinsa.test',
       '$2b$10$z9ah5MBHnk6NiUUoj4xuJetV7YoGqmetxGeNDumkalUtAKM8u3OqC',
       1, 1, 0, 'pt', 'consultor-cloud-teste'
WHERE NOT EXISTS (SELECT 1 FROM utilizador WHERE email = 'consultor.cloud@softinsa.test');

INSERT INTO utilizador
  (nome, email, password_hash, ativo, email_confirmado, primeiro_login_pendente, idioma, url_slug)
SELECT 'Consultor DevOps Teste', 'consultor.devops@softinsa.test',
       '$2b$10$z9ah5MBHnk6NiUUoj4xuJetV7YoGqmetxGeNDumkalUtAKM8u3OqC',
       1, 1, 0, 'pt', 'consultor-devops-teste'
WHERE NOT EXISTS (SELECT 1 FROM utilizador WHERE email = 'consultor.devops@softinsa.test');

INSERT INTO utilizador
  (nome, email, password_hash, ativo, email_confirmado, primeiro_login_pendente, idioma, url_slug)
SELECT 'Consultor Talent Teste', 'consultor.talent@softinsa.test',
       '$2b$10$z9ah5MBHnk6NiUUoj4xuJetV7YoGqmetxGeNDumkalUtAKM8u3OqC',
       1, 1, 0, 'pt', 'consultor-talent-teste'
WHERE NOT EXISTS (SELECT 1 FROM utilizador WHERE email = 'consultor.talent@softinsa.test');

-- Associar perfis.
INSERT IGNORE INTO utilizador_perfil (id_utilizador, id_perfil)
SELECT u.id_utilizador, p.id_perfil
FROM utilizador u
JOIN perfil p ON p.nome_perfil = 'Talent Manager'
WHERE u.email = 'talent.manager@softinsa.test';

INSERT IGNORE INTO utilizador_perfil (id_utilizador, id_perfil)
SELECT u.id_utilizador, p.id_perfil
FROM utilizador u
JOIN perfil p ON p.nome_perfil = 'Service Line'
WHERE u.email IN ('service.line.cloud@softinsa.test', 'service.line.devops@softinsa.test');

INSERT IGNORE INTO utilizador_perfil (id_utilizador, id_perfil)
SELECT u.id_utilizador, p.id_perfil
FROM utilizador u
JOIN perfil p ON p.nome_perfil = 'Consultor'
WHERE u.email IN ('consultor.cloud@softinsa.test', 'consultor.devops@softinsa.test', 'consultor.talent@softinsa.test');

-- Responsaveis de service line.
-- Usa as service lines atuais da BD. Se os nomes mudarem no futuro, estes inserts simplesmente nao fazem nada.
INSERT IGNORE INTO service_line_responsavel (id_utilizador, id_service_line)
SELECT u.id_utilizador, sl.id_service_line
FROM utilizador u
JOIN service_line sl ON sl.nome IN ('Cloud & Infrastructure ', 'Software Development')
WHERE u.email = 'service.line.cloud@softinsa.test'
LIMIT 1;

INSERT IGNORE INTO service_line_responsavel (id_utilizador, id_service_line)
SELECT u.id_utilizador, sl.id_service_line
FROM utilizador u
JOIN service_line sl ON sl.nome IN ('Cybersecurity', 'Application Operations')
WHERE u.email = 'service.line.devops@softinsa.test'
LIMIT 1;

-- Associar consultores a areas ativas. A constraint atual permite uma area ativa por consultor.
INSERT IGNORE INTO consultor_area (id_utilizador, id_area)
SELECT u.id_utilizador, a.id_area
FROM utilizador u
JOIN area a ON a.nome = 'Cloud Computing'
WHERE u.email = 'consultor.cloud@softinsa.test';

INSERT IGNORE INTO consultor_area (id_utilizador, id_area)
SELECT u.id_utilizador, a.id_area
FROM utilizador u
JOIN area a ON a.nome = 'DevSecOps & IT Automation'
WHERE u.email = 'consultor.devops@softinsa.test';

INSERT IGNORE INTO consultor_area (id_utilizador, id_area)
SELECT u.id_utilizador, a.id_area
FROM utilizador u
JOIN area a ON a.nome = 'Sourcing & Talent Management'
WHERE u.email = 'consultor.talent@softinsa.test';

-- Preferencias de notificacao para todos os utilizadores.
INSERT IGNORE INTO preferencia_notificacao (id_utilizador)
SELECT id_utilizador FROM utilizador;

-- Consentimentos RGPD para todos os utilizadores.
INSERT IGNORE INTO consentimento_rgpd
  (id_utilizador, tipo_consentimento, aceite, data_aceitacao, versao_politica)
SELECT u.id_utilizador, 'DADOS_PESSOAIS', 1, CURRENT_TIMESTAMP, '1.0'
FROM utilizador u;

-- Avaliacoes historicas de teste para candidaturas aprovadas.
INSERT INTO avaliacao_candidatura
  (id_candidatura, id_avaliador, tipo_avaliador, decisao, comentario, data_avaliacao)
SELECT cb.id_candidatura, tm.id_utilizador, 'TALENT_MANAGER', 'CORRETO',
       'Avaliacao de teste: evidencias validadas pelo Talent Manager.',
       COALESCE(cb.data_submissao, cb.data_abertura)
FROM candidatura_badge cb
JOIN utilizador tm ON tm.email = 'talent.manager@softinsa.test'
WHERE cb.estado_atual IN ('APPROVED', 'IN_SERVICE_LINE_REVIEW')
  AND NOT EXISTS (
    SELECT 1
    FROM avaliacao_candidatura av
    WHERE av.id_candidatura = cb.id_candidatura
      AND av.tipo_avaliador = 'TALENT_MANAGER'
  )
LIMIT 12;

INSERT INTO avaliacao_candidatura
  (id_candidatura, id_avaliador, tipo_avaliador, decisao, comentario, data_avaliacao)
SELECT cb.id_candidatura, sl_user.id_utilizador, 'SERVICE_LINE', 'APROVAR',
       'Avaliacao de teste: validacao final aprovada pela Service Line.',
       COALESCE(cb.data_fecho, cb.data_submissao, cb.data_abertura)
FROM candidatura_badge cb
JOIN badge b ON b.id_badge = cb.id_badge
JOIN nivel n ON n.id_nivel = b.id_nivel
JOIN area a ON a.id_area = n.id_area
JOIN service_line_responsavel slr ON slr.id_service_line = a.id_service_line
JOIN utilizador sl_user ON sl_user.id_utilizador = slr.id_utilizador
WHERE cb.estado_atual = 'APPROVED'
  AND NOT EXISTS (
    SELECT 1
    FROM avaliacao_candidatura av
    WHERE av.id_candidatura = cb.id_candidatura
      AND av.tipo_avaliador = 'SERVICE_LINE'
  )
LIMIT 12;

-- Notificacoes basicas para testar listas nos perfis.
INSERT INTO notificacao
  (id_utilizador, tipo, categoria, titulo, mensagem, entidade_relacionada)
SELECT u.id_utilizador, 'SEED_TESTE', 'SISTEMA', 'Dados de teste disponiveis',
       'A sua conta tem dados de teste para validar o perfil.',
       'Seed'
FROM utilizador u
WHERE u.email IN (
  'talent.manager@softinsa.test',
  'service.line.cloud@softinsa.test',
  'service.line.devops@softinsa.test',
  'consultor.cloud@softinsa.test',
  'consultor.devops@softinsa.test',
  'consultor.talent@softinsa.test'
)
  AND NOT EXISTS (
    SELECT 1
    FROM notificacao n
    WHERE n.id_utilizador = u.id_utilizador
      AND n.tipo = 'SEED_TESTE'
  );

COMMIT;
