const express = require('express');
const router = express.Router();
const controller = require('../controllers/firmaController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', protect, controller.getFirmaDetails);
router.put('/:id', protect, adminOnly, controller.updateFirma);

module.exports = router;