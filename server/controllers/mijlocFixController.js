const MijlocFix = require('../models/mijlocFixModel');

// get mijloace fixe
exports.getMijloace = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const filtre = {
            cautare: req.query.cautare,
            status: req.query.status,
            tip_amortizare: req.query.tip_amortizare
        };

        // sortare campul dorit (valoare intrare/valoare acuala) cresc/descresc
        const sortare = {
            field: req.query.sort_field,
            order: req.query.sort_order
        };

        const result = await MijlocFix.getAll(filtre, sortare, page, limit);
        res.json({
            data: result.data,
            total: result.total,
            page,
            totalPages: Math.ceil(result.total / limit)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Eroare la preluarea mijloacelor fixe' });
    }
};

// get mijloc fix
exports.getMijlocById = async (req, res) => {
    try {
        const mf = await MijlocFix.getById(req.params.id);
        if (!mf) return res.status(404).json({ message: 'Nu a fost găsit.' });
        res.json(mf);
    } catch (err) {
        res.status(500).json({ message: 'Eroare server.' });
    }
};

// get mijloacele neinregistrate (preluate din mijloace_fixe_factura)
exports.getNeregistrate = async (req, res) => {
    try {
        const data = await MijlocFix.getNeregistrateDinFacturi();
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Eroare la preluarea mijloacelor fixe din facturi' });
    }
};

// adaugare mijloc fix
exports.createMijloc = async (req, res) => {
    try {
        const { denumire, nr_inventar, data_intrare, data_sfarsit,
                valoare_intrare, tip_amortizare, val_amort_acc, cont_contabil } = req.body;

        if (!denumire || !nr_inventar || !data_intrare || !data_sfarsit || !valoare_intrare) {
            return res.status(400).json({ message: 'Toate câmpurile obligatorii trebuie completate.' });
        }

        // validare suma pt amortizare accelerata
        if (tip_amortizare === 'accelerată') {
            const limita = parseFloat(valoare_intrare) * 0.5;
            const valAcc = parseFloat(val_amort_acc);
            if (isNaN(valAcc) || valAcc <= 0) {
                return res.status(400).json({ message: 'Introduceți o valoare validă pentru amortizarea accelerată.' });
            }
            if (valAcc > limita) {
                return res.status(400).json({
                    message: `Valoarea amortizată în primul an nu poate depăși 50% din valoarea de intrare (max: ${limita.toFixed(2)} RON).`
                });
            }
        }
        const data = {
            id_factura_item: req.body.id_factura_item || null,
            denumire, nr_inventar, data_intrare, data_sfarsit, valoare_intrare,
            cont_contabil,
            tip_amortizare: tip_amortizare || 'liniară',
            val_amort_acc: val_amort_acc || 0
        };

        const id = await MijlocFix.create(data);
        res.status(201).json({ message: 'Mijloc fix creat', id });
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: err.sqlMessage || 'Eroare la creare.' });
    }
};

// editare
exports.updateMijloc = async (req, res) => {
    try {
        const data = {};

        if (req.body.denumire) data.denumire = req.body.denumire;

        const affected = await MijlocFix.update(req.params.id, data);
        if (affected === 0) return res.status(404).json({ message: 'Nu a fost găsit sau nu au fost modificări.' });

        res.json({ message: 'Actualizat cu succes.' });
    } catch (err) {
        res.status(400).json({ message: err.sqlMessage || 'Eroare la actualizare.' });
    }
};

// casare
exports.casareMijloc = async (req, res) => {
    try {
        await MijlocFix.casare(req.params.id);
        res.json({ message: 'Mijloc fix casat cu succes.' });
    } catch (err) {
        res.status(400).json({ message: err.sqlMessage || 'Eroare la casare.' });
    }
};

// get toate amortizarile
exports.getIstoricAmortizari = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;

        const filtre = {
            cautare: req.query.cautare,
            data_start: req.query.data_start,
            data_final: req.query.data_final
        };

        const result = await MijlocFix.getAllAmortizari(filtre, page, limit);
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: 'Eroare server' });
    }
};