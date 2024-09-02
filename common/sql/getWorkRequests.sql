SELECT r.id,
       r.chat_id,
       r.address,
       DATE_FORMAT(r.date_from, '%H:%i') AS date_from,
       DATE_FORMAT(r.date_to, '%H:%i')         AS date_to,
       s.value                                 AS status
FROM requests r
         LEFT JOIN chats c ON r.chat_id = c.id
         LEFT JOIN statuses s ON r.status_id = s.id
WHERE c.chat_id = ?
  AND r.status_id = 1
  AND DATE_FORMAT(r.date_from, '%d.%m') = ?
ORDER BY r.date_from ASC;