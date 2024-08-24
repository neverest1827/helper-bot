const pool = require('../db');
const sqlManager = require('../common/sql.manager')
const db = require("../db");

class BotService {
    constructor() {
    }

    async getMenuRequests(chatId) {
        const sql_getAllRequestsForMenu = await sqlManager.getSQL('getAllRequestsForMenu');

        const [requests] = await pool.query(sql_getAllRequestsForMenu, [chatId]);

        const requestButtons = requests.map(req => [{
            text: `№${req.id} - ${req.date_from}${req.date_to ? '-' + req.date_to : ''} ${req.address ? req.address : 'где-то в Минске'} - ${req.status}`,
            callback_data: `request_${req.id}`
        }]);

        return  {
            reply_markup: {
                inline_keyboard: requestButtons
            }
        };
    }

    getOptionsMenu(id) {
        return  {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Детальнее', callback_data: `details_${id}` }],
                    [{ text: 'Обновить статус', callback_data: `update_${id}` }],
                    [{ text: 'Добавить заметку', callback_data: `notes_${id}` }],
                    [{ text: 'Поменять время', callback_data: `time_${id}` }],
                ]
            }
        };
    }

    async getRequestDetails(id){
        const sql_findRequest = await sqlManager.getSQL('findRequest');
        const [requests] = await pool.query(sql_findRequest, [id]);
        return requests[0];
    }

    getStatusMenu(id){
        return  {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Модерн', callback_data: `setstatus_${id}_modern` }],
                    [{ text: 'Закрыта', callback_data: `setstatus_${id}_closed` }],
                    [{ text: 'Отказ', callback_data: `setstatus_${id}_denied` }]
                ]
            }
        };

    }

    async updateStatus(id, status, paycheck){
        if (paycheck) {
            const sql_updateStatusAndCheck = await sqlManager.getSQL('updateStatusAndCheck')
            await pool.query(sql_updateStatusAndCheck, [status, paycheck, id])
        } else {
            const sql_updateStatus = await sqlManager.getSQL('updateStatus')
            await pool.query(sql_updateStatus, [status, id])
        }
    }

    async updateNote(id, text) {
        const [notes] = await pool.query('SELECT master_notes FROM requests WHERE id = ?', [id]);
        const note = notes[0].master_notes + `\n${text}`;
        console.log(note)
        const sql_updateNote = await sqlManager.getSQL('updateNote');
        await pool.query(sql_updateNote, [note, id]);
    }

    async updateTime(id, time_from, time_to){
        const [request] = await pool.query('SELECT date_from, date_to FROM requests WHERE id = ?', [id]);

        // Инициализация параметров и полей для обновления
        const params = [];
        let updateFields = [];

        // Если указано `time_from`, обновляем дату и время
        if (time_from) {
            const [hoursFrom, minutesFrom] = time_from.split(':');
            const newDateFrom = new Date(request.date_from || Date.now());
            newDateFrom.setHours(hoursFrom, minutesFrom, 0, 0);
            updateFields.push('date_from = ?');
            params.push(newDateFrom);
        }

        // Если указано `time_to`, обновляем дату и время
        if (time_to) {
            const [hoursTo, minutesTo] = time_to.split(':');
            const newDateTo = new Date(request.date_to || Date.now());
            newDateTo.setHours(hoursTo, minutesTo, 0, 0);
            updateFields.push('date_to = ?');
            params.push(newDateTo);
        }

        // Добавляем ID заявки
        params.push(id);

        // Формируем и выполняем SQL запрос
        if (updateFields.length > 0) {
            const updateQuery = `UPDATE requests SET ${updateFields.join(', ')} WHERE id = ?`;
            await pool.query(updateQuery, params);
        }
    }

    async getStatistic(id) {
        const sql_getStatistic = await sqlManager.getSQL('getStatistic');
        const currentDate = new Date().toISOString().split('T')[0];
        const [requests] = await pool.query(sql_getStatistic, [id, currentDate])

        let modernCount = 0;
        let closedCount = 0;
        let totalPaycheck = 0;

        if (requests.length) {
            requests.map((req) => {
                req.status === 'modern' ? modernCount++ : closedCount++;
                totalPaycheck += req.paycheck;
            })

            return `Статистика за сегодня:\nЗаявок в модерне = ${modernCount}\nЗаявок закрытых: ${closedCount}\nЧистая зп: ${totalPaycheck/2}`
        }

        return 'Тише тише ковбой. Закрой глаза, представь. Ты смотрите на бескрайнюю пустыню и где то вдали куда то стремительно катится перекати поле - это ваша статистика за сегодня)'
    }
}

module.exports = new BotService();