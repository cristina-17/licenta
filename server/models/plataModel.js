const db = require('../config/db');

const Plata = {
    // get toate platile/incasarile
    getAll: async (filtre, sortare, page = 1, limit = 10) => {
        let query = `
            SELECT P.*, F.numar as nr_factura, PT.nume as partener_nume
            FROM PLATI_INCASARI P
            JOIN FACTURI F ON P.id_factura = F.id
            JOIN PARTENERI PT ON F.id_partener = PT.id
            WHERE 1=1
        `;
        const params = [];

        // cautare (dupa id/nr factura)
        if (filtre.cautare) {
            query += ` AND (P.id = ? OR F.numar LIKE ?)`;
            params.push(filtre.cautare, `%${filtre.cautare}%`);
        }

        // filtre
        if (filtre.tip) {
            query += ` AND P.tip = ?`;
            params.push(filtre.tip);
        }

        if (filtre.metoda_plata) {
            query += ` AND P.metoda_plata = ?`;
            params.push(filtre.metoda_plata);
        }

        if (filtre.data_start) {
                query += ` AND DATE(P.data) >= ?`;
                params.push(filtre.data_start);
            }
            if (filtre.data_final) {
                query += ` AND DATE(P.data) <= ?`;
                params.push(filtre.data_final);
            }

            let orderBy = '';
            if (sortare.field === 'suma') {
                orderBy = `ORDER BY P.suma ${sortare.order === 'asc' ? 'ASC' : 'DESC'}`;
            } else {
                orderBy = `ORDER BY P.data ${sortare.order === 'asc' ? 'ASC' : 'DESC'}`;
            }

            query += ` ${orderBy}`;

            const offset = (page - 1) * limit;
            query += ` LIMIT ? OFFSET ?`;
            params.push(limit, offset);

            const [rows] = await db.query(query, params);

            let countQuery = `
                SELECT COUNT(*) as total
                FROM PLATI_INCASARI P
                JOIN FACTURI F ON P.id_factura = F.id
                WHERE 1=1
            `;
            const countParams = [];
            if (filtre.cautare) {
                countQuery += ` AND (P.id = ? OR F.numar LIKE ?)`;
                countParams.push(filtre.cautare, `%${filtre.cautare}%`);
            }
            if (filtre.tip) {
                countQuery += ` AND P.tip = ?`;
                countParams.push(filtre.tip);
            }
            if (filtre.metoda_plata) {
                countQuery += ` AND P.metoda_plata = ?`;
                countParams.push(filtre.metoda_plata);
            }
            if (filtre.data_start) {
                countQuery += ` AND DATE(P.data) >= ?`;
                countParams.push(filtre.data_start);
            }
            if (filtre.data_final) {
                countQuery += ` AND DATE(P.data) <= ?`;
                countParams.push(filtre.data_final);
            }

            const [countRes] = await db.query(countQuery, countParams);
            return { data: rows, total: countRes[0].total };
        },

    // creare plata noua
    create: async (data) => {
        const [res] = await db.query(
            `INSERT INTO PLATI_INCASARI (id_factura, tip, metoda_plata, suma)
             VALUES (?, ?, ?, ?)`,
            [data.id_factura, data.tip || 'plată', data.metoda_plata, data.suma]
        );
        return res.insertId;
    },

    // calculare plati cash totale pe zi
    getTotalPlatiCashZi: async (tip) => {
        const [rows] = await db.query(
            `SELECT COALESCE(SUM(suma), 0) as total_zi
            FROM PLATI_INCASARI
            WHERE metoda_plata = 'cash'
            AND tip = ?
            AND DATE(data) = CURDATE()`,
            [tip]
        );
        return parseFloat(rows[0].total_zi);
    },

    // calculare tranzactii (plati si incasari) cash de la un partener pe zi
    getTotalTranzactiiCashZiPartener: async (tip, id_partener) => {
        const [rows] = await db.query(
            `SELECT COALESCE(SUM(PI.suma), 0) as total_zi
            FROM PLATI_INCASARI PI
            JOIN FACTURI F ON PI.id_factura = F.id
            WHERE PI.metoda_plata = 'cash'
            AND PI.tip = ?
            AND F.id_partener = ?
            AND DATE(PI.data) = CURDATE()`,
            [tip, id_partener]
        );
        return parseFloat(rows[0].total_zi);
    },

    // get toate facturile pt care se poate efectua plata (au statusul primita)
    getFacturiDePlata: async (cautare, status = 'primită') => {
        let query = `
            SELECT F.id, F.numar, F.total_brut, F.status, P.nume as partener_nume, P.id as id_partener
            FROM FACTURI F
            JOIN PARTENERI P ON F.id_partener = P.id
            WHERE F.status = ?
        `;
        const params = [status];
        if (cautare) {
            query += ` AND (F.numar LIKE ? OR P.nume LIKE ?)`;
            params.push(`%${cautare}%`, `%${cautare}%`);
        }
        const [rows] = await db.query(query, params);
        return rows;
    },

    // schimbarea statusului in platita/incasata dupa finalizarea platii cu stripe
    updateFacturaStatus: async (id_factura, status) => {
        const [res] = await db.query('UPDATE FACTURI SET status = ? WHERE id = ?', [status, id_factura]);
        return res.affectedRows;
    }
};

module.exports = Plata;