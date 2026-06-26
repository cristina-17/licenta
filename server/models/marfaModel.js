const db = require('../config/db');
const Marfa = {
    // get toate marfurile
    getAll: async (filtre = {}, sort = {}, page = 1, limit = 10) => {
        try {
            const offset = (page - 1) * limit;
            let query = 'SELECT * FROM MARFURI WHERE 1=1';
            let params = [];

            // filtre
            if (filtre.cautare) {
                query += ' AND denumire LIKE ?';
                params.push(`%${filtre.cautare}%`);
            }
            if (filtre.categorie) {
                query += ' AND categorie LIKE ?';
                params.push(`%${filtre.categorie}%`);
            }
            if (filtre.um) {
                query += ' AND um = ?';
                params.push(filtre.um);
            }
            if (filtre.cota_tva) {
                query += ' AND cota_tva = ?';
                params.push(filtre.cota_tva);
            }

            if (filtre.profitabilitate === 'pierdere') {
                query += ' AND pret_curent < cmp';
            }

            // sortare (daca utilizatorul cere dupa stoc, altfel dupa denumire)
            if (sort.stoc) {
                query += ` ORDER BY stoc_curent ${sort.stoc === 'asc' ? 'ASC' : 'DESC'}`;
            } else {
                query += ' ORDER BY denumire ASC';
            }

            // paginare
            query += ` LIMIT ? OFFSET ?`;
            params.push(limit, offset);

            const [rows] = await db.query(query, params);

            let countQuery = 'SELECT COUNT(*) as total FROM MARFURI WHERE 1=1';
            let countParams = [];

            if (filtre.cautare) {
                countQuery += ' AND denumire LIKE ?';
                countParams.push(`%${filtre.cautare}%`);
            }
            if (filtre.categorie) {
                countQuery += ' AND categorie LIKE ?';
                countParams.push(`%${filtre.categorie}%`);
            }
            if (filtre.cota_tva) {
                countQuery += ' AND cota_tva = ?';
                countParams.push(filtre.cota_tva);
            }

            if (filtre.um) {
                countQuery += ' AND um = ?';
                countParams.push(filtre.um);
            }

            if (filtre.profitabilitate === 'pierdere') {
                countQuery += ' AND pret_curent < cmp';
            }

            const [countRes] = await db.query(countQuery, countParams);

            return {
                data: rows,
                total: countRes[0].total
            };
        } catch (error) {
            throw error;
        }
    },

    // get marfa dupa id
    getById: async (id) => {
        const [rows] = await db.query('SELECT * FROM MARFURI WHERE id = ?', [id]);
        return rows[0];
    },

    // adaugare marfa
    create: async (data) => {
        const [res] = await db.query(
            'INSERT INTO MARFURI (denumire, categorie, um, cota_tva, pret_curent) VALUES (?, ?, ?, ?, ?)',
            [data.denumire, data.categorie, data.um, data.cota_tva || '21', data.pret_curent || 0]
        );
        return res.insertId;
    },

    // editare marfa
    update: async (id, data) => {
        let fields = [];
        let params = [];

        if (data.denumire) { fields.push('denumire = ?'); params.push(data.denumire); }
        if (data.categorie) { fields.push('categorie = ?'); params.push(data.categorie); }
        if (data.um) { fields.push('um = ?'); params.push(data.um); }
        if (data.cota_tva) { fields.push('cota_tva = ?'); params.push(data.cota_tva); }
        if (data.pret_curent !== undefined) { fields.push('pret_curent = ?'); params.push(data.pret_curent); }

        if (fields.length === 0) return 0; // daca nu exista nimic de actualizat

        params.push(id);
        const query = `UPDATE MARFURI SET ${fields.join(', ')} WHERE id = ?`;

        const [res] = await db.query(query, params);
        return res.affectedRows;
    },

    //stergere marfa
    delete: async (id) => {
        const [res] = await db.query('DELETE FROM MARFURI WHERE id = ?', [id]);
        return res.affectedRows;
    },

    // cautare pret la o anumita data (in tabelul istoric_preturi_vanzare)
    getPretLaData: async (id, dataCautata) => {
        const query = `
            SELECT pret_unitar_vanzare
            FROM ISTORIC_PRETURI_VANZARE
            WHERE id_marfa = ?
              AND data_start <= ?
              AND (data_sfarsit IS NULL OR data_sfarsit >= ?)
            ORDER BY data_start DESC
            LIMIT 1
        `;
        const [rows] = await db.query(query, [id, dataCautata, dataCautata]);

        // daca nu s-a gasit data in istoric (de exemplu pt o data veche, neinregistrata) afisam pretul curent
        if (!rows[0]) {
             const [curr] = await db.query('SELECT pret_curent FROM MARFURI WHERE id = ?', [id]);
             return curr[0]?.pret_curent || 0;
        }
        return rows[0].pret_unitar_vanzare;
    },

    // pt actualizare stoc in functie de facturi
    getMiscari: async (id) => {
        try {
            const query = `
                SELECT
                    CASE
                        WHEN f.tip = 'primită' THEN 'achiziție'
                        WHEN f.tip = 'emisă' THEN 'vânzare'
                    END AS tip,
                    f.data_emitere AS data,
                    p.nume AS partener,
                    pf.cantitate,
                    pf.pret_unitar_cumparare
                FROM PRODUSE_FACTURA pf
                JOIN FACTURI f ON pf.id_factura = f.id
                JOIN PARTENERI p ON f.id_partener = p.id
                WHERE pf.id_marfa = ?
                ORDER BY f.data_emitere DESC
            `;
            const [rows] = await db.query(query, [id]);
            return rows;
        } catch (error) {
            console.error("Eroare SQL în getMiscari:", error);
            throw error;
        }
    },

    // pt gasirea marfurilor care au cmp > decat pretul de vanzare
    getMarfuriInPierdere: async () => {
        const [rows] = await db.query(
            "SELECT id, denumire, pret_curent, cmp FROM MARFURI WHERE pret_curent <= cmp AND stoc_curent > 0"
        );
        return rows;
    }
};

module.exports = Marfa;