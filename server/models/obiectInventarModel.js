const db = require('../config/db');

const ObiectInventar = {
    // get toate obiectele de invetar
    getAll: async (filtre = {}, sort = {}, page = 1, limit = 10) => {
        try {
            const offset = (page - 1) * limit;
            let query = 'SELECT * FROM OBIECTE_INVENTAR WHERE 1=1';
            let params = [];

	    // filtre
            if (filtre.cautare) {
                query += ' AND denumire LIKE ?';
                params.push(`%${filtre.cautare}%`);
            }
            if (filtre.cota_tva) {
                query += ' AND cota_tva = ?';
                params.push(filtre.cota_tva);
            }

	    // sortare
            if (sort.stoc) {
                query += ` ORDER BY stoc_curent ${sort.stoc === 'asc' ? 'ASC' : 'DESC'}`;
            } else {
                query += ' ORDER BY denumire ASC';
            }

	    //paginare
            const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
            const [totalRows] = await db.query(countQuery, params);

            query += ' LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const [rows] = await db.query(query, params);

            return { data: rows, total: totalRows[0].total };
        } catch (err) { throw err; }
    },

    // get obiect de inventar by id
    getById: async (id) => {
        const [rows] = await db.query('SELECT * FROM OBIECTE_INVENTAR WHERE id = ?', [id]);
        return rows[0];
    },


    // adaugare obiect inventar
    create: async (data) => {
        const [res] = await db.query(
            'INSERT INTO OBIECTE_INVENTAR (denumire, um, cota_tva) VALUES (?, ?, ?)',
            [data.denumire, data.um, data.cota_tva || '21']
        );
        return res.insertId;
    },


    // editare obiect inventar
    update: async (id, data) => {
        let fields = [];
        let params = [];

        if (data.denumire) { fields.push('denumire = ?'); params.push(data.denumire); }
        if (data.um) { fields.push('um = ?'); params.push(data.um); }
        if (data.cota_tva) { fields.push('cota_tva = ?'); params.push(data.cota_tva); }

        if (fields.length === 0) return 0;

        params.push(id);
        const query = `UPDATE OBIECTE_INVENTAR SET ${fields.join(', ')} WHERE id = ?`;

        const [res] = await db.query(query, params);
        return res.affectedRows;
    },

    // stergere obiect inventar

    delete: async (id) => {
        const [res] = await db.query('DELETE FROM OBIECTE_INVENTAR WHERE id = ?', [id]);
        return res.affectedRows;
    },

    // pt actualizare stoc in functie de facturi
    getMiscari: async (id) => {
        const query = `
            SELECT F.tip, F.data_emitere as data, P.nume as partener, OIF.cantitate
            FROM OBIECTE_INVENTAR_FACTURA OIF
            JOIN FACTURI F ON OIF.id_factura = F.id
            JOIN PARTENERI P ON F.id_partener = P.id
            WHERE OIF.id_obiect_inventar = ?
            ORDER BY F.data_emitere DESC
        `;
        const [rows] = await db.query(query, [id]);
        return rows;
    }
};

module.exports = ObiectInventar;