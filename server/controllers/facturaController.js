const Factura = require('../models/facturaModel');


// get toate facturile
exports.getFacturi = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const filtre = {
            cautare: req.query.cautare,
            cautare_partener: req.query.cautare_partener,
            id_partener: req.query.partener,
            status: req.query.status,
            tip: req.query.tip,
            tip_produse: req.query.tip_produse,
            data_emitere_start: req.query.data_emitere_start,
            data_emitere_final: req.query.data_emitere_final,
            data_scadenta_start: req.query.data_scadenta_start,
            data_scadenta_final: req.query.data_scadenta_final
        };

        let sort = {};
        if (req.query.sort_by) {
            sort = { field: req.query.sort_by, order: req.query.order };
        }

        const result = await Factura.getAll(filtre, sort, page, limit);

        res.json({
            data: result.data,
            total: result.total,
            page,
            totalPages: Math.ceil(result.total / limit)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Eroare server la preluarea facturilor' });
    }
};

// get factura
exports.getFacturaById = async (req, res) => {
    try {
        const factura = await Factura.getById(req.params.id);
        if (!factura) return res.status(404).json({ message: 'Factura nu există' });
        res.json(factura);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Eroare server' });
    }
};

// adaugare factura
exports.createFactura = async (req, res) => {
    try {
        const { produse, ...facturaData } = req.body;
        const id_utilizator = req.user.id;

        if (!produse || produse.length === 0) {
            return res.status(400).json({ message: 'Factura trebuie să conțină cel puțin un produs.' });
        }

        const facturaId = await Factura.create(facturaData, produse, id_utilizator);
        res.status(201).json({ message: 'Factură creată cu succes', id: facturaId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.sqlMessage || 'Eroare la crearea facturii' });
    }
};

//stergere factura doar pt admin
exports.deleteFactura = async (req, res) => {
    try {
        await Factura.delete(req.params.id);
        res.json({ message: 'Factură ștearsă' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Eroare la ștergere' });
    }
};

// editare factura
exports.updateFacturaHeader = async (req, res) => {
    try {
        await Factura.updateHeader(req.params.id, req.body);
        res.json({ message: 'Factură actualizată' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Eroare la actualizare' });
    }
};