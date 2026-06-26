const db = require('../config/db');

const NotaContabila = {

    // get toate nc
    getAll: async (filters) => {
        let query = "SELECT * FROM NOTE_CONTABILE WHERE 1=1";
        const params = [];

        if (filters.numar) {
            query += " AND numar LIKE ?";
            params.push(`%${filters.numar}%`);
        }
        if (filters.data_start) {
            query += " AND data_intocmire >= ?";
            params.push(filters.data_start);
        }
        if (filters.data_sfarsit) {
            query += " AND data_intocmire <= ?";
            params.push(filters.data_sfarsit);
        }

        query += " ORDER BY data_intocmire DESC, id DESC";
        const [rows] = await db.query(query, params);
        return rows;
    },

    // get by id
    getById: async (id) => {
        const [nota] = await db.query("SELECT * FROM NOTE_CONTABILE WHERE id = ?", [id]);
        if (nota.length === 0) return null;

        const [operatii] = await db.query(
            "SELECT * FROM OPERATII_NOTA_CONTABILA WHERE id_nota_contabila = ?",
            [id]
        );

        return { ...nota[0], operatii };
    },

    // finalizare nc
    finalizeaza: async (id) => {
        const query = "UPDATE NOTE_CONTABILE SET status = 'finalizată' WHERE id = ?";
        const [res] = await db.query(query, [id]);
        return res.affectedRows;
    }
};

module.exports = NotaContabila;