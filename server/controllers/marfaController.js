const Marfa = require('../models/marfaModel');

// afisare marfuri
exports.getMarfuri = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const filtre = {
            cautare: req.query.cautare,
            categorie: req.query.categorie,
            um: req.query.um,
            cota_tva: req.query.cota_tva,
            profitabilitate: req.query.profitabilitate
        };
        const sort = { stoc: req.query.sort_stoc };

        const result = await Marfa.getAll(filtre, sort, page, limit);

        res.json({
            data: result.data,
            total: result.total,
            page,
            totalPages: Math.ceil(result.total / limit)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Eroare server la preluarea mărfurilor' });
    }
};

// gasire marfa dupa id
exports.getMarfaById = async (req, res) => {
    try {
        const id = req.params.id;
        const marfa = await Marfa.getById(id);
        if(!marfa) return res.status(404).json({message: "Marfa nu există"});

        const miscari = await Marfa.getMiscari(id);
        res.json({ ...marfa, miscari: miscari || [] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Eroare la preluarea datelor.' });
    }
};

// adaugare marfa
exports.addMarfa = async (req, res) => {
    try {
        const userRole = req.user.rol;
        const data = req.body;

        // userul nu poate alege cota de tva, default 21
        if (userRole !== 'admin') {
            data.cota_tva = '21';
        }

        const id = await Marfa.create(data);
        res.status(201).json({ message: 'Marfă adăugată cu succes', id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Eroare la adăugarea mărfii' });
    }
};

// editare marfa
exports.updateMarfa = async (req, res) => {
    try {
        const userRole = req.user.rol;
        const data = req.body;

        // userul nu poate alege cota de tva
        if (userRole !== 'admin') {
            delete data.cota_tva;
        }

        // userul si adminul nu pot edita stocul curent sau cmp
        delete data.stoc_curent;
        delete data.cmp;

        await Marfa.update(req.params.id, data);
        res.json({ message: 'Marfă actualizată cu succes' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Eroare la actualizare' });
    }
};

// stergere marfa (doar admin)
exports.deleteMarfa = async (req, res) => {
    try {
        await Marfa.delete(req.params.id);
        res.json({ message: 'Marfă ștearsă' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Nu se poate șterge (posibil să fie folosită în facturi sau istoric).' });
    }
};

// gasire pret in istoric preturi
exports.getPretIstoric = async (req, res) => {
    try {
        const pret = await Marfa.getPretLaData(req.params.id, req.query.data);
        res.json({ pret });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Eroare la căutarea istoricului' });
    }
};

// verificare profitabilitate (cmp trebuie sa fie < decat pretul de vanzare)
exports.verificareCmpProfitabilitate = async (req, res) => {
    try {
        const rows = await Marfa.getMarfuriInPierdere();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: "Eroare la verificarea CMP." });
    }
};