const ObiectInventar = require('../models/obiectInventarModel');

// afisare obiecte inventar
exports.getObiecte = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const filtre = {
            cautare: req.query.cautare,
            cota_tva: req.query.cota_tva
        };
        const sort = { stoc: req.query.sort_stoc };

        const result = await ObiectInventar.getAll(filtre, sort, page, limit);

        res.json({
            data: result.data,
            total: result.total,
            page,
            totalPages: Math.ceil(result.total / limit)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Eroare la preluarea obiectelor de inventar' });
    }
};

// gasire obiect inventar by id
exports.getObiectById = async (req, res) => {
    try {
        const obiect = await ObiectInventar.getById(req.params.id);
        if(!obiect) return res.status(404).json({message: "Obiectul nu există"});

        const miscari = await ObiectInventar.getMiscari(req.params.id);

        res.json({ ...obiect, miscari });
    } catch (err) {
        res.status(500).json({ message: 'Eroare server' });
    }
};


// adaugare obiect inventar
exports.addObiect = async (req, res) => {
    try {
        const data = req.body;
	// cota_tva disponibil doar pt admin, pt user implicit 21
        if (req.user.rol !== 'admin') {
            data.cota_tva = '21';
        }

        const id = await ObiectInventar.create(data);
        res.status(201).json({ message: 'Obiect adăugat cu succes', id });
    } catch (err) {
        res.status(500).json({ message: 'Eroare la adăugare' });
    }
};

// editare obiect inventar
exports.updateObiect = async (req, res) => {
    try {
        const data = req.body;
	// cota_tva disponibil doar pt admin
        if (req.user.rol !== 'admin') {
            delete data.cota_tva;
        }
	//stocul curent nu poate fi editat
        delete data.stoc_curent;

        await ObiectInventar.update(req.params.id, data);
        res.json({ message: 'Obiect actualizat' });
    } catch (err) {
        res.status(500).json({ message: 'Eroare la actualizare' });
    }
};

// stergere obiect inventar (doar pt admin)
exports.deleteObiect = async (req, res) => {
    try {
        await ObiectInventar.delete(req.params.id);
        res.json({ message: 'Obiect șters' });
    } catch (err) {
        res.status(500).json({ message: 'Nu se poate șterge (utilizat în facturi).' });
    }
};