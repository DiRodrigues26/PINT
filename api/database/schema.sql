-- Schema export para contexto de desenvolvimento
-- Base de dados: softinsa_badges
-- Gerado em: 2026-04-30T18:17:58.675Z
SET FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS `area`;
CREATE TABLE `area` (
  `id_area` int unsigned NOT NULL AUTO_INCREMENT,
  `id_service_line` int unsigned NOT NULL,
  `nome` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_area`),
  KEY `fk_area_sl` (`id_service_line`),
  CONSTRAINT `fk_area_sl` FOREIGN KEY (`id_service_line`) REFERENCES `service_line` (`id_service_line`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `avaliacao_candidatura`;
CREATE TABLE `avaliacao_candidatura` (
  `id_avaliacao` int unsigned NOT NULL AUTO_INCREMENT,
  `id_candidatura` int unsigned NOT NULL,
  `id_avaliador` int unsigned NOT NULL,
  `tipo_avaliador` enum('TALENT_MANAGER','SERVICE_LINE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `decisao` enum('CORRETO','INCORRETO','APROVAR','REJEITAR','SEND_BACK') COLLATE utf8mb4_unicode_ci NOT NULL,
  `comentario` text COLLATE utf8mb4_unicode_ci,
  `data_avaliacao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_avaliacao`),
  KEY `idx_av_candidatura` (`id_candidatura`),
  KEY `idx_av_avaliador` (`id_avaliador`),
  CONSTRAINT `fk_av_avaliador` FOREIGN KEY (`id_avaliador`) REFERENCES `utilizador` (`id_utilizador`) ON DELETE RESTRICT,
  CONSTRAINT `fk_av_candidatura` FOREIGN KEY (`id_candidatura`) REFERENCES `candidatura_badge` (`id_candidatura`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `aviso_informacao`;
CREATE TABLE `aviso_informacao` (
  `id_aviso` int unsigned NOT NULL AUTO_INCREMENT,
  `id_criador` int unsigned NOT NULL,
  `titulo` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `conteudo` text COLLATE utf8mb4_unicode_ci,
  `tipo` enum('INFORMACAO','AVISO','PEDIDO') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INFORMACAO',
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `data_inicio` datetime DEFAULT NULL,
  `data_fim` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_aviso`),
  KEY `fk_ai_criador` (`id_criador`),
  KEY `idx_ai_ativo` (`ativo`),
  CONSTRAINT `fk_ai_criador` FOREIGN KEY (`id_criador`) REFERENCES `utilizador` (`id_utilizador`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `badge`;
CREATE TABLE `badge` (
  `id_badge` int unsigned NOT NULL AUTO_INCREMENT,
  `id_nivel` int unsigned NOT NULL,
  `titulo` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `imagem_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pontos` int unsigned NOT NULL DEFAULT '0',
  `tem_expiracao` tinyint(1) NOT NULL DEFAULT '0',
  `validade_dias` int unsigned DEFAULT NULL,
  `intervalo_temporal_obtencao` int unsigned DEFAULT NULL,
  `is_conquista_especial` tinyint(1) NOT NULL DEFAULT '0',
  `beneficios` text COLLATE utf8mb4_unicode_ci,
  `competencias_certificadas` text COLLATE utf8mb4_unicode_ci,
  `sobre_certificacao` text COLLATE utf8mb4_unicode_ci,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_badge`),
  UNIQUE KEY `uq_badge_nivel` (`id_nivel`),
  CONSTRAINT `fk_badge_nivel` FOREIGN KEY (`id_nivel`) REFERENCES `nivel` (`id_nivel`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `badge_atribuido`;
CREATE TABLE `badge_atribuido` (
  `id_badge_atribuido` int unsigned NOT NULL AUTO_INCREMENT,
  `id_consultor` int unsigned NOT NULL,
  `id_badge` int unsigned NOT NULL,
  `id_candidatura` int unsigned NOT NULL,
  `data_atribuicao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `data_expiracao` datetime DEFAULT NULL,
  `publicado` tinyint(1) NOT NULL DEFAULT '0',
  `token_publico` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo_publico` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `url_publica` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `linkedin_shared` tinyint(1) NOT NULL DEFAULT '0',
  `assinatura_email_ativa` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_badge_atribuido`),
  UNIQUE KEY `uq_token_publico` (`token_publico`),
  UNIQUE KEY `uq_codigo_publico` (`codigo_publico`),
  KEY `fk_ba_candidatura` (`id_candidatura`),
  KEY `idx_ba_consultor` (`id_consultor`),
  KEY `idx_ba_badge` (`id_badge`),
  CONSTRAINT `fk_ba_badge` FOREIGN KEY (`id_badge`) REFERENCES `badge` (`id_badge`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ba_candidatura` FOREIGN KEY (`id_candidatura`) REFERENCES `candidatura_badge` (`id_candidatura`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ba_consultor` FOREIGN KEY (`id_consultor`) REFERENCES `utilizador` (`id_utilizador`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `candidatura_badge`;
CREATE TABLE `candidatura_badge` (
  `id_candidatura` int unsigned NOT NULL AUTO_INCREMENT,
  `id_consultor` int unsigned NOT NULL,
  `id_badge` int unsigned NOT NULL,
  `estado_atual` enum('OPEN','SUBMITTED','IN_TALENT_REVIEW','IN_SERVICE_LINE_REVIEW','APPROVED','REJECTED','SENT_BACK','CLOSED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OPEN',
  `data_abertura` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `data_submissao` datetime DEFAULT NULL,
  `data_fecho` datetime DEFAULT NULL,
  `observacoes_consultor` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_candidatura`),
  KEY `idx_cb_consultor` (`id_consultor`),
  KEY `idx_cb_badge` (`id_badge`),
  KEY `idx_cb_estado` (`estado_atual`),
  CONSTRAINT `fk_cb_badge` FOREIGN KEY (`id_badge`) REFERENCES `badge` (`id_badge`) ON DELETE RESTRICT,
  CONSTRAINT `fk_cb_consultor` FOREIGN KEY (`id_consultor`) REFERENCES `utilizador` (`id_utilizador`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `certificado`;
CREATE TABLE `certificado` (
  `id_certificado` int unsigned NOT NULL AUTO_INCREMENT,
  `id_badge_atribuido` int unsigned NOT NULL,
  `pdf_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data_geracao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `hash_verificacao` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_certificado`),
  UNIQUE KEY `uq_cert_badge_atribuido` (`id_badge_atribuido`),
  CONSTRAINT `fk_cert_ba` FOREIGN KEY (`id_badge_atribuido`) REFERENCES `badge_atribuido` (`id_badge_atribuido`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `conquista_especial`;
CREATE TABLE `conquista_especial` (
  `id_conquista` int unsigned NOT NULL AUTO_INCREMENT,
  `nome` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `imagem_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `criterio` text COLLATE utf8mb4_unicode_ci,
  `tipo_criterio` enum('BADGES_AREA','BADGES_TOTAL','PONTOS','NIVEL') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `valor_objetivo` int unsigned DEFAULT NULL,
  `entidade_referencia` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pontos_bonus` int unsigned NOT NULL DEFAULT '0',
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_conquista`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `consentimento_rgpd`;
CREATE TABLE `consentimento_rgpd` (
  `id_consentimento` int unsigned NOT NULL AUTO_INCREMENT,
  `id_utilizador` int unsigned NOT NULL,
  `tipo_consentimento` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `aceite` tinyint(1) NOT NULL DEFAULT '0',
  `data_aceitacao` datetime DEFAULT NULL,
  `versao_politica` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_consentimento`),
  KEY `idx_rgpd_utilizador` (`id_utilizador`),
  CONSTRAINT `fk_rgpd_utilizador` FOREIGN KEY (`id_utilizador`) REFERENCES `utilizador` (`id_utilizador`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `consultor_area`;
CREATE TABLE `consultor_area` (
  `id_consultor_area` int unsigned NOT NULL AUTO_INCREMENT,
  `id_utilizador` int unsigned NOT NULL,
  `id_area` int unsigned NOT NULL,
  `data_associacao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `data_fim` datetime DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_consultor_area`),
  UNIQUE KEY `uq_consultor_area_ativa` (`id_utilizador`,`ativo`),
  KEY `fk_ca_area` (`id_area`),
  KEY `idx_ca_utilizador` (`id_utilizador`),
  CONSTRAINT `fk_ca_area` FOREIGN KEY (`id_area`) REFERENCES `area` (`id_area`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ca_utilizador` FOREIGN KEY (`id_utilizador`) REFERENCES `utilizador` (`id_utilizador`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `evento_especial`;
CREATE TABLE `evento_especial` (
  `id_evento` int unsigned NOT NULL AUTO_INCREMENT,
  `id_nivel` int unsigned NOT NULL,
  `id_badge` int unsigned DEFAULT NULL,
  `titulo` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `data_criacao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `data_limite` datetime DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_evento`),
  KEY `fk_ee_nivel` (`id_nivel`),
  KEY `fk_ee_badge` (`id_badge`),
  KEY `idx_ee_ativo` (`ativo`),
  KEY `idx_ee_data_limite` (`data_limite`),
  CONSTRAINT `fk_ee_badge` FOREIGN KEY (`id_badge`) REFERENCES `badge` (`id_badge`) ON DELETE SET NULL,
  CONSTRAINT `fk_ee_nivel` FOREIGN KEY (`id_nivel`) REFERENCES `nivel` (`id_nivel`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `evento_especial_requisito`;
CREATE TABLE `evento_especial_requisito` (
  `id_ee_requisito` int unsigned NOT NULL AUTO_INCREMENT,
  `id_evento` int unsigned NOT NULL,
  `titulo` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `ordem` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_ee_requisito`),
  KEY `idx_eer_evento` (`id_evento`),
  CONSTRAINT `fk_eer_evento` FOREIGN KEY (`id_evento`) REFERENCES `evento_especial` (`id_evento`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `evidencia`;
CREATE TABLE `evidencia` (
  `id_evidencia` int unsigned NOT NULL AUTO_INCREMENT,
  `id_candidatura` int unsigned NOT NULL,
  `id_requisito` int unsigned NOT NULL,
  `ficheiro_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome_ficheiro` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_ficheiro` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_evidencia`),
  KEY `fk_ev_requisito` (`id_requisito`),
  KEY `idx_ev_candidatura` (`id_candidatura`),
  CONSTRAINT `fk_ev_candidatura` FOREIGN KEY (`id_candidatura`) REFERENCES `candidatura_badge` (`id_candidatura`) ON DELETE CASCADE,
  CONSTRAINT `fk_ev_requisito` FOREIGN KEY (`id_requisito`) REFERENCES `requisito` (`id_requisito`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `historico_candidatura`;
CREATE TABLE `historico_candidatura` (
  `id_historico` int unsigned NOT NULL AUTO_INCREMENT,
  `id_candidatura` int unsigned NOT NULL,
  `id_utilizador_responsavel` int unsigned NOT NULL,
  `estado_origem` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado_destino` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `acao` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comentario` text COLLATE utf8mb4_unicode_ci,
  `data_evento` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_historico`),
  KEY `fk_hc_utilizador` (`id_utilizador_responsavel`),
  KEY `idx_hc_candidatura` (`id_candidatura`),
  CONSTRAINT `fk_hc_candidatura` FOREIGN KEY (`id_candidatura`) REFERENCES `candidatura_badge` (`id_candidatura`) ON DELETE CASCADE,
  CONSTRAINT `fk_hc_utilizador` FOREIGN KEY (`id_utilizador_responsavel`) REFERENCES `utilizador` (`id_utilizador`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `learning_path`;
CREATE TABLE `learning_path` (
  `id_learning_path` int unsigned NOT NULL AUTO_INCREMENT,
  `nome` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_learning_path`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `lembrete`;
CREATE TABLE `lembrete` (
  `id_lembrete` int unsigned NOT NULL AUTO_INCREMENT,
  `id_utilizador` int unsigned NOT NULL,
  `titulo` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `data_limite` datetime DEFAULT NULL,
  `concluido` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_lembrete`),
  KEY `idx_lem_utilizador` (`id_utilizador`),
  CONSTRAINT `fk_lem_utilizador` FOREIGN KEY (`id_utilizador`) REFERENCES `utilizador` (`id_utilizador`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `nivel`;
CREATE TABLE `nivel` (
  `id_nivel` int unsigned NOT NULL AUTO_INCREMENT,
  `id_area` int unsigned NOT NULL,
  `codigo_nivel` char(1) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome_nivel` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ordem` tinyint NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_nivel`),
  UNIQUE KEY `uq_nivel_area_codigo` (`id_area`,`codigo_nivel`),
  CONSTRAINT `fk_nivel_area` FOREIGN KEY (`id_area`) REFERENCES `area` (`id_area`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `notificacao`;
CREATE TABLE `notificacao` (
  `id_notificacao` int unsigned NOT NULL AUTO_INCREMENT,
  `id_utilizador` int unsigned NOT NULL,
  `tipo` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria` enum('CANDIDATURA','BADGE','SISTEMA') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SISTEMA',
  `titulo` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mensagem` text COLLATE utf8mb4_unicode_ci,
  `entidade_relacionada` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lida` tinyint(1) NOT NULL DEFAULT '0',
  `arquivada` tinyint(1) NOT NULL DEFAULT '0',
  `data_criacao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_notificacao`),
  KEY `idx_notif_utilizador` (`id_utilizador`),
  KEY `idx_notif_lida` (`lida`),
  KEY `idx_notif_arquivada` (`arquivada`),
  KEY `idx_notif_categoria` (`categoria`),
  CONSTRAINT `fk_notif_utilizador` FOREIGN KEY (`id_utilizador`) REFERENCES `utilizador` (`id_utilizador`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `perfil`;
CREATE TABLE `perfil` (
  `id_perfil` int unsigned NOT NULL AUTO_INCREMENT,
  `nome_perfil` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_perfil`),
  UNIQUE KEY `uq_perfil_nome` (`nome_perfil`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `preferencia_notificacao`;
CREATE TABLE `preferencia_notificacao` (
  `id_preferencia` int unsigned NOT NULL AUTO_INCREMENT,
  `id_utilizador` int unsigned NOT NULL,
  `email_aprovacao_badge` tinyint(1) NOT NULL DEFAULT '1',
  `notif_expiracao` tinyint(1) NOT NULL DEFAULT '1',
  `notif_recomendacoes` tinyint(1) NOT NULL DEFAULT '0',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_preferencia`),
  UNIQUE KEY `uq_pref_utilizador` (`id_utilizador`),
  CONSTRAINT `fk_pref_utilizador` FOREIGN KEY (`id_utilizador`) REFERENCES `utilizador` (`id_utilizador`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `requisito`;
CREATE TABLE `requisito` (
  `id_requisito` int unsigned NOT NULL AUTO_INCREMENT,
  `id_nivel` int unsigned NOT NULL,
  `codigo_requisito` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `titulo` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `tipo_evidencia` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `imagem_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ordem` tinyint NOT NULL DEFAULT '1',
  `obrigatorio` tinyint(1) NOT NULL DEFAULT '1',
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_requisito`),
  UNIQUE KEY `uq_requisito_nivel_codigo` (`id_nivel`,`codigo_requisito`),
  CONSTRAINT `fk_requisito_nivel` FOREIGN KEY (`id_nivel`) REFERENCES `nivel` (`id_nivel`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `badge_requisito`;
CREATE TABLE `badge_requisito` (
  `id_badge_requisito` int unsigned NOT NULL AUTO_INCREMENT,
  `id_badge` int unsigned NOT NULL,
  `id_requisito` int unsigned NOT NULL,
  `ordem` tinyint NOT NULL DEFAULT '1',
  `obrigatorio` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_badge_requisito`),
  UNIQUE KEY `uq_badge_requisito` (`id_badge`,`id_requisito`),
  KEY `fk_br_requisito` (`id_requisito`),
  CONSTRAINT `fk_br_badge` FOREIGN KEY (`id_badge`) REFERENCES `badge` (`id_badge`) ON DELETE CASCADE,
  CONSTRAINT `fk_br_requisito` FOREIGN KEY (`id_requisito`) REFERENCES `requisito` (`id_requisito`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `service_line`;
CREATE TABLE `service_line` (
  `id_service_line` int unsigned NOT NULL AUTO_INCREMENT,
  `id_learning_path` int unsigned NOT NULL,
  `nome` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_service_line`),
  KEY `fk_sl_lp` (`id_learning_path`),
  CONSTRAINT `fk_sl_lp` FOREIGN KEY (`id_learning_path`) REFERENCES `learning_path` (`id_learning_path`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `service_line_responsavel`;
CREATE TABLE `service_line_responsavel` (
  `id_utilizador` int unsigned NOT NULL,
  `id_service_line` int unsigned NOT NULL,
  `data_associacao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_utilizador`),
  KEY `fk_slr_service_line` (`id_service_line`),
  CONSTRAINT `fk_slr_service_line` FOREIGN KEY (`id_service_line`) REFERENCES `service_line` (`id_service_line`) ON DELETE RESTRICT,
  CONSTRAINT `fk_slr_utilizador` FOREIGN KEY (`id_utilizador`) REFERENCES `utilizador` (`id_utilizador`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `sla_config`;
CREATE TABLE `sla_config` (
  `id_sla` int unsigned NOT NULL AUTO_INCREMENT,
  `fase` enum('TALENT_REVIEW','SERVICE_LINE_REVIEW') COLLATE utf8mb4_unicode_ci NOT NULL,
  `limite` int unsigned NOT NULL,
  `unidade` enum('horas','dias') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'horas',
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_sla`),
  UNIQUE KEY `uq_sla_fase` (`fase`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `template_assinatura_email`;
CREATE TABLE `template_assinatura_email` (
  `id_template` int unsigned NOT NULL AUTO_INCREMENT,
  `id_utilizador` int unsigned NOT NULL,
  `nome_template` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `html_template` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_template`),
  KEY `fk_tae_utilizador` (`id_utilizador`),
  CONSTRAINT `fk_tae_utilizador` FOREIGN KEY (`id_utilizador`) REFERENCES `utilizador` (`id_utilizador`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `timeline_objetivo`;
CREATE TABLE `timeline_objetivo` (
  `id_objetivo` int unsigned NOT NULL AUTO_INCREMENT,
  `id_utilizador` int unsigned NOT NULL,
  `titulo` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `data_inicio` date DEFAULT NULL,
  `data_fim` date DEFAULT NULL,
  `estado` enum('PENDENTE','EM_CURSO','CONCLUIDO','CANCELADO') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDENTE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_objetivo`),
  KEY `idx_to_utilizador` (`id_utilizador`),
  CONSTRAINT `fk_to_utilizador` FOREIGN KEY (`id_utilizador`) REFERENCES `utilizador` (`id_utilizador`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `utilizador`;
CREATE TABLE `utilizador` (
  `id_utilizador` int unsigned NOT NULL AUTO_INCREMENT,
  `nome` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `email_confirmado` tinyint(1) NOT NULL DEFAULT '0',
  `primeiro_login_pendente` tinyint(1) NOT NULL DEFAULT '1',
  `idioma` enum('pt','en','es') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pt',
  `token_confirmacao_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `token_recuperacao_password` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `token_recuperacao_expira` datetime DEFAULT NULL,
  `ultimo_login` datetime DEFAULT NULL,
  `url_slug` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `totp_secret` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `totp_ativo` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_utilizador`),
  UNIQUE KEY `uq_utilizador_email` (`email`),
  UNIQUE KEY `uq_utilizador_slug` (`url_slug`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `utilizador_conquista`;
CREATE TABLE `utilizador_conquista` (
  `id_utilizador` int unsigned NOT NULL,
  `id_conquista` int unsigned NOT NULL,
  `data_atribuicao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_utilizador`,`id_conquista`),
  KEY `fk_uc_conquista` (`id_conquista`),
  CONSTRAINT `fk_uc_conquista` FOREIGN KEY (`id_conquista`) REFERENCES `conquista_especial` (`id_conquista`) ON DELETE RESTRICT,
  CONSTRAINT `fk_uc_utilizador` FOREIGN KEY (`id_utilizador`) REFERENCES `utilizador` (`id_utilizador`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `utilizador_perfil`;
CREATE TABLE `utilizador_perfil` (
  `id_utilizador` int unsigned NOT NULL,
  `id_perfil` int unsigned NOT NULL,
  `atribuido_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_utilizador`,`id_perfil`),
  KEY `fk_up_perfil` (`id_perfil`),
  CONSTRAINT `fk_up_perfil` FOREIGN KEY (`id_perfil`) REFERENCES `perfil` (`id_perfil`) ON DELETE RESTRICT,
  CONSTRAINT `fk_up_utilizador` FOREIGN KEY (`id_utilizador`) REFERENCES `utilizador` (`id_utilizador`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS=1;
