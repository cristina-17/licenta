const NotaContabila = require('../models/notaContabilaModel');

exports.getNotaContabila = async (req, res) => {
    try {
        const note = await NotaContabila.getAll(req.query);
        res.json(note);
    } catch (error) {
        res.status(500).json({ message: "Eroare la preluarea notelor contabile", error });
    }
};

exports.getDetaliiNota = async (req, res) => {
    try {
        const nota = await NotaContabila.getById(req.params.id);
        if (!nota) return res.status(404).json({ message: "Nota nu a fost găsită" });
        res.json(nota);
    } catch (error) {
        res.status(500).json({ message: "Eroare la preluarea notelor contabile", error });
    }
};

exports.finalizeazaNota = async (req, res) => {
    try {
        const rows = await NotaContabila.finalizeaza(req.params.id);
        if (rows === 0) return res.status(404).json({ message: "Nota nu a fost găsită sau este deja finalizată" });
        res.json({ message: "Nota contabilă a fost finalizată cu succes!" });
    } catch (error) {
        res.status(500).json({ message: "Eroare la finalizare", error });
    }
};