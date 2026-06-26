import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Firma() {
    const navigate = useNavigate();
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const token = sessionStorage.getItem('token');

    const [firma, setFirma] = useState(null);
    const [facturiUser, setFacturiUser] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token || !user) { setLoading(false); return; }
        const fetchData = async () => {
            try {
                const resFirma = await axios.get(`${process.env.REACT_APP_API_URL}/api/firme`, { headers: { Authorization: `Bearer ${token}` } });
                setFirma(resFirma.data);
                const resFacturi = await axios.get(`${process.env.REACT_APP_API_URL}/api/facturi`, {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { limit: 1000 }
                });
                const toateFacturile = resFacturi.data.data;
                setFacturiUser(
                    user?.rol === 'admin'
                        ? toateFacturile
                        : toateFacturile.filter(f => f.id_utilizator === user?.id)
                );
                setLoading(false);
            } catch (err) { console.error(err); setLoading(false); }
        };
        fetchData();
    }, [token, user?.id]);

    if (loading) return <div className="app-loading"><div className="spinner-border"></div></div>;

    return (
        <div className="container-fluid">
            {/* header firma */}
            <div className="mb-4 pb-3" style={{ borderBottom: '2px solid var(--accent-pale)' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{firma?.nume}</h1>
                <p className="text-muted mb-0">
                    Logat cu contul: <strong>{user?.nume}</strong> ({user?.email || user?.nume_utilizator})
                </p>
            </div>

            {/* card detalii firma */}
            <div className="card mb-4">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <span><i className="bi bi-building me-2"></i>Detalii firmă</span>
                    {user.rol === 'admin' && (
                        <button className="btn btn-outline-warning btn-sm" onClick={() => navigate('/editare-firma')}>
                            <i className="bi bi-pencil me-1"></i>Editează
                        </button>
                    )}
                </div>
                <div className="card-body">
                    <div className="row g-4">
                        {[
                            { label: 'CUI', value: firma?.cui },
                            { label: 'Nr. Reg. Comerț', value: firma?.nr_reg_comert },
                            { label: 'An Înființare', value: firma?.an_infiintare },
                            { label: 'Telefon', value: firma?.telefon },
                            { label: 'Adresă Sediu', value: firma?.adresa, cols: 6 },
                            { label: 'Email', value: firma?.email, cols: 6 },
                            { label: 'IBAN', value: firma?.iban, cols: 6, bold: true },
                            { label: 'Bancă', value: firma?.banca, cols: 6 },
                        ].map(({ label, value, cols = 3, bold }) => (
                            <div key={label} className={`col-md-${cols}`}>
                                <label className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
                                <p className={`mb-0 ${bold ? 'fw-bold' : ''}`} style={{ fontSize: '1rem' }}>{value || '-'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* facturile utilizatorului */}
            <div className="card">
                <div className="card-header">
                    <i className="bi bi-receipt me-2"></i>
                    {user.rol === 'admin' ? 'Toate facturile' : `Facturile înregistrate de ${user.nume}`}
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table mb-0">
                            <thead>
                                <tr>
                                    <th>Număr</th><th>Data emitere</th><th>Data scadență</th>
                                    <th>Partener</th><th>Tip</th><th>Conținut</th>
                                    <th>Total brut</th><th>Status</th><th>Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {facturiUser.length > 0 ? facturiUser.map(f => (
                                    <tr key={f.id}>
                                        <td className="fw-bold">{f.numar}</td>
                                        <td>{new Date(f.data_emitere).toLocaleDateString()}</td>
                                        <td>{new Date(f.data_scadenta).toLocaleDateString()}</td>
                                        <td>{f.partener_nume}</td>
                                        <td>
                                            {f.tip === 'emisă'
                                                ? <span className="badge badge-emisa">Emisă</span>
                                                : <span className="badge badge-primita">Primită</span>}
                                        </td>
                                        <td className="text-capitalize">{f.tip_produse}</td>
                                        <td className="fw-bold">{f.total_brut} RON</td>
                                        <td>
                                            <span className={`badge ${['încasată','plătită'].includes(f.status) ? 'badge-incasata' : 'badge-restanta'}`}>
                                                {f.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="d-flex gap-1">
                                                <button className="btn btn-outline-primary btn-sm" onClick={() => navigate(`/facturi/detalii/${f.id}`, { state: { from: '/firma' } })}>Detalii</button>
                                                <button className="btn btn-outline-warning btn-sm" onClick={() => navigate(`/facturi/editare/${f.id}`)}>Editează</button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="9" className="text-center py-4 text-muted">Nu ai înregistrat nicio factură încă.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Firma;
