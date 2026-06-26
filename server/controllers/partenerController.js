const Partener = require('../models/partenerModel');

// get parteneri
exports.getParteneri = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // extragere filtre
        const filtre = {
            cautare: req.query.cautare || null,
            tip: req.query.tip || null
        };

        const result = await Partener.getAll(filtre, page, limit);

        res.json({
            parteneri: result.data,
            total: result.total,
            page: page,
            limit: limit,
            totalPages: Math.ceil(result.total / limit)
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Eroare la preluarea partenerilor." });
    }
};

// get by id parteneri (pt editare)
exports.getPartenerById = async (req, res) => {
    try {
        const { id } = req.params;
        const partener = await Partener.getById(id);
        if (!partener) {
            return res.status(404).json({ message: "Partenerul nu a fost găsit" });
        }
        res.json(partener);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Eroare server" });
    }
};

// adaugare partener
exports.addPartener = async (req, res) => {
    try {
        const idPartener = await Partener.create(req.body);
        res.status(201).json({ message: "Partener adăugat cu succes!", id: idPartener });
    } catch (error) {
        console.error("Eroare addPartener:", error);
        res.status(500).json({ message: "Eroare la salvarea partenerului." });
    }
};

// editare partener
exports.updatePartener = async (req, res) => {
    try {
        const { id } = req.params;
        const affectedRows = await Partener.update(id, req.body);

        if (affectedRows === 0) {
            return res.status(404).json({ message: "Partenerul nu a fost găsit." });
        }
        res.json({ message: "Partener actualizat cu succes!" });
    } catch (error) {
        res.status(500).json({ message: "Eroare la actualizarea partenerului." });
    }
};

// stergere partener
exports.deletePartener = async (req, res) => {
    try {
        const { id } = req.params;
        const affectedRows = await Partener.delete(id);

        if (affectedRows === 0) {
            return res.status(404).json({ message: "Partenerul nu a fost găsit." });
        }
        res.json({ message: "Partener șters cu succes!" });
    } catch (error) {
        res.status(500).json({ message: "Nu s-a putut șterge partenerul (posibil să aibă facturi emise)." });
    }
};