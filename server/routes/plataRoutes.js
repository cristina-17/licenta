const express = require('express');
const router = express.Router();
const controller = require('../controllers/plataController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, controller.getTranzactii);
router.post('/', protect, controller.createPlata);
router.get('/eligibile', protect, controller.getFacturiDePlata);

// stripe - rute protejate
router.post('/create-payment-intent', protect, controller.createPaymentIntent);
router.post('/confirm-payment', protect, controller.confirmPaymentIntent);
router.post('/create-checkout-session', protect, controller.createCheckoutSession);

// stripe - rute publice
router.post('/confirm-checkout-session', controller.confirmCheckoutSession);

module.exports = router;
