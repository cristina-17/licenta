const Plata = require('../models/plataModel');
const Factura = require('../models/facturaModel');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.getTranzactii = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const filtre = {
            cautare: req.query.cautare,
            tip: req.query.tip,
            metoda_plata: req.query.metoda_plata,
            data_start: req.query.data_start,
            data_final: req.query.data_final
        };

        const sortare = {
            field: req.query.sort_field || 'data',
            order: req.query.sort_order || 'desc'
        };

        const result = await Plata.getAll(filtre, sortare, page, limit);
        res.json({
            data: result.data,
            total: result.total,
            page,
            totalPages: Math.ceil(result.total / limit)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Eroare server.' });
    }
};

exports.createPlata = async (req, res) => {
    try {
        const { id_factura, metoda_plata } = req.body;

        if (!id_factura || !metoda_plata) {
            return res.status(400).json({ message: 'Lipsesc câmpuri obligatorii.' });
        }

        const factura = await Factura.getById(id_factura);
        if (!factura) return res.status(404).json({ message: 'Factura nu există.' });

        const tipOperatiune = factura.tip === 'emisă' ? 'încasare' : 'plată';
        const suma = parseFloat(factura.total_brut);

        if (metoda_plata === 'cash') {
            // verificare facturi mai mari de 5000 (pt plati si incasari)
            if (suma > 5000) {
                return res.status(400).json({
                    message: `Tranzacțiile cash nu pot depăși 5.000 RON per tranzacție. Suma facturii: ${suma} RON.`
                });
            }

            // verificare sume pt un partener pe zi (pt plati si incasari)
            const totalZiPartener = await Plata.getTotalTranzactiiCashZiPartener(tipOperatiune, factura.id_partener);
            if (totalZiPartener + suma > 5000) {
                return res.status(400).json({
                    message: `Limita zilnică de 5.000 RON per partener ar fi depășită. Înregistrat azi cu acest partener: ${totalZiPartener} RON, cerut acum: ${suma} RON.`
                });
            }

            // verificare sume totale pe zi (doar pt plati)
            if (tipOperatiune === 'plată') {
                const totalZi = await Plata.getTotalPlatiCashZi('plată');
                if (totalZi + suma > 10000) {
                    return res.status(400).json({
                        message: `Limita zilnică totală de 10.000 RON pentru plăți cash ar fi depășită. Plătit azi: ${totalZi} RON, cerut acum: ${suma} RON.`
                    });
                }
            }
        }

        const id = await Plata.create({
            id_factura,
            tip: tipOperatiune,
            metoda_plata,
            suma
        });

        res.status(201).json({ message: 'Tranzacție înregistrată cu succes!', id });
    } catch (err) {
        console.error('createPlata error:', err);
        res.status(400).json({ message: err.sqlMessage || 'Eroare la procesare.' });
    }
};

exports.getFacturiDePlata = async (req, res) => {
    try {
        const cautare = req.query.cautare || '';
        const status = req.query.status || 'primită';
        const facturi = await Plata.getFacturiDePlata(cautare, status);
        res.json(facturi);
    } catch (err) {
        res.status(500).json({ message: 'Eroare la căutare facturi.' });
    }
};

// creare intent (in-app payment)
exports.createPaymentIntent = async (req, res) => {
    try {
        const { id_factura } = req.body;
        const factura = await Factura.getById(id_factura);
        if (!factura) return res.status(404).json({ message: 'Factura nu există' });

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(factura.total_brut * 100),
            currency: 'ron',
            metadata: { id_factura: id_factura.toString(), tip: 'plată' }
        });

        res.json({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
        res.status(500).json({ message: 'Eroare la conectarea cu Stripe' });
    }
};

// confirmare si salvare in baza de date (in-app payment)
exports.confirmPaymentIntent = async (req, res) => {
    try {
        const { paymentIntentId, id_factura } = req.body;
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (intent.status === 'succeeded') {
            const factura = await Factura.getById(id_factura);
            await Plata.create({
                id_factura: id_factura,
                tip: 'plată',
                metoda_plata: 'card',
                suma: factura.total_brut
            });
            await Plata.updateFacturaStatus(id_factura, 'plătită');
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, message: 'Plata nu a fost aprobată' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Eroare validare plată' });
    }
};

// generare link de plata (pt a trimite clientilor)
exports.createCheckoutSession = async (req, res) => {
    try {
        const { id_factura } = req.body;
        const factura = await Factura.getById(id_factura);
        if (!factura) return res.status(404).json({ message: 'Factura nu există' });

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'ron',
                    product_data: { name: `Factură #${factura.numar} - ${factura.partener_nume}` },
                    unit_amount: Math.round(factura.total_brut * 100),
                },
                quantity: 1,
            }],
            mode: 'payment',
            // redirectionare la pagina publica de succes care nu necesita autentificare
            success_url: `${process.env.CLIENT_URL}/plata-success?session_id={CHECKOUT_SESSION_ID}&factura_id=${id_factura}`,
            cancel_url: `${process.env.CLIENT_URL}/plata-success?session_id=cancelled&factura_id=${id_factura}`,
        });

        res.json({ url: session.url });
    } catch (err) {
        res.status(500).json({ message: 'Eroare generare link Stripe' });
    }
};

// verificare si salvare link extern in baza de date
exports.confirmCheckoutSession = async (req, res) => {
    try {
        const { session_id, id_factura } = req.body;
        const session = await stripe.checkout.sessions.retrieve(session_id);

        if (session.payment_status === 'paid') {
            const factura = await Factura.getById(id_factura);

            // daca deja incasata, returnam succes fara a mai insera (prevenim duplicate)
            if (factura.status === 'încasată') {
                return res.json({ success: true, nr_factura: factura.numar });
            }

            await Plata.create({
                id_factura: id_factura,
                tip: 'încasare',
                metoda_plata: 'card',
                suma: factura.total_brut
            });
            await Plata.updateFacturaStatus(id_factura, 'încasată');
            res.json({ success: true, nr_factura: factura.numar });
        } else {
            res.status(400).json({ success: false });
        }
    } catch (err) {
        res.status(500).json({ message: 'Eroare validare sesiune' });
    }
};