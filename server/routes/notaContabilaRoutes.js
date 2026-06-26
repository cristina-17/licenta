const express = require('express');
const router = express.Router();
const controller = require('../controllers/notaContabilaController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, controller.getNotaContabila);
router.get('/:id', protect, controller.getDetaliiNota);
router.put('/:id/finalizeaza', protect, controller.finalizeazaNota);

module.exports = router;