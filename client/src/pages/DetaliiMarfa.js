import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

function DetaliiMarfa() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [marfa, setMarfa] = useState(null);
    const [dataCautata, setDataCautata] = useState('');
    const [pretIstoric, setPretIstoric] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const fetchMarfa = async () => {
            const token = sessionStorage.getItem('token');
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/marfuri/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMarfa(res.data);

            // verificare daca stocul este < 10
            if (res.data.stoc_curent < 10) {
                setShowModal(true);
            }
        };
        fetchMarfa();
    }, [id]);

    const cautaPret = async () => {
        if (!dataCautata) return;
        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/marfuri/${id}/pret-istoric?data=${dataCautata}`, {headers: { Authorization: `Bearer ${token}` }});
            setPretIstoric(res.data.pret);
        } catch (error) {
            alert("Eroare la căutarea prețului");
        }
    };

    if (!marfa) return <div className="p-5 text-center">Se încarcă detaliile...</div>;

    const esteInPierdere = parseFloat(marfa.pret_curent) <= parseFloat(marfa.cmp);

    return (
        <div className="container-fluid">
            {/* modal de avertizare ca stocul este < 10 */}
            {showModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header bg-danger text-white">
                                <h5 className="modal-title">Stoc redus</h5>
                                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <p className="fs-5">
                                    Au mai rămas doar <strong>{marfa.stoc_curent} {marfa.um}</strong> în stoc.
                                </p>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Am înțeles</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* modal de avertizare ca pret_unitar_vanzare < cmp */}
            {esteInPierdere && (
                <div className="alert alert-danger shadow-sm border-start border-danger border-5 mb-4 d-flex align-items-center">
                    <i className="bi bi-exclamation-octagon-fill fs-3 me-3"></i>
                    <div>
                        <h5 className="mb-1">vânzare în pierdere.</h5>
                        <span>CMP este mai mare decât prețul de vânzare.</span>
                    </div>
                </div>
            )}

            <div className="d-flex align-items-center mb-4">
                <button className="btn btn-outline-secondary me-3" onClick={() => navigate('/marfuri')}>Înapoi</button>
                <h2 className="mb-4 text-primary">Detalii marfă: {marfa.denumire}</h2>
            </div>

            <div className="row text-center flex-nowrap g-0">
                <div className="col border-end px-2">
                    <small className="text-muted d-block">Preț vânzare</small>
                    <span className={`fs-5 fw-bold ${esteInPierdere ? 'text-danger' : 'text-success'}`}>
                        {parseFloat(marfa.pret_curent || 0).toFixed(2)} RON
                    </span>                </div>

                <div className="col border-end px-2">
                    <small className="text-muted d-block">Cost mediu (CMP)</small>
                    <span className={`fs-5 fw-bold ${esteInPierdere ? 'text-danger' : 'text-primary'}`}>
                        {parseFloat(marfa.cmp || 0).toFixed(2)} RON
                    </span>                </div>

                <div className="col border-end px-2">
                    <small className="text-muted d-block">Stoc curent</small>
                    <span className="fs-5 fw-bold">{parseFloat(marfa.stoc_curent || 0).toFixed(2)} {marfa.um}</span>
                </div>

                <div className="col border-end px-2">
                    <small className="text-muted d-block">Categorie</small>
                    <span className="fs-6 d-block text-truncate">{marfa.categorie}</span>
                </div>

                <div className="col border-end px-2">
                    <small className="text-muted d-block">U.M.</small>
                    <span className="fs-5">{marfa.um}</span>
                </div>

                <div className="col px-2">
                    <small className="text-muted d-block">Cota TVA</small>
                    <span className="fs-5">{marfa.cota_tva}%</span>
                </div>
            </div>

            <div className="row">
                {/* cautare pret din istoric */}
                <div className="col-md-5">
                    <div className="card shadow-sm h-100">
                        <div className="card-header bg-info text-white">Istoric preț</div>
                        <div className="card-body">
                            <label>Vezi prețul de vânzare la data de:</label>
                            <div className="input-group mb-3 mt-2">
                                <input
                                    type="date"
                                    className="form-control"
                                    value={dataCautata}
                                    onChange={e => setDataCautata(e.target.value)}
                                />
                                <button className="btn btn-primary" onClick={cautaPret}>Caută</button>
                            </div>
                            {pretIstoric !== null && (
                                <div className="alert alert-success mt-3">
                                    Prețul de vânzare la data {dataCautata}: <strong>{pretIstoric} RON</strong>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* tabel modificari de stoc (vanzari sau achizitii) */}
                <div className="col-md-7">
                    <div className="card shadow-sm h-100">
                        <div className="card-header">Istoric intrări/ieșiri</div>
                        <div className="card-body">
                            <table className="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Tip</th>
                                        <th>Data</th>
                                        <th>Partener</th>
                                        <th>Cantitate</th>
                                        <th>Preț achiziție</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {marfa.miscari && marfa.miscari.length > 0 ? (
                                        marfa.miscari.map((m, idx) => (
                                            <tr key={idx}>
                                                <td>{m.tip.toUpperCase()}</td>
                                                <td>{new Date(m.data).toLocaleDateString()}</td>
                                                <td>{m.partener}</td>
                                                <td className={m.tip === 'achiziție' ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                                                    {m.tip === 'achiziție' ? '+' : '-'}{m.cantitate} {marfa.um}
                                                </td>
                                                <td>{m.tip === 'achiziție' ? `${m.pret_unitar_cumparare} RON` : '-'}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="4" className="text-muted text-center">Nu există nicio intrare/ieșire înregistrată (încă nu sunt facturi înregistrate pentru această marfă).</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DetaliiMarfa;