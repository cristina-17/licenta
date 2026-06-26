const db = require('../config/db');

const Firma = {
    // preia singura firma din sistem
    getFirma: async () => {
        try {
            const query = 'SELECT * FROM FIRME LIMIT 1';
            const [rows] = await db.query(query);
            return rows[0];
        } catch (error) {
            throw error;
        }
    },

    // actualizeaza datele firmei
    update: async (id, data) => {
        try {
            const query = `
                UPDATE FIRME
                SET nume = ?, adresa = ?, iban = ?, banca = ?, email = ?, telefon = ?
                WHERE id = ?
            `;
            const [result] = await db.query(query, [
                data.nume, data.adresa, data.iban, data.banca, data.email, data.telefon, id
            ]);
            return result.affectedRows;
        } catch (error) {
            throw error;
        }
    }
};

module.exports = Firma;