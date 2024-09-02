const express = require('express');
const authMiddleware = require("../middlewares/auth");
const router = express.Router();
const AdminService = require("../services/admin.service")
const multer = require('multer');
const upload = multer();

router.get('/', authMiddleware, async (req, res, next) => {
    const timeFilter = req.query.timeFilter ?? 'today';
    const statusFilter = req.query.statusFilter ?? 'all';
    const chatFilter = req.query.chatFilter ?? 'all';
    const date = req.query.date ?? '';

    const [requests, chats, statuses] = await Promise.all([
        AdminService.getRequests(timeFilter, statusFilter, chatFilter, date),
        AdminService.getChats(),
        AdminService.getStatuses()
    ]);

    res.render('admin', {requests, chats, statuses, timeFilter, statusFilter, chatFilter, date});
});

router.get('/create-request', async (req, res) => {
    const [chats, statuses] = await Promise.all([
        AdminService.getChats(),
        AdminService.getStatuses()
    ]);
    res.render('create-request', {chats, statuses});
})

router.post('/request', upload.none(), async (req, res) => {
    const result = await AdminService.createRequest(req.body)
    res.json(result);
});

router.post('/chat', upload.none(), async (req, res) => {
    const result = await AdminService.createChat(req.body)
    res.json(result);
});

router.post('/hide-chat', upload.none(), async (req, res) => {
    const result = await AdminService.hideChat(req.body)
    res.json(result);
});

router.post('/update/:id', upload.none(), async function(req, res) {
    const requestId = req.params.id;
    const result = await  AdminService.updateRequest(requestId, req.body);
    res.json(result);
});

router.get('/find/:phoneNumber', async (req, res) =>{
    const phoneNumber = req.params.phoneNumber || '';

    const [requests, chats, statuses] = await Promise.all([
        AdminService.findByPhoneNumber(phoneNumber),
        AdminService.getChats(),
        AdminService.getStatuses()
    ]);

    res.render('phone', {requests, chats, statuses});
});

module.exports = router;