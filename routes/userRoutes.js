const express = require('express');
const userController = require('../controllers/userController');
const jwtMiddleware = require("../middleware/jwtMiddleware");

const router = express.Router();

router.post('/register', userController.register);
router.post('/logon', userController.logon);
router.post('/logoff', jwtMiddleware, userController.logoff);

module.exports = router;