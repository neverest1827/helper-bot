const TelegramBot = require('node-telegram-bot-api');
const BotService = require('./services/bot.service');
require('dotenv').config();

const userState = {};
const token = process.env.BOT_TOKEN;
const domain = process.env.DOMAIN;
const bot = new TelegramBot(token, {polling: true});

bot.setWebHook(`https://${domain}/bot${token}`);

bot.onText(/\/id/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, chatId);
})

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    const keyboard = {
        reply_markup: {
            keyboard: [
                ['Заявки', 'Статистика']
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    };

    await bot.sendMessage(chatId, 'Выберите команду:', keyboard);
});

bot.onText(/\/mass (.+)/, async (msg, match) => {
    try {
        const text = match[1];
        const chatsIds = await BotService.getAllChatsIds();

        for (const chatId of chatsIds){
            await bot.sendMessage(chatId, text);
        }
    } catch (err) {
        console.error(`Ошибка отправки массового сообщения: ${err.message}`)
    }
})

bot.onText(/Заявки/, async (msg) => {
    try {
        const chatId = msg.chat.id;
        const messageId = msg.message_id;
        const menuMarkup = await BotService.getMainMenu(chatId);
        await sendMenu(chatId, messageId, 'Выберите дату:', menuMarkup);
    } catch (err) {
        console.error(`Ошибка получения главного меню ${err.message}`)
    }

});

bot.onText(/Статистика/, async (msg) => {
    try {
        const chatId = msg.chat.id;
        const messageId = msg.message_id;
        const statisticMessage = await BotService.getStatistic(chatId)

        await bot.deleteMessage(chatId, messageId);
        await bot.sendMessage(chatId, statisticMessage);
    } catch (err) {
        console.error(`Ошибка получения главного меню ${err.message}`);
    }
});

bot.on('callback_query', async (query) => {
    try {
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;
        const keys = query.data.split('_');

        switch (keys[0]){
            case 'date':
                await sendRequestsMenu(chatId, messageId, keys[1])
                break
            case 'back':
                await redirect(chatId, messageId, keys)
                break
            case 'request':
                const optionsMenu = BotService.getOptionsMenu(keys[1], keys[2]);
                await sendMenu(chatId, messageId, `Выберите действие для заявки №${keys[1]}:`, optionsMenu )
                break
            case 'update':
                const statusMenu = BotService.getStatusMenu(keys[1], keys[2])
                await sendMenu(chatId, messageId, `Выберите новый статус для заявки №${keys[1]}:`, statusMenu);
                break
            case 'setStatus':
                await setStatus(keys[1], keys[2], query.id, chatId);
                break
            case 'notes':
                userState[chatId] = {awaitingNotes: keys[1]};
                await bot.sendMessage(chatId, 'На что жалуемся?');
                break
            case 'time':
                userState[chatId] = {awaitingTime: keys[1]};
                await bot.sendMessage(chatId, 'Укажите время в формате 00:00 или 00:00-00:00');
                break
            case 'details':
                const data = await BotService.getRequestDetails(keys[1]);

                await bot.sendMessage(chatId, data.detailsMessage, {parse_mode: 'HTML'});
                await bot.sendMessage(chatId, data.phoneNumber);
                break
        }
    } catch (err) {
        console.error(`Ошибка выполнения команды ${err.message}`);
    }
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    if (userState[chatId]) {
        const state = userState[chatId];
        try {
            if (state.awaitingAmount) {
                const amount = text;
                const isValidAmount = validateAmount(amount)
                if(isValidAmount) {
                    await BotService.updateStatus(state.awaitingAmount, 'closed', amount);
                    await bot.sendMessage(chatId, `Заявка закрыта, в копилку: ${amount}`);

                    delete userState[chatId];
                } else {
                    await bot.sendMessage(chatId, `Некоректное число. Попробуйте еще раз ответить на сообщение`);
                }
            } else if (state.awaitingNotes) {
                await BotService.updateNote(state.awaitingNotes, text, 'updateMasterNote', 'master_notes');
                await bot.sendMessage(chatId, `Заметка добавлена`);

                delete userState[chatId];
            } else if (state.awaitingDeniedNote) {
                const requestId = state.awaitingDeniedNote;

                await BotService.updateNote(requestId, text, 'updateAdminNote', 'admin_notes');
                await BotService.updateStatus(requestId, 'denied', text);
                await bot.sendMessage(chatId, `Статус заявки успешно обновлен`);

                delete userState[chatId];
            } else if (state.awaitingTime) {
                const isValid = validateTimeFormat(text);

                if (isValid) {
                    const [time_from, time_to] = text.split('-');

                    await BotService.updateTime(state.awaitingTime, time_from, time_to);
                    await bot.sendMessage(chatId, 'Время обновлено');

                    delete userState[chatId];
                } else {
                    await bot.sendMessage(
                        chatId, 'Невалидное время. Поддерживается только формат 00:00 и 00:00-00:00'
                    );
                }
            }
        } catch (error) {
            console.error('Ошибка при обработке состояния:', error);
            await bot.sendMessage(
                chatId, 'Произошла ошибка при обработке вашего запроса. Попробуйте еще раз ответить на сообщенияе.'
            );
        }
    }
});

async function sendMenu(chatId, messageId, text, menuMarkup) {
    try {
        await bot.deleteMessage(chatId, messageId);
        if (menuMarkup.reply_markup.inline_keyboard.length) {
            await bot.sendMessage(chatId, text, menuMarkup);
        } else {
            await bot.sendMessage(chatId, 'Заявок нет но вы держитесь');
        }
    } catch (err) {
        console.error(`Ошиюка при отправке меню: ${err.message}`)
        await bot.sendMessage(chatId, 'Ошибка...');
    }
}

async function sendRequestsMenu(chatId, messageId, date){
    let text;
    let params;
    let sqlScriptName;
    if (date === 'modern'){
        sqlScriptName = 'getModernRequests';
        params = [chatId];
        text = 'Заявки в статусе модерн';
    } else {
        sqlScriptName = 'getWorkRequests';
        params = [chatId, date];
        text = `Активные заявки на ${date}:`;
    }
    const requestsMenu = await BotService.getRequestsMenu(sqlScriptName, params)
    await sendMenu(chatId, messageId, text, requestsMenu);
}

async function redirect(chatId, messageId, keys) {
    switch (keys[1]) {
        case 'main':
            const menuMarkup = await BotService.getMainMenu(chatId);
            await sendMenu(chatId, messageId, 'Выберите дату:', menuMarkup);
            break
        case 'date':
            await sendRequestsMenu(chatId, messageId, keys[2])
            break
        case 'request':
            const optionsMenu = BotService.getOptionsMenu(keys[2], keys[3]);
            await sendMenu(chatId, messageId, `Выберите действие для заявки №${keys[2]}:`, optionsMenu )
            break
    }
}

async function setStatus(requestId, status, queryId, chatId){
    switch (status) {
        case 'closed':
            userState[chatId] = {awaitingAmount: requestId};
            await bot.sendMessage(chatId, 'Сколько денег ты принес?');
            break
        case 'denied':
            userState[chatId] = {awaitingDeniedNote: requestId};
            await bot.sendMessage(chatId, 'Причина остановки?');
            break
        default:
            await BotService.updateStatus(requestId, status);
            await bot.sendMessage(chatId, `Статус заявки успешно обновлен`);
    }
    await bot.answerCallbackQuery(queryId);
}

function validateTimeFormat(timeString) {
    const singleTimePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
    const rangeTimePattern = /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/;

    return singleTimePattern.test(timeString) || rangeTimePattern.test(timeString);
}

function validateAmount(amount) {
    if (isNaN(amount)) {
        return false;
    }

    const num = parseFloat(amount);
    if (num <= 0 || !/^\d+(\.\d{1,2})?$/.test(amount)) {
        return false;
    }

    return true;
}


module.exports = bot;