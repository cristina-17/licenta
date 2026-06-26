const db = require('../config/db');

const MijlocFix = {
    // get toate mijloacele fixe (cu filtrare, sortare si paginare)
    getAll: async (filtre, sortare, page = 1, limit = 10) => {
        // actualizarea amortizarilor inainte de a afisa
        await db.query('CALL genereaza_amortizari_lunare()');

        let query = `
            SELECT id, denumire, nr_inventar, valoare_intrare, valoare_actuala,
                   durata_viata_luni, status, tip_amortizare, data_intrare
            FROM MIJLOACE_FIXE WHERE 1=1
        `;
        const params = [];

        // cautare dupa denumire sau nr inventar
        if (filtre.cautare) {
            query += ` AND (denumire LIKE ? OR nr_inventar LIKE ?)`;
            params.push(`%${filtre.cautare}%`, `%${filtre.cautare}%`);
        }

        // filtre
        if (filtre.status) {
            query += ` AND status = ?`;
            params.push(filtre.status);
        }
        if (filtre.tip_amortizare) {
            query += ` AND tip_amortizare = ?`;
            params.push(filtre.tip_amortizare);
        }

        // sortare dupa status (active, casate), tip amortizare (liniara, accelerata) si optional dupa valoare
        let orderBy = `ORDER BY FIELD(status, 'activ', 'inactiv', 'casat'),
                                FIELD(tip_amortizare, 'liniară', 'accelerată')`;

        if (sortare.field) {
            orderBy += `, ${sortare.field} ${sortare.order === 'desc' ? 'DESC' : 'ASC'}`;
        }

        query += ` ${orderBy}`;

        // paginare
        const offset = (page - 1) * limit;
        query += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [rows] = await db.query(query, params);

        let countQuery = `SELECT COUNT(*) as total FROM MIJLOACE_FIXE WHERE 1=1`;
        const countParams = [];

        if (filtre.cautare) {
            countQuery += ` AND (denumire LIKE ? OR nr_inventar LIKE ?)`;
            countParams.push(`%${filtre.cautare}%`, `%${filtre.cautare}%`);
        }
        if (filtre.status) {
            countQuery += ` AND status = ?`;
            countParams.push(filtre.status);
        }
        if (filtre.tip_amortizare) {
            countQuery += ` AND tip_amortizare = ?`;
            countParams.push(filtre.tip_amortizare);
        }

        const [countRes] = await db.query(countQuery, countParams);

        return { data: rows, total: countRes[0].total };
    },

    // get mijloc fix (pt editare, detalii)
    getById: async (id) => {
        // actualizare amortizarile
        await db.query('CALL genereaza_amortizari_lunare()');

        const [rows] = await db.query('SELECT * FROM MIJLOACE_FIXE WHERE id = ?', [id]);
        if (!rows[0]) return null;

        // istoric amortizari
        const [amortizari] = await db.query(
            'SELECT * FROM AMORTIZARI WHERE id_mijloc_fix = ? ORDER BY luna_an DESC',
            [id]
        );

        return { ...rows[0], amortizari };
    },

    // get mijloacele fixe neinregistrate (din facturile primite) din tabelul mijloace_fixe_factura
    getNeregistrateDinFacturi: async () => {
        const query = `
            SELECT MFF.id as id_item_factura, MFF.denumire, MFF.total_net as valoare_intrare, F.numar as numar_factura, F.data_emitere
            FROM MIJLOACE_FIXE_FACTURA MFF
            JOIN FACTURI F ON MFF.id_factura = F.id
            WHERE MFF.id_mijloc_fix IS NULL
        `;
        const [rows] = await db.query(query);
        return rows;
    },

    // adaugare mijloc fix
    create: async (data) => {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            let id_factura = null;
            if (data.id_factura_item) {
                const [factRow] = await conn.query('SELECT id_factura FROM MIJLOACE_FIXE_FACTURA WHERE id = ?', [data.id_factura_item]);
                if (factRow.length > 0) id_factura = factRow[0].id_factura;
            }

            const [res] = await conn.query(
                `INSERT INTO MIJLOACE_FIXE
                (id_factura, denumire, nr_inventar, data_intrare, data_sfarsit, valoare_intrare, tip_amortizare, val_amort_acc, cont_contabil)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    id_factura, data.denumire, data.nr_inventar, data.data_intrare,
                    data.data_sfarsit, data.valoare_intrare, data.tip_amortizare || 'liniară',
                    data.val_amort_acc || 0, data.cont_contabil
                ]
            );
            const newId = res.insertId;

            if (data.id_factura_item) {
                await conn.query('UPDATE MIJLOACE_FIXE_FACTURA SET id_mijloc_fix = ? WHERE id = ?', [newId, data.id_factura_item]);
            }

            await conn.commit();
            return newId;
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    },

    // editare mijloc fix
    update: async (id, data) => {
        if (!data.denumire) return 0;
        const [res] = await db.query(
            'UPDATE MIJLOACE_FIXE SET denumire = ? WHERE id = ?',
            [data.denumire, id]
        );
        return res.affectedRows;
    },


    // casarea unui mijloc fix
    casare: async (id) => {
        const query = `
            UPDATE MIJLOACE_FIXE
            SET status = 'casat',
                data_casare = CURRENT_DATE
            WHERE id = ?
        `;
        const [res] = await db.query(query, [id]);
        return res.affectedRows;
    },

    // get toate amortizarile (de la toate mijlocele fixe)
    getAllAmortizari: async (filtre, page = 1, limit = 20) => {
        let query = `
            SELECT A.*, M.denumire, M.nr_inventar
            FROM AMORTIZARI A
            JOIN MIJLOACE_FIXE M ON A.id_mijloc_fix = M.id
            WHERE 1=1
        `;
        const params = [];

        if (filtre.cautare) {
            query += ` AND (M.denumire LIKE ? OR M.nr_inventar LIKE ?)`;
            params.push(`%${filtre.cautare}%`, `%${filtre.cautare}%`);
        }

        // filtru alegere perioada
        if (filtre.data_start && filtre.data_final) {
            query += ` AND A.luna_an BETWEEN ? AND ?`;
            params.push(filtre.data_start, filtre.data_final);
        }

        query += ` ORDER BY A.luna_an DESC`;

        const offset = (page - 1) * limit;
        query += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [rows] = await db.query(query, params);

        let countQuery = `
            SELECT COUNT(*) as total
            FROM AMORTIZARI A
            JOIN MIJLOACE_FIXE M ON A.id_mijloc_fix = M.id
            WHERE 1=1
        `;

        if (filtre.cautare) {
            countQuery += ` AND (M.denumire LIKE ? OR M.nr_inventar LIKE ?)`;
        }
        if (filtre.data_start && filtre.data_final) {
            countQuery += ` AND A.luna_an BETWEEN ? AND ?`;
        }

        const [countRes] = await db.query(countQuery, params.slice(0, params.length - 2));

        return { data: rows, total: countRes[0].total };
    }
};

module.exports = MijlocFix;