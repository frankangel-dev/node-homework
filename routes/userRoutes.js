const express = require('express');
const userController = require('../controllers/userController');
const router = express.Router();

router.post('/register', userController.register);
router.post('/logon', userController.logon);
router.post('/logoff', userController.logoff);

module.exports = router;