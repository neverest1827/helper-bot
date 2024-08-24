const express = require('express');
const authMiddleware = require("../middlewares/auth");
const router = express.Router();
const AdminService = require("../services/admin.service")
const multer = require('multer');
const upload = multer();

router.get('/', authMiddleware, async (req, res, next) => {
    const timeFilter = req.query.timeFilter ?? 'today';
    const statusFilter = req.query.statusFilter ?? 'all';

    const [requests, chats, statuses] = await Promise.all([
        AdminService.getRequests(timeFilter, statusFilter),
        AdminService.getChats(),
        AdminService.getStatuses()
    ]);

    console.log(statuses);
    res.render('admin', {requests, chats, statuses, timeFilter, statusFilter});
});

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

module.exports = router;