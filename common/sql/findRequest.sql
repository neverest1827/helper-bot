SELECT
    r.id,
    r.chat_id,
    p.phone_number AS phone_number,
    r.name,
    r.address,
    DATE_FORMAT(r.date_from, '%d.%m %H:%i') AS date_from,
    DATE_FORMAT(r.date_to, '%H:%i') AS date_to,
    r.description,
    r.admin_notes,
    r.master_notes,
    r.paycheck,
    s.value AS status
FROM
    requests r
        LEFT JOIN phones p ON r.phone_id = p.id
        LEFT JOIN statuses s ON r.status_id = s.id
WHERE r.id = ?