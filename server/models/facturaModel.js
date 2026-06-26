const db = require('../config/db');

const Factura = {
    // creare factura
    create: async (facturaData, produse, id_utilizator) => {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            const [resFactura] = await conn.query(
                `INSERT INTO FACTURI (numar, data_emitere, data_scadenta, tip, tip_produse, status, id_partener, id_utilizator)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    facturaData.numar,
                    facturaData.data_emitere,
                    facturaData.data_scadenta,
                    facturaData.tip,
                    facturaData.tip_produse || 'marfă',
                    facturaData.status || facturaData.tip,
                    facturaData.id_partener,
                    id_utilizator
                ]
            );
            const facturaId = resFactura.insertId;

            // inserare produse factura
            for (let prod of produse) {
                if (facturaData.tip_produse === 'marfă') {
                    const pretCumparare = facturaData.tip === 'primită' ? prod.pret_unitar : 0; // preia valoarea din campul pret_unitar din formular doar daca tipul facturii e primita
                    await conn.query(
                        `INSERT INTO PRODUSE_FACTURA (id_factura, id_marfa, cantitate, pret_unitar_cumparare, total_net, suma_tva, total_brut)
                        VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [facturaId, prod.id_ref, prod.cantitate, pretCumparare, prod.net, prod.valTva, prod.brut]
                    );
                } else if (facturaData.tip_produse === 'obiecte inventar') {
                    await conn.query(
                        `INSERT INTO OBIECTE_INVENTAR_FACTURA (id_factura, id_obiect_inventar, cantitate, total_net, suma_tva, total_brut)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [facturaId, prod.id_ref, prod.cantitate, prod.net, prod.valTva, prod.brut]
                    );
                } else if (facturaData.tip_produse === 'mijloc fix') {
                    await conn.query(
                        `INSERT INTO MIJLOACE_FIXE_FACTURA (id_factura, denumire, total_net, cota_tva)
                         VALUES (?, ?, ?, ?)`,
                        [facturaId, prod.denumire, prod.net, prod.cota_tva]
                    );
                } else if (facturaData.tip_produse === 'servicii') {
                    await conn.query(
                        `INSERT INTO SERVICII_FACTURA (id_factura, denumire, total_net, cota_tva, cont_contabil)
                         VALUES (?, ?, ?, ?, ?)`,
                        [facturaId, prod.denumire, prod.net, prod.cota_tva, prod.cont_contabil]
                    );
                }
            }

            await conn.commit();
            return facturaId;

        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    },

    // afisare toate facturile
    getAll: async (filtre = {}, sort = {}, page = 1, limit = 10) => {
        try {
            const offset = (page - 1) * limit;
            let whereClause = ' WHERE 1=1';
            const params = [];

            // filtre
            if (filtre.cautare) {
                whereClause += ' AND (F.numar LIKE ? OR P.nume LIKE ?)';
                params.push(`%${filtre.cautare}%`, `%${filtre.cautare}%`);
            }
            // pt pagina facturi partener
            if (filtre.id_partener) {
                whereClause += ' AND F.id_partener = ?';
                params.push(filtre.id_partener);
            }
            // pt filtre facturi
            if (filtre.cautare_partener) {
                whereClause += ' AND (P.nume LIKE ? OR P.cui LIKE ?)';
                params.push(`%${filtre.cautare_partener}%`, `%${filtre.cautare_partener}%`);
            }
            if (filtre.status) {
                whereClause += ' AND F.status = ?';
                params.push(filtre.status);
            }
            if (filtre.tip) {
                whereClause += ' AND F.tip = ?';
                params.push(filtre.tip);
            }
            if (filtre.tip_produse) {
                whereClause += ' AND F.tip_produse = ?';
                params.push(filtre.tip_produse);
            }
            if (filtre.data_emitere_start && filtre.data_emitere_final) {
                whereClause += ' AND F.data_emitere BETWEEN ? AND ?';
                params.push(filtre.data_emitere_start, filtre.data_emitere_final);
            }
            if (filtre.data_scadenta_start && filtre.data_scadenta_final) {
                whereClause += ' AND F.data_scadenta BETWEEN ? AND ?';
                params.push(filtre.data_scadenta_start, filtre.data_scadenta_final);
            }

            // sortare
            let orderClause = '';
            if (sort && sort.field) {
                orderClause = ` ORDER BY F.${sort.field} ${sort.order === 'desc' ? 'DESC' : 'ASC'}`;
            } else {
                orderClause = ' ORDER BY F.id DESC';
            }

            const dataQuery = `
                SELECT F.*, P.nume as partener_nume, P.cui as partener_cui, U.nume as operator_nume,
                    (
                        COALESCE((SELECT SUM(total_net) FROM PRODUSE_FACTURA WHERE id_factura = F.id), 0) +
                        COALESCE((SELECT SUM(total_net) FROM OBIECTE_INVENTAR_FACTURA WHERE id_factura = F.id), 0) +
                        COALESCE((SELECT SUM(total_net) FROM MIJLOACE_FIXE_FACTURA WHERE id_factura = F.id), 0) +
                        COALESCE((SELECT SUM(total_net) FROM SERVICII_FACTURA WHERE id_factura = F.id), 0)
                    ) as total_net,
                    (
                    COALESCE((SELECT SUM(total_brut) FROM PRODUSE_FACTURA WHERE id_factura = F.id), 0) +
                        COALESCE((SELECT SUM(total_brut) FROM OBIECTE_INVENTAR_FACTURA WHERE id_factura = F.id), 0) +
                        COALESCE((SELECT SUM(total_brut) FROM MIJLOACE_FIXE_FACTURA WHERE id_factura = F.id), 0) +
                        COALESCE((SELECT SUM(total_brut) FROM SERVICII_FACTURA WHERE id_factura = F.id), 0)
                    ) as total_brut_calc
                FROM FACTURI F
                LEFT JOIN PARTENERI P ON F.id_partener = P.id
                LEFT JOIN UTILIZATORI U ON F.id_utilizator = U.id
                ${whereClause}
                ${orderClause}
                LIMIT ? OFFSET ?
            `;

            const countQuery = `SELECT COUNT(*) as total FROM FACTURI F LEFT JOIN PARTENERI P ON F.id_partener = P.id ${whereClause}`;
            const [rows] = await db.query(dataQuery, [...params, parseInt(limit), parseInt(offset)]);
            const [totalRows] = await db.query(countQuery, params);

            return { data: rows, total: totalRows[0]?.total || 0 };
        } catch (error) {
            console.error("Error in getAll:", error);
            throw error;
        }
    },

    getById: async (id) => {
        const [rows] = await db.query(`
            SELECT F.*, P.nume as partener_nume, P.cui as partener_cui, P.adresa as partener_adresa, P.iban as partener_iban, P.banca as partener_banca, U.nume as operator_nume
            FROM FACTURI F
            LEFT JOIN PARTENERI P ON F.id_partener = P.id
            LEFT JOIN UTILIZATORI U ON F.id_utilizator = U.id
            WHERE F.id = ?
        `, [id]);

        if (!rows[0]) return null;

        const [firma] = await db.query('SELECT * FROM FIRME LIMIT 1');

        const facturaData = rows[0];
        let produse = [];

        if (facturaData.tip_produse === 'marfă') {
            const [rez] = await db.query(`
                SELECT PF.id as id_element, PF.cantitate, PF.pret_unitar_cumparare,
                    PF.suma_tva, PF.total_net, PF.total_brut,
                    M.cota_tva, M.denumire, M.um, M.cmp as cmp_curent,
                    M.pret_curent as pret_unitar_vanzare
                FROM PRODUSE_FACTURA PF JOIN MARFURI M ON PF.id_marfa = M.id WHERE PF.id_factura = ?
            `, [id]);
            produse = rez;
        } else if (facturaData.tip_produse === 'obiecte inventar') {
            const [rez] = await db.query(`
                SELECT OIF.id as id_element, OIF.cantitate, OIF.total_net, OIF.suma_tva, OIF.total_brut, O.cota_tva, O.denumire, O.um
                FROM OBIECTE_INVENTAR_FACTURA OIF JOIN OBIECTE_INVENTAR O ON OIF.id_obiect_inventar = O.id WHERE OIF.id_factura = ?
            `, [id]);
            produse = rez;
        } else if (facturaData.tip_produse === 'mijloc fix') {
            const [rez] = await db.query(`SELECT id as id_element, denumire, total_net, suma_tva, total_brut, cota_tva FROM MIJLOACE_FIXE_FACTURA WHERE id_factura = ?`, [id]);
            produse = rez.map(r => ({...r, cantitate: 1, um: '', pret_unitar: r.total_net}));
        } else if (facturaData.tip_produse === 'servicii') {
            const [rez] = await db.query(`SELECT id as id_element, denumire, total_net, suma_tva, total_brut, cota_tva FROM SERVICII_FACTURA WHERE id_factura = ?`, [id]);
            produse = rez.map(r => ({...r, cantitate: 1, um: '', pret_unitar: r.total_net}));
        }

        return { ...facturaData, produse, firma_proprie: firma[0] };
    },

    delete: async (id) => {
        const [res] = await db.query('DELETE FROM FACTURI WHERE id = ?', [id]);
        return res.affectedRows;
    },

    updateHeader: async (id, data) => {
        const [res] = await db.query(
            'UPDATE FACTURI SET numar=?, data_emitere=?, data_scadenta=?, status=?, tip_produse=? WHERE id=?',
            [data.numar, data.data_emitere, data.data_scadenta, data.status, data.tip_produse, id]
        );
        return res.affectedRows;
    }
};

module.exports = Factura;