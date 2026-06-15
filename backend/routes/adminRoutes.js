const express = require('express');
const router = express.Router();
const { login, getUsers } = require('../controllers/adminController');
const { getBlocks, addBlock, removeBlock } = require('../controllers/blockController');

router.post('/login', login);
router.get('/users', getUsers);
router.get('/blocks', getBlocks);
router.post('/blocks', addBlock);
router.delete('/blocks/:id', removeBlock);

module.exports = router;