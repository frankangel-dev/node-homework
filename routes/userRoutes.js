const express = require('express');
const { register, googleLogon, logon, logoff } = require("../controllers/userController");
const jwtMiddleware = require("../middleware/jwtMiddleware");

const router = express.Router();

router.post('/register', register);
router.post('/googleLogon', googleLogon)
router.post('/logon', logon);
router.post('/logoff', jwtMiddleware, logoff);

module.exports = router;