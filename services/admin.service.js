const pool = require('../db');
const sqlManager = require('../common/sql.manager');
const bot = require('../bot');

class AdminService {
    constructor() {
    }

    async createRequest(data) {
        try {
            const phoneId = await this.createPhoneNumber(data.phone_number);
            const sql_createRequest = await sqlManager.getSQL('createRequest')
            const [result] = await pool.query(
                sql_createRequest,
                [
                    data.chat_id,
                    phoneId,
                    data.name,
                    data.address,
                    data['time-from'] ? new Date(data['time-from']) : null,
                    data['time-to'] ? data['time-to'] : null,
                    data.description,
                    data.admin_notes,
                    data.master_notes,
                    parseFloat(data.paycheck) || null,
                    data.status_id
                ]
            );

            const sql_findChat = await sqlManager.getSQL('findChat');
            const [chat] = await pool.query(sql_findChat, [data.chat_id]);
            bot.sendMessage(chat[0].chat_id, 'Опа! Заявочка... Чиназес... Сюда)');
            return { success: true }
        } catch (err) {
            console.error(`Ошибка при создании заявки: ${err}`)
            return { success: false }
        }
    }

    async createPhoneNumber(phoneNumber) {
        try {
            let phoneId;
            if (phoneNumber) {
                const [phoneRows] = await pool.query(
                    'SELECT id FROM phones WHERE phone_number = ?',
                    [phoneNumber]
                );

                if (phoneRows.length > 0) {
                    phoneId = phoneRows[0].id;
                } else {
                    // Если телефона нет, вставляем новый
                    const [result] = await pool.query(
                        'INSERT INTO phones (phone_number) VALUES (?)',
                        [phoneNumber]
                    );
                    phoneId = result.insertId;
                }
            }
            return phoneId;
        } catch (err) {
            console.error(`Ошибка при создании номера телефона: ${err}`)
            throw err;
        }
    }

    async createChat(data){
        try {
            const sql_createChat = await sqlManager.getSQL('createChat');
            const [result] = await pool.query(sql_createChat, [data.pokemon_name, Number(data.chat), 1])
            return { success: true }
        } catch (err) {
            console.error(`Ошибка при создании чата: ${err}`)
            return { success: false }
        }
    }

    async getRequests(time, status, chatId) {
        try {
            const timeFilter = this.getStartDateFilter(time);
            const statusFilter = this.getStatusFilter(status);
            const chatFilter = chatId !== 'all' ? ` AND chat_id = ${chatId}` : '';
            const orderBy = ' ORDER BY r.date_from ASC;';

            let filters = timeFilter + statusFilter + chatFilter + orderBy;

            let sql_getAllRequests = await sqlManager.getSQL('getAllRequests');
            sql_getAllRequests = sql_getAllRequests.replace('<FILTERS>', filters);

            const [rows] = await pool.query(sql_getAllRequests);
            return rows;
        } catch (err) {
            console.error(`Ошибка при выполнении запроса getRequests: ${err}`);
            throw err;
        }
    }

    async getChats() {
        try {
            const sql_getAllChats = await sqlManager.getSQL('getAllChats');
            const [rows] = await pool.query(sql_getAllChats);
            return rows;
        } catch (err) {
            console.error(`Ошибка при выполнении запроса getAllChats: ${err}`);
            throw err;
        }
    }

    async getStatuses() {
        try {
            const sql_getAllStatuses = await sqlManager.getSQL('getAllStatuses');
            const [rows] = await pool.query(sql_getAllStatuses);
            return rows;
        } catch (err) {
            console.error(`Ошибка при выполнении запроса getAllStatuses: ${err}`);
            throw err;
        }
    }

    async updateRequest(id, data) {
        try {
            const phoneId = await this.createPhoneNumber(data.phone_number);
            const sql_updateRequest = await sqlManager.getSQL('updateRequest')
            const [result] = await pool.query(
                sql_updateRequest,
                [
                    data.chat_id,
                    phoneId,
                    data.name,
                    data.address,
                    data['time-from'] ? new Date(data['time-from']) : null,
                    data['time-to'] ? data['time-to'] : null,
                    data.description,
                    data.admin_notes,
                    data.master_notes,
                    parseFloat(data.paycheck) || null,
                    data.status_id,
                    id
                ]
            );

            return { success: true }
        } catch (err) {
            console.error(`Ошибка при создании заявки: ${err}`)
            return { success: false }
        }
    }

    async hideChat(data) {
        try {
            const id = data['hide-chat_id'];
            const sql_findChat = await sqlManager.getSQL('findChat');
            const [row] = await pool.query(sql_findChat, [id])
            if (row) {
                await pool.query('UPDATE chats SET `show` = 0 WHERE id = ?', [id])
                return { success: true }
            }
            throw Error('Димка каким то хуем прокинул несуществующий id')
        } catch (err) {
            console.error(err);
            return {success: false}
        }
    }

    getStartDateFilter(time) {
        if (time) {
            const today = new Date();
            let dateFrom;

            switch (time) {
                case 'today':
                    dateFrom = today.toISOString().split('T')[0]; // Получаем только дату без времени
                    return ` AND DATE(r.date_from) = '${dateFrom}'`;
                case 'month':
                    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
                    return ` AND r.date_from >= '${monthStart}' AND r.date_from <= '${monthEnd}'`;
                case 'all':
                    return '';
                default:
                    throw new Error('Invalid time filter');
            }
        }
        return ''
    }

    getStatusFilter(statusFilter) {
        switch (statusFilter) {
            case 'all':
                return ''
            case 'work+modern':
                return ` AND (r.status_id = 1 OR r.status_id = 2)`
            case 'work':
                return ` AND r.status_id = 1`
            case 'modern':
                return ` AND r.status_id = 2`
            case 'closed':
                return ` AND r.status_id = 3`
            case 'denied':
                return ` AND r.status_id = 4`
            default:
                throw new Error('Invalid status filter');
        }
    }

    async findByPhoneNumber(phoneNumber){
        try {
            const sql_findByNumber = await sqlManager.getSQL('findByNumber');
            const [rows] = await pool.query(sql_findByNumber, [phoneNumber]);
            return rows;
        } catch (err) {
            console.error(`Ошибка при поиске по номеру: ${err}`)
        }
    }
}

module.exports = new AdminService();