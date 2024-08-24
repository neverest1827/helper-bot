SELECT
    r.id,
    r.chat_id,
    p.phone_number AS phone_number,
    r.name,
    r.address,
    DATE_FORMAT(r.date_from, '%Y-%m-%dT%H:%i') AS date_from,
    r.date_to,
    r.description,
    r.admin_notes,
    r.master_notes,
    r.paycheck,
    r.status_id
FROM
    requests r
        LEFT JOIN phones p ON r.phone_id = p.id
WHERE
        1=1
<FILTERS>