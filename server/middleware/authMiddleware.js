const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // token-ul (eliminand cuvantul "Bearer " trimis de frontend)
            token = req.headers.authorization.split(' ')[1]; // se ia in considerare doar ce se afla dupa cuvantul "Bearer "

            // verificare semnatura folosind cheia din .env
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // punem datele utilizatorului in request
            req.user = decoded;
            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Token invalid.' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Nu ești logat.' });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user && req.user.rol === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Accesul nu este permis. Sunt necesare drepturi de Administrator.' });
    }
};

module.exports = { protect, adminOnly };