const express = require('express');
const router = express.Router();
const controller = require('../controllers/obiectInventarController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// rute pt get
router.get('/', protect, controller.getObiecte);
router.get('/:id', protect, controller.getObiectById);

// rute pt put/post
router.post('/', protect, controller.addObiect);
router.put('/:id', protect, controller.updateObiect);

//ruta pt stergere
router.delete('/:id', protect, adminOnly, controller.deleteObiect);

module.exports = router;