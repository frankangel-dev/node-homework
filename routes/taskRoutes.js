const express = require('express');
const { index, show, create, update, deleteTask, bulkCreate } = require("../controllers/taskController");

const router = express.Router();

router.post('/bulk', bulkCreate);
router.get('/', index);
router.get('/:id', show);
router.post('/', create);
router.patch('/:id', update);
router.delete('/:id', deleteTask);

module.exports = router;