SELECT r.id,
       c.chat_id as chatId,
       r.address
FROM requests r
         LEFT JOIN chats c ON r.chat_id = c.id
WHERE r.status_id = 1
  AND r.alert = 0
  AND TIMESTAMPDIFF(MINUTE, NOW(), r.date_from) <= 60