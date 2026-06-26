import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

function DetaliiMijlocFix() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [mf, setMf] = useState(null);
    const token = sessionStorage.getItem('token');

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/mijloace-fixe/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMf(res.data);
            } catch (e) {
                alert("Nu am găsit mijlocul fix.");
                navigate('/mijloace-fixe');
            }
        };
        fetch();
    }, [id, navigate, token]);

    if (!mf) return <div className="text-center mt-5">Se încarcă...</div>;

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('ro-RO');
    };

    return (
        <div className="container-fluid">
            <button className="btn btn-outline-secondary mb-3" onClick={() => navigate('/mijloace-fixe')}>Înapoi la Listă</button>

            <div className="card shadow mb-4">
                <div className="card-header d-flex justify-content-between">
                    <h4 className="mb-0">{mf.denumire}</h4>
                    <span className="badge bg-light text-dark align-self-center">{mf.status.toUpperCase()}</span>
                </div>
                <div className="card-body">
                    <div className="row">
                        <div className="col-md-3"><strong>Nr. inventar:</strong> {mf.nr_inventar}</div>
                        <div className="col-md-3"><strong>Data intrare:</strong> {formatDate(mf.data_intrare)}</div>
                        <div className="col-md-3"><strong>Data sfârșit:</strong> {formatDate(mf.data_sfarsit)}</div>
                        <div className="col-md-3"><strong>Data casare:</strong> {formatDate(mf.data_casare)}</div>
                    </div>
                    <hr />
                    <div className="row">
                        <div className="col-md-3"><strong>Valoare intrare:</strong> {mf.valoare_intrare} RON</div>
                        <div className="col-md-3 text-success"><strong>Valoare actuală:</strong> {mf.valoare_actuala} RON</div>
                        <div className="col-md-3"><strong>Tip amortizare:</strong> {mf.tip_amortizare}</div>
                        <div className="col-md-3"><strong>Durată:</strong> {mf.durata_viata_luni} luni</div>
                    </div>
                </div>
            </div>

            {/* tabel istoric amortizari */}
            <h5 className="mb-3 text-secondary">Istoric amortizări</h5>
            <div className="table-responsive">
                <table className="table">
                    <thead className="table-light">
                        <tr>
                            <th>Luna/An</th>
                            <th>Valoare amortizată</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mf.amortizari && mf.amortizari.length > 0 ? (
                            mf.amortizari.map((a, idx) => (
                                <tr key={idx}>
                                    <td>{formatDate(a.luna_an)}</td>
                                    <td className="fw-bold">{a.valoare_amortizare} RON</td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="2" className="text-center">Nu există amortizări înregistrate.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default DetaliiMijlocFix;