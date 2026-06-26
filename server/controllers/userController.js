const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// register
exports.register = async (req, res) => {
    try {
        const { nume_utilizator, nume, prenume, parola, email } = req.body;

        // criptare parola
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(parola, salt);

        // salvare utilizator
        await User.create({
            nume_utilizator,
            nume,
            prenume,
            parola: hashedPassword,
            email,
            rol: 'user'
        });

        res.status(201).json({ message: 'Cont creat cu succes!' });

    } catch (error) {
        console.error("Eroare register:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Nume utilizator sau Email deja existent!' });
        }
        res.status(500).json({ message: 'Eroare server.' });
    }
};

// login
exports.login = async (req, res) => {
    try {
        const { identifier, parola } = req.body;

        // cautare utilizator
        const user = await User.findByIdentity(identifier);
        if (!user) {
            return res.status(404).json({ message: 'Utilizator inexistent!' });
        }

        // verificare parola
        const isMatch = await bcrypt.compare(parola, user.parola);
        if (!isMatch) {
            return res.status(401).json({ message: 'Parolă incorectă!' });
        }

        // generare token (folosing cheia din .env)
        const token = jwt.sign(
            {
                id: user.id,
                id_firma: user.id_firma,
                email: user.email,
                user: user.nume_utilizator,
                rol: user.rol,
                nume: user.nume
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            message: 'Autentificare reușită!',
            token,
            user: {
                id: user.id,
                nume: user.nume,
                email: user.email,
                user: user.nume_utilizator,
                rol: user.rol,
                id_firma: user.id_firma
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Eroare la login' });
    }
};