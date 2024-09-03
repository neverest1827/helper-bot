const cron = require('node-cron');
const bot = require('./bot');
const BotService = require('./services/bot.service');
const pool = require('./db');

cron.schedule('*/5 * * * *', async () => {
    try {
        const requests = await BotService.fetchData('getCroneRequests', [])

        if (requests.length) {
            for (const request of requests) {
                await bot.sendMessage(request.chatId, `К заявке №${request.id} по адресу ${request.address} осталось меньше часа`);
                await pool.query('UPDATE requests SET alert = true WHERE id = ?', [request.id]);
            }
        }
    } catch (error) {
        console.error('Ошибка при выполнении cron-задачи:', error);
    }
});

cron.schedule('55 23 * * *', async () => {
    const chats = await BotService.fetchData('getAllChats', [])
    for (const chat of chats) {
        if (chat.show){
            const chatId = chat.chat_id;
            const statisticMessage = await BotService.getStatistic(chatId);
            await bot.sendMessage(chatId, statisticMessage);
        }
    }
});