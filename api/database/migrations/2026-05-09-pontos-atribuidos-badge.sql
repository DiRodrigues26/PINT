ALTER TABLE badge_atribuido
  ADD COLUMN pontos_atribuidos INT UNSIGNED NOT NULL DEFAULT 0 AFTER data_expiracao;

UPDATE badge_atribuido ba
JOIN badge b ON b.id_badge = ba.id_badge
SET ba.pontos_atribuidos = b.pontos;
