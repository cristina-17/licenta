const express = require('express');
const router = express.Router();
const partenerController = require('../controllers/partenerController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// obtinere lista pt orice utilizator logat
router.get('/', protect, partenerController.getParteneri);

// obtinere partener singular pt editare
router.get('/:id', protect, partenerController.getPartenerById);

// adaugare, editare, stergere partener doar pt admin
router.post('/', protect, adminOnly, partenerController.addPartener);
router.put('/:id', protect, adminOnly, partenerController.updatePartener);
router.delete('/:id', protect, adminOnly, partenerController.deletePartener);

module.exports = router;