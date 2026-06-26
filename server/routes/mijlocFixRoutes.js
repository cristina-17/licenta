const express = require('express');
const router = express.Router();
const controller = require('../controllers/mijlocFixController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, controller.getMijloace);
router.get('/istoric-global', protect, controller.getIstoricAmortizari);
router.get('/neregistrate', protect, controller.getNeregistrate);
router.get('/:id', protect, controller.getMijlocById);
router.post('/', protect, controller.createMijloc);
router.put('/:id', protect, controller.updateMijloc);
router.put('/:id/casare', protect, controller.casareMijloc);

module.exports = router;