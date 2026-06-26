import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

function DetaliiObiectInventar() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [obiect, setObiect] = useState(null);

    useEffect(() => {
        const fetchObiect = async () => {
            const token = sessionStorage.getItem('token');
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/obiecte-inventar/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setObiect(res.data);
        };
        fetchObiect();
    }, [id]);

    if (!obiect) return <div className="p-5 text-center">Se încarcă detaliile...</div>;

    return (
        <div className="container-fluid">
            {/* tabel modificari de stoc (achizitii conform facturilor) */}
            <div className="d-flex align-items-center mb-4">
                <button className="btn btn-outline-secondary me-3" onClick={() => navigate('/obiecte-inventar')}>Înapoi</button>
                <h2 className="mb-0 text-primary">Istoric: {obiect.denumire}</h2>
            </div>

            <div className="card shadow-sm mb-4 bg-light">
                <div className="card-body row fs-5 text-center">
                    <div className="col-md-4"><strong>UM:</strong> {obiect.um}</div>
                    <div className="col-md-4"><strong>TVA:</strong> {obiect.cota_tva}%</div>
                    <div className="col-md-4"><strong>Stoc curent:</strong> <span className="fw-bold">{obiect.stoc_curent}</span></div>
                </div>
            </div>

            <div className="card shadow-sm">
                <div className="card-header">Istoric intrări:</div>
                <div className="card-body p-0">
                    <table className="table table-hover mb-0 text-center">
                        <thead className="table-light">
                            <tr>
                                <th>Tip factură</th>
                                <th>Data emiterii</th>
                                <th>Partener</th>
                                <th>Cantitate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {obiect.miscari && obiect.miscari.length > 0 ? (
                                obiect.miscari.map((m, idx) => (
                                    <tr key={idx}>
                                        <td><span className="badge bg-warning text-dark">Primită (Intrare)</span></td>
                                        <td>{new Date(m.data).toLocaleDateString('ro-RO')}</td>
                                        <td>{m.partener}</td>
                                        <td className="text-success fw-bold">
                                            +{m.cantitate} {obiect.um}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="4" className="text-muted py-4">Nu există nicio intrare înregistrată.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default DetaliiObiectInventar;