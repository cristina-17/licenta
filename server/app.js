require('dotenv').config();

const express = require('express');
const cors = require('cors');

const db = require('./config/db');
const { pornireScheduler } = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// rute
app.get('/', (req, res) => {
    res.send('Serverul este activ');
});

// rute pt firme
const firmaRoutes = require('./routes/firmaRoutes');
app.use('/api/firme', firmaRoutes);

// rute pt utilizatori
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

// rute pt parteneri
const partenerRoutes = require('./routes/partenerRoutes');
app.use('/api/parteneri', partenerRoutes);

// rute pt marfuri
const marfaRoutes = require('./routes/marfaRoutes.js');
app.use('/api/marfuri', marfaRoutes);

// rute pt obiecte de inventar
const obiectInventarRoutes = require('./routes/obiectInventarRoutes');
app.use('/api/obiecte-inventar', obiectInventarRoutes);

// rute pt facturi
const facturaRoutes = require('./routes/facturaRoutes');
app.use('/api/facturi', facturaRoutes);

// rute pt mijloace fixe
const mijlocFixRoutes = require('./routes/mijlocFixRoutes');
app.use('/api/mijloace-fixe', mijlocFixRoutes);

// rute pt plati
const plataRoutes = require('./routes/plataRoutes');
app.use('/api/plati', plataRoutes);

// rute pt note contabile
app.use('/api/note-contabile', require('./routes/notaContabilaRoutes'));

// pornire
app.listen(PORT, () => {
    console.log(`Serverul a pornit pe http://localhost:${PORT}`);
    pornireScheduler();
});