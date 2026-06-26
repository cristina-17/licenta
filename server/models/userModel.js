const db = require('../config/db');

// login (dupa email/nume_utilizator)
const findByIdentity = async (identity) => {
    try {
        const query = 'SELECT * FROM UTILIZATORI WHERE email = ? OR nume_utilizator = ?';
        const [rows] = await db.query(query, [identity, identity]);
        return rows[0];
    } catch (error) {
        throw error;
    }
};

// register
const create = async (user) => {
    try {
        const query = `
            INSERT INTO UTILIZATORI (nume_utilizator, nume, prenume, parola, email, rol)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.query(query, [
            user.nume_utilizator,
            user.nume,
            user.prenume,
            user.parola,
            user.email,
            user.rol //preia rolul din userController
        ]);
        return result.insertId;
    } catch (error) {
        throw error;
    }
};

// export
module.exports = { findByIdentity, create };