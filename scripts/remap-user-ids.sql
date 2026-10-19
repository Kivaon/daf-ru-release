-- Выполнять ОДИН раз после загрузки выгрузки Sites в D1 Cloudflare.
-- Идентификаторы Sites (oai-authenticated-user-id) заменяются на "cf:<email>", как их выдаёт вход через Cloudflare Access.
-- Порядок важен: сначала зависимые таблицы, затем users.
UPDATE articles SET author_user_id = 'cf:' || (SELECT lower(email) FROM users WHERE users.user_id = articles.author_user_id)
  WHERE author_user_id IN (SELECT user_id FROM users WHERE user_id NOT LIKE 'cf:%' AND email <> '');
UPDATE editor_batches SET user_id = 'cf:' || (SELECT lower(email) FROM users WHERE users.user_id = editor_batches.user_id)
  WHERE user_id IN (SELECT user_id FROM users WHERE user_id NOT LIKE 'cf:%' AND email <> '');
UPDATE users SET user_id = 'cf:' || lower(email) WHERE user_id NOT LIKE 'cf:%' AND email <> '';
