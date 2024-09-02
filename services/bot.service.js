const pool = require('../db');
const sqlManager = require('../common/sql.manager')

class BotService {
    constructor() {
    }

    /**
     * Возвращаю главное меню с датами заявок в работе, модерны и их количество
     *
     * @param chatId - id чата для которого будут выбераться заявки
     * @returns разметка меню для telegram API
     */
    async getMainMenu(chatId) {
        const requests = await this.fetchData('getAllRequestsForMenu', [chatId]);

        const {dateCountMap, modernCounter} = this.generateDateCountMap(requests);
        const dateBtn = this.createDateButtons(dateCountMap);
        const modernBtn = this.createButton(
            `Modern - ${modernCounter}шт`,
            `date_modern`
        );
        const reloadBtn = this.createButton(`Обновить`, 'back_main');

        return {
            reply_markup: {
                inline_keyboard: [...dateBtn, modernBtn, reloadBtn],
            }
        };
    }

    /**
     * @param chatId - id чата для которого будут выбераться заявки
     * @returns статистику мастера за текущий день
     */
    async getStatistic(chatId) {
        const currentDate = new Date().toISOString().split('T')[0];
        const requests = await this.fetchData('getStatistic', [chatId, currentDate])
        if (requests.length) {
            const [modernCount, closedCount, deniedCount, totalPaycheck] = this.countingStatistic(requests)
            return this.buildStatisticMessage(modernCount, closedCount, deniedCount, totalPaycheck);
        }
        return 'Тише тише ковбой, ты еще ничего не сделал сегодня';
    }


    /**
     * @param sqlScriptName - название скрипта
     * @param params = параметры необходимые для выборки [chatId] или [chatId, date]
     * @returns список заявок в виже кнопок
     */
    async getRequestsMenu(sqlScriptName, params) {
        const requests = await this.fetchData(sqlScriptName, params);

        const date = params[1];
        const requestButtons = requests.map(req => [{
            text: `№${req.id} - ${req.date_from}${req.date_to ? '-' + req.date_to : ''} ${req.address ? req.address : 'где-то в Минске'}`,
            callback_data: date ? `request_${req.id}_${date}` : `request_${req.id}_modern`
        }]);

        const backBtn = this.createButton(`Назад`, 'back_main');

        return {
            reply_markup: {
                inline_keyboard: [...requestButtons, backBtn]
            }
        };
    }

    /**
     * @param id - id заявки
     * @param date - целевая дата в группе которой состоит данная заявка
     * @returns разметку с кнопками для взаемодействия с выбраной заявкой
     */
    getOptionsMenu(id, date) {
        return {
            reply_markup: {
                inline_keyboard: [
                    [{text: 'Детальнее', callback_data: `details_${id}`}],
                    [{text: 'Обновить статус', callback_data: `update_${id}_${date}`}],
                    [{text: 'Добавить заметку', callback_data: `notes_${id}`}],
                    [{text: 'Поменять время', callback_data: `time_${id}`}],
                    [{text: 'Назад', callback_data: `back_date_${date}`}],
                    [{text: 'На гравную', callback_data: `back_main`}],
                ]
            }
        };
    }

    /**
     * @param id - id заявки
     * @param date - целевая дата в группе которой состоит данная заявка
     * @returns разметку с кнопками для изменения статуса заявки
     */
    getStatusMenu(id, date) {
        return {
            reply_markup: {
                inline_keyboard: [
                    [{text: 'Модерн', callback_data: `setStatus_${id}_modern`}],
                    [{text: 'Закрыта', callback_data: `setStatus_${id}_closed`}],
                    [{text: 'Отказ', callback_data: `setStatus_${id}_denied`}],
                    [{text: 'Назад', callback_data: `back_request_${id}_${date}`}],
                    [{text: 'На главную', callback_data: `back_main`}]
                ]
            }
        };
    }

    /**
     * @param id - id заявки для обновления
     * @param status - статус какой нужно обновить
     * @param paycheck - сумма полученая за закрытую заявку
     * @returns {Promise<void>}
     */
    async updateStatus(id, status, paycheck) {
        try {
            if (status === 'closed') {
                await this.fetchData('updateStatusAndCheck', [status, paycheck, id])
            } else {
                await this.fetchData('updateStatus', [status, id])
            }
        } catch (err) {
            console.error(`Ошибка во время обновления заявки: ${err.message}`);
        }
    }

    /**
     * @param requestId - id заявки
     * @param newText - текст для добавления в заметки
     * @param sqlScriptName - название скрипта который надо выполнить
     * @param feeld - поле для коиска в бд
     * @returns {Promise<void>}
     */
    async updateNote(requestId, newText, sqlScriptName, feeld) {
        try {
            const [notes] = await pool.query(`SELECT ${feeld} FROM requests WHERE id = ?`, [requestId]);
            const oldText = notes[0][feeld];
            const note = oldText ? `${oldText}\n${newText}` : newText;
            await this.fetchData(sqlScriptName, [note, requestId]);
        } catch (err) {
            console.error(`Ошибка ошибка при добавлении заметки: ${err.message}`);
        }
    }

    /**
     * Возращает текст с детальным описанием заявки
     *
     * @param reqiestId - id заявки
     * @returns {Promise<{phoneNumber: string, detailsMessage: string}>}
     */
    async getRequestDetails(reqiestId) {
        const sql_findRequest = await sqlManager.getSQL('findRequest');
        const [requests] = await pool.query(sql_findRequest, [reqiestId]);
        const detailsMessage = this.buildDetailsMessage(requests[0]);

        return {
            detailsMessage,
            phoneNumber: requests[0].phone_number
        }

    }

    /**
     * Обновляет время заявки
     *
     * @param requestId -id заявки
     * @param time_from - нижнее граничное время
     * @param time_to - верхнее граничное время
     * @returns {Promise<void>}
     */
    async updateTime(requestId, time_from, time_to) {
        const [request] = await pool.query('SELECT date_from, date_to FROM requests WHERE id = ?', [requestId]);

        const params = [];
        let updateFields = [];

        if (time_from) {
            const dateFrom = new Date(request[0].date_from);
            const dateString = dateFrom.toISOString().split('T')[0];
            const newDateFrom = new Date(`${dateString}T${time_from}`);

            updateFields.push('date_from = ?');
            params.push(newDateFrom);
        }

        if (time_to) {
            updateFields.push('date_to = ?');
            params.push(time_to);
        }

        updateFields.push('alert = false') // Скидываем флаг для оповещений
        params.push(requestId);

        if (updateFields.length > 0) {
            const updateQuery = `UPDATE requests
                                 SET ${updateFields.join(', ')}
                                 WHERE id = ?`;
            await pool.query(updateQuery, params);
        }
    }

    /**
     * @param sqlScriptName - имя скрипта
     * @param params - параметры для выборки
     * @returns {Promise<any>} Промис с данными БД
     */
    async fetchData(sqlScriptName, params) {
        const sqlScript = await sqlManager.getSQL(sqlScriptName);
        const [result] = await pool.query(sqlScript, params);
        return result
    }

    /**
     * @param requests - заявки с БД
     * @returns разметка кнопок с датами заявок и их количеством
     */
    generateDateCountMap(requests) {
        const dateCountMap = {};
        let modernCounter = 0;

        requests.forEach((request) => {
            if (request.status === 'work') {
                const uniqueDate = request.date_from.split(" ")[0];
                if (!dateCountMap[uniqueDate]) {
                    dateCountMap[uniqueDate] = 0;
                }
                dateCountMap[uniqueDate]++;
            } else {
                modernCounter++;
            }
        });

        return {dateCountMap, modernCounter};
    }

    /**
     * @param text - текст для кнопки
     * @param callback_data - данные для управления потоком
     * @returns возвращает разметку кнопки для telegram API
     */
    createButton(text, callback_data) {
        return [{text, callback_data}];
    }

    /**
     * @param dateCountMap масив с уникальными датами и количеством заявок по каждой дате
     * @returns кнопки с таками заявок и их количеством
     */
    createDateButtons(dateCountMap) {
        return Object.keys(dateCountMap).map(date => [{
            text: `${date} - ${dateCountMap[date]}шт`,
            callback_data: `date_${date}`
        }]);
    }

    buildStatisticMessage(modernCount, closedCount, deniedCount, totalPaycheck) {
        return 'Статистика за сегодня:\n' +
            `В модерне: ${modernCount}\n` +
            `Закртых: ${closedCount}\n` +
            `Отказов: ${deniedCount}\n` +
            `Чистая зп: ${totalPaycheck / 2}`
    }

    countingStatistic(requests){
        let totalPaycheck = 0;
        const data = {
            modern: 0,
            denied: 0,
            closed: 0,
        }

        requests.forEach((req) => {
            data[req.status]++;
            totalPaycheck += Number(req.paycheck);
        });

        return [data.modern, data.closed, data.denied, totalPaycheck]
    }

    buildDetailsMessage(request){
        return `<b>Заявка</b>: ${request.id}\n`+
            `<b>Имя</b>: ${request.name}\n`+
            `<b>Адрес</b>: ${request.address}\n`+
            `<b>Дата</b>: ${request.date_from}${request.date_to ? '-' + request.date_to : ''}\n`+
            `<b>Описание</b>: ${request.description}\n`+
            `<b>Заметки</b>: ${request.master_notes}\n`+
            `<b>Статус</b>: ${request.status}`;
    }

    async getAllChatsIds(){
        const chats = await this.fetchData('getAllChats', [])
        return chats.map((chat) => chat.chat_id);
    }
}

module.exports = new BotService();