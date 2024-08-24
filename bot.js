const TelegramBot = require('node-telegram-bot-api');
const BotService = require('./services/bot.service');
require('dotenv').config();

const userState = {};
const token = process.env.BOT_TOKEN;
const domain = process.env.DOMAIN;
const bot = new TelegramBot(token, { polling: true });

const db = require('./db');

bot.setWebHook(`https://${domain}/bot${token}`);

bot.onText(/\/id/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, chatId);
})

// Отображаем меню с командами
bot.onText(/\/start/, (msg) => {
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

    bot.sendMessage(chatId, 'Выберите команду:', keyboard);
});

bot.onText(/\/r/, async (msg) => {
    const chatId = msg.chat.id;
    const menuRequests = await BotService.getMenuRequests(chatId);

    if (menuRequests.reply_markup.inline_keyboard.length){
        await bot.sendMessage(chatId, 'Выберите заявку:', menuRequests);
    } else {
        await bot.sendMessage(chatId, 'Заявок нет но вы держитесь');
    }
})

bot.onText(/\/t/, async (msg) => {
    const chatId = msg.chat.id;
    const statisticMessage = await BotService.getStatistic(chatId);

    await bot.sendMessage(chatId, statisticMessage);
});

// Обработчик для кнопки "Заявки"
bot.onText(/Заявки/, async (msg) => {
    const chatId = msg.chat.id;
    const menuRequests = await BotService.getMenuRequests(chatId);

    if (menuRequests.reply_markup.inline_keyboard.length){
        await bot.sendMessage(chatId, 'Выберите заявку:', menuRequests);
    } else {
        await bot.sendMessage(chatId, 'Заявок нет но вы держитесь');
    }
});

// Обработчик для кнопки "Статистика"
bot.onText(/Статистика/, async (msg) => {
    const chatId = msg.chat.id;
    const statisticMessage = await BotService.getStatistic(chatId)

    await bot.sendMessage(chatId, statisticMessage);
});

// Обработка нажатия на заявку и отображение опций
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const [key, requestId, status] = query.data.split('_');

    switch (key){
        case 'request':
            const optionsMenu = BotService.getOptionsMenu(requestId);
            await bot.sendMessage(chatId, `Выберите действие для заявки №${requestId}:`, optionsMenu);
            break
        case 'details':
            const requestDetails = await BotService.getRequestDetails(requestId);

            const detailsMessage = `<b>Заявка</b>: ${requestDetails.id}\n<b>Имя</b>: ${requestDetails.name}\n<b>Адрес</b>: ${requestDetails.address}\n<b>Дата</b>: ${requestDetails.date_from}${requestDetails.date_to ? '-' + requestDetails.date_to : ''}\n<b>Описание</b>: ${requestDetails.description}\n<b>Заметки</b>: ${requestDetails.master_notes}\n<b>Статус</b>: ${requestDetails.status}`;

            await bot.sendMessage(chatId, detailsMessage, { parse_mode: 'HTML' });
            await bot.sendMessage(chatId, requestDetails.phone_number);
            break
        case 'update':
            const statusMenu = BotService.getStatusMenu(requestId)
            await bot.sendMessage(chatId, 'Выберите новый статус:', statusMenu);
            break
        case 'setstatus':
            if (status === 'closed') {
                // Устанавливаем состояние ожидания ввода суммы
                userState[chatId] = { awaitingAmount: requestId };

                await bot.sendMessage(chatId, 'Сколько денег ты принес?');
            } else {
                await BotService.updateStatus(requestId, status);
                await bot.sendMessage(chatId, `Статус заявки успешно обновлен`);
            }

            await bot.answerCallbackQuery(query.id);
            break
        case 'notes':
            userState[chatId] = { awaitingNotes: requestId };
            await bot.sendMessage(chatId, 'На что жалуемся?');
            break
        case 'time':
            userState[chatId] = { awaitingTime: requestId };
            await bot.sendMessage(chatId, 'Укажите время в формате 00:00 или 00:00-00:00');
            break

    }
});

// Обработка сообщений для ввода суммы
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) {
        return;
    }

    // Обработка состояния ожидания ввода суммы
    if (userState[chatId] && userState[chatId].awaitingAmount) {
        const requestId = userState[chatId].awaitingAmount;

        // Обрабатываем введенную сумму
        const amount = text;

        // Обновляем статус и сумму в базе данных
        await BotService.updateStatus(requestId, 'closed', amount);

        bot.sendMessage(chatId, `Заявка закрыта, в копилку: ${amount}`);

        // Сбрасываем состояние ожидания
        delete userState[chatId];
    }
    // Обработка состояния ожидания ввода заметки
    else if (userState[chatId] && userState[chatId].awaitingNotes) {
        const requestId = userState[chatId].awaitingNotes;

        // Обновляем заметку в базе данных
        await BotService.updateNote(requestId, text);

        bot.sendMessage(chatId, `Заметка добавлена`);

        // Сбрасываем состояние ожидания
        delete userState[chatId];
    }
    // Обработка состояния ожидания изменения времени
    else if (userState[chatId] && userState[chatId].awaitingTime) {
        const requestId = userState[chatId].awaitingTime;


        // Разбор времени
        const timeParts = text.split('-');

        let timeFrom, timeTo;
        if (timeParts.length === 2) {
            // Если введено два времени (например, 15:52-16:42)
            timeFrom = timeParts[0].trim();
            timeTo = timeParts[1].trim();
        } else {
            // Если введено одно время (например, 15:52)
            timeFrom = timeParts[0].trim();
        }

        // Обновляем время в базе данных
        await BotService.updateTime(requestId, timeFrom, timeTo);

        bot.sendMessage(chatId, `Время обновлено: ${timeFrom}${timeTo ? '-' + timeTo : ''}`);

        // Сбрасываем состояние ожидания
        delete userState[chatId];
    }
});

module.exports = bot;