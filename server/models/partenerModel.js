const db = require('../config/db');

const Partener = {
    // get parteneri
    getAll: async (filtre = {}, page = 1, limit = 10) => {
        try {
            const offset = (page - 1) * limit;
            let queryConditions = ' WHERE 1=1';
            let params = [];

            // cautare dupa nume/cui
            if (filtre.cautare) {
                queryConditions += ' AND (nume LIKE ? OR cui LIKE ?)';
                params.push(`%${filtre.cautare}%`, `%${filtre.cautare}%`);
            }

            // filtrare dupa tip
            if (filtre.tip) {
                if (filtre.tip === 'client') {
                    queryConditions += " AND (tip_partener = 'client' OR tip_partener = 'ambele')";
                } else if (filtre.tip === 'furnizor') {
                    queryConditions += " AND (tip_partener = 'furnizor' OR tip_partener = 'ambele')";
                } else if (filtre.tip === 'ambele') {
                    queryConditions += " AND tip_partener = 'ambele'";
                }
            }

            // paginare
            const dataQuery = `SELECT * FROM PARTENERI ${queryConditions} ORDER BY nume ASC LIMIT ? OFFSET ?`;
            const dataParams = [...params, parseInt(limit), parseInt(offset)];

            const [rows] = await db.query(dataQuery, dataParams);

            const countQuery = `SELECT COUNT(*) as total FROM PARTENERI ${queryConditions}`;
            const [countResult] = await db.query(countQuery, params);

            return {
                data: rows,
                total: countResult[0].total
            };

        } catch (error) {
            throw error;
        }
    },

    getById: async (id) => {
        try {
            const [rows] = await db.query('SELECT * FROM PARTENERI WHERE id = ?', [id]);
            return rows[0] || null;
        } catch (error) {
            throw error;
        }
    },

    // adaugare partener nou
    create: async (data) => {
        try {
            const query = `
                INSERT INTO PARTENERI (nume, cui, nr_reg_comert, adresa, tip_partener, iban, banca, email, telefon)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const [result] = await db.query(query, [
                data.nume, data.cui, data.nr_reg_comert, data.adresa,
                data.tip_partener, data.iban, data.banca, data.email, data.telefon
            ]);
            return result.insertId;
        } catch (error) {
            throw error;
        }
    },

    // editare partener existent
    update: async (id, data) => {
        try {
            const query = `
                UPDATE PARTENERI
                SET nume = ?, cui = ?, nr_reg_comert = ?, adresa = ?, tip_partener = ?, iban = ?, banca = ?, email = ?, telefon = ?
                WHERE id = ?
            `;
            const [result] = await db.query(query, [
                data.nume, data.cui, data.nr_reg_comert, data.adresa,
                data.tip_partener, data.iban, data.banca, data.email, data.telefon, id
            ]);
            return result.affectedRows;
        } catch (error) {
            throw error;
        }
    },

    // stergere partener existent
    delete: async (id) => {
        try {
            const [result] = await db.query('DELETE FROM PARTENERI WHERE id = ?', [id]);
            return result.affectedRows;
        } catch (error) {
            throw error;
        }
    }
};

module.exports = Partener;