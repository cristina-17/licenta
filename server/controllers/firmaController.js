const Firma = require('../models/firmaModel');

exports.getFirmaDetails = async (req, res) => {
    try {
        const firma = await Firma.getFirma();
        if (!firma) return res.status(404).json({ message: "Nu a fost configurată nicio firmă." });
        res.json(firma);
    } catch (error) {
        res.status(500).json({ message: "Eroare la preluarea datelor firmei." });
    }
};

exports.updateFirma = async (req, res) => {
    try {
        // doar adminul poate modifica datele firmei
        const { id } = req.params;
        await Firma.update(id, req.body);
        res.json({ message: "Datele firmei au fost actualizate cu succes!" });
    } catch (error) {
        res.status(500).json({ message: "Eroare la actualizarea firmei." });
    }
};