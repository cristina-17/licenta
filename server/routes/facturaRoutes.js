const express = require('express');
const router = express.Router();
const controller = require('../controllers/facturaController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', protect, controller.getFacturi);
router.get('/:id', protect, controller.getFacturaById);
router.post('/', protect, controller.createFactura);
router.put('/:id', protect, controller.updateFacturaHeader);
router.delete('/:id', protect, adminOnly, controller.deleteFactura);

module.exports = router;