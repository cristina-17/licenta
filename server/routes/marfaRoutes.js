const express = require('express');
const router = express.Router();
const controller = require('../controllers/marfaController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// rute pt get
router.get('/', protect, controller.getMarfuri);
router.get('/verificare-cmp', protect, controller.verificareCmpProfitabilitate);
router.get('/:id', protect, controller.getMarfaById);
router.get('/:id/pret-istoric', protect, controller.getPretIstoric);

// rute pt put/post
router.post('/', protect, controller.addMarfa);
router.put('/:id', protect, controller.updateMarfa);

// ruta pt delete
router.delete('/:id', protect, adminOnly, controller.deleteMarfa);

module.exports = router;