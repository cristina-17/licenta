import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Modal, Button, Form } from 'react-bootstrap';


function Plati() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const token = sessionStorage.getItem('token');

    const [plati, setPlati] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(0);

    const [showModal, setShowModal] = useState(false);
    const [cautareFactura, setCautareFactura] = useState('');
    const [facturiEligibile, setFacturiEligibile] = useState([]);

    const [showCashModal, setShowCashModal] = useState(false);
    const [cashStep, setCashStep] = useState(1);
    const [tipCash, setTipCash] = useState('plată');
    const [showDateModal, setShowDateModal] = useState(false);

    // citire filtre din URL
    const page = parseInt(searchParams.get('page') || '1');
    const cautare = searchParams.get('cautare') || '';
    const tip = searchParams.get('tip') || '';
    const metodaPlata = searchParams.get('metodaPlata') || '';
    const sortField = searchParams.get('sortField') || 'data';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const perioadaSelectata = searchParams.get('perioadaSelectata') || 'noi';
    const dataStart = searchParams.get('dataStart') || '';
    const dataFinal = searchParams.get('dataFinal') || '';

    // actualizarea filtre
    const updateFilters = useCallback((newFilters) => {
        const params = new URLSearchParams(searchParams);
        Object.entries(newFilters).forEach(([key, value]) => {
            if (value && value !== 'all' && value !== '') params.set(key, value);
            else params.delete(key);
        });
        if (!newFilters.page) params.set('page', '1');
        setSearchParams(params);
    }, [searchParams, setSearchParams]);

    const fetchPlati = useCallback(async () => {
        try {
            setLoading(true);
            const params = {
                page,
                limit: 10,
                cautare,
                tip,
                metoda_plata: metodaPlata,
                sort_field: sortField,
                sort_order: sortOrder,
                data_start: dataStart,
                data_final: dataFinal
            };
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/plati`, {
                headers: { Authorization: `Bearer ${token}` },
                params
            });
            setPlati(res.data.data);
            setTotalPages(res.data.totalPages);
            setLoading(false);
        } catch (e) { console.error(e); setLoading(false); }
    }, [token, page, cautare, tip, metodaPlata, sortField, sortOrder, dataStart, dataFinal]);

    useEffect(() => {
        if (perioadaSelectata !== 'custom' || !showDateModal) {
            fetchPlati();
        }
    }, [fetchPlati, perioadaSelectata, showDateModal]);

    const handleSalvareCash = async (factura) => {
        try {
            await axios.post(`${process.env.REACT_APP_API_URL}/api/plati`, {
                id_factura: factura.id,
                tip: tipCash,
                status_factura: factura.status,
                metoda_plata: 'cash'
            }, { headers: { Authorization: `Bearer ${token}` } });

            alert("Operațiunea cash a fost înregistrată cu succes!");
            setShowCashModal(false);
            fetchPlati();
        } catch (e) {
            alert(e.response?.data?.message || "Eroare la salvare.");
        }
    };

    const handlePerioadaChange = (e) => {
        const val = e.target.value;
        if (val === 'noi') {
            updateFilters({ perioadaSelectata: 'noi', sortField: 'data', sortOrder: 'desc', dataStart: '', dataFinal: '' });
        } else if (val === 'vechi') {
            updateFilters({ perioadaSelectata: 'vechi', sortField: 'data', sortOrder: 'asc', dataStart: '', dataFinal: '' });
        } else if (val === 'custom') {
            setShowDateModal(true);
            updateFilters({ perioadaSelectata: 'custom' });
        }
    };

    const saveCustomDates = () => {
        if (!dataStart || !dataFinal) {
            alert("Alege ambele date!");
            return;
        }
        setShowDateModal(false);
        fetchPlati();
    };

    useEffect(() => {
        if (showModal || (showCashModal && cashStep === 2)) {
            const fetchEligibile = async () => {
                try {
                    const statusFiltru = showCashModal ? (tipCash === 'plată' ? 'primită' : 'emisă') : 'primită';
                    const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/plati/eligibile?cautare=${cautareFactura}&status=${statusFiltru}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setFacturiEligibile(res.data);
                } catch (e) { console.error(e); }
            };
            const timer = setTimeout(fetchEligibile, 300);
            return () => clearTimeout(timer);
        }
    }, [cautareFactura, showModal, showCashModal, cashStep, tipCash, token]);

    return (
        <div className="container-fluid">
            {showModal && (
                <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header bg-danger text-white">
                                <h5 className="modal-title">Efectuează plată</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="position-relative">
                                    <input className="form-control mb-3 pe-5" placeholder="Caută nr. factură sau nume furnizor..."
                                        value={cautareFactura} onChange={e => setCautareFactura(e.target.value)} autoFocus />
                                    {cautareFactura && (
                                        <button
                                            className="btn btn-link position-absolute end-0 text-secondary pe-2"
                                            onClick={() => setCautareFactura('')}
                                            style={{ textDecoration: 'none', fontSize: '1.2rem', top: '50%', transform: 'translateY(-75%)' }}
                                        >
                                            &times;
                                        </button>
                                    )}
                                </div>
                                <div className="list-group">
                                    {facturiEligibile.length === 0 ? <p className="text-center text-muted">Nu există facturi de plată.</p> :
                                    facturiEligibile.map(f => (
                                        <div key={f.id} className="list-group-item d-flex justify-content-between align-items-center">
                                            <div>
                                                <strong>{f.numar}</strong> - {f.partener_nume} <br/>
                                                <span className="badge bg-warning text-dark">Factură furnizor</span>
                                            </div>
                                            <div className="text-end">
                                                <h6 className="fw-bold text-danger mb-1">{f.total_brut} RON</h6>
                                                <button className="btn btn-sm btn-danger fw-bold" onClick={() => {
                                                        setShowModal(false);
                                                        navigate('/plata-factura', { state: { facturaId: f.id, nrFactura: f.numar, totalBrut: f.total_brut, partenerNume: f.partener_nume } });
                                                    }}>
                                                    Plătește
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Plăți efectuate și încasăte</h2>
                <div className="d-flex gap-2">
                <button className="btn btn-success" onClick={() => { setShowCashModal(true); setCashStep(1); setCautareFactura(''); }}>
                    <i className="bi bi-cash me-2"></i>Înregistrare cash
                </button>
                <button className="btn btn-danger" onClick={() => { setShowModal(true); setCautareFactura(''); }}>
                    <i className="bi bi-credit-card me-2"></i>Plată nouă card
                </button>
            </div>
            </div>

            <div className="app-filter-card">
                <div className="row g-3">
                    <div className="col-md-3">
                        <div className="position-relative">
                            <input className="form-control pe-5" placeholder="Caută ID, Factură..."
                                value={cautare} onChange={e => updateFilters({ cautare: e.target.value })} />
                            {cautare && (
                                <button
                                    className="btn btn-link position-absolute end-0 text-secondary pe-2"
                                    onClick={() => updateFilters({ cautare: '' })}
                                    style={{ textDecoration: 'none', fontSize: '1.2rem', top: '50%', transform: 'translateY(-50%)' }}
                                >
                                    &times;
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="col-md-3">
                        <select className="form-select" value={tip} onChange={e => updateFilters({ tip: e.target.value })}>
                            <option value="">Toate tipurile</option>
                            <option value="plată">Plăți efectuate</option>
                            <option value="încasare">Plăți încasate</option>
                        </select>
                    </div>
                    <div className="col-md-3">
                        <select className="form-select" value={metodaPlata} onChange={e => updateFilters({ metodaPlata: e.target.value })}>
                            <option value="">Toate metodele</option>
                            <option value="card">Card</option>
                            <option value="cash">Cash</option>
                        </select>
                    </div>
                    <div className="col-md-3">
                        <select className="form-select" value={perioadaSelectata} onChange={handlePerioadaChange}>
                            <option value="noi">Cele mai noi</option>
                            <option value="vechi">Cele mai vechi</option>
                            <option value="custom">Alege perioada...</option>
                        </select>
                    </div>

                    <div className="col-md-2">
                        <select className="form-select" value={sortField === 'suma' ? sortOrder : ''}
                                onChange={e => updateFilters({ sortField: 'suma', sortOrder: e.target.value })}>
                            <option value="">Sortare sumă</option>
                            <option value="asc">Sumă: crescător</option>
                            <option value="desc">Sumă: descrescător</option>
                        </select>
                    </div>
                </div>
                {(dataStart && dataFinal) && (
                    <div className="mt-2 text-muted small px-1">
                        <i className="bi bi-filter-circle me-1"></i>
                        Interval activ: <strong>{new Date(dataStart).toLocaleDateString()}</strong> - <strong>{new Date(dataFinal).toLocaleDateString()}</strong>
                    </div>
                )}
            </div>

            {/* modal alegere perioada */}
            <Modal show={showDateModal} onHide={() => { setShowDateModal(false); if(!dataStart) updateFilters({ perioadaSelectata: 'noi' }); }} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Alege intervalul de plăți</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>Data start</Form.Label>
                        <Form.Control type="date" value={dataStart} onChange={e => updateFilters({ dataStart: e.target.value })} className="mb-2" />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Data final</Form.Label>
                        <Form.Control type="date" value={dataFinal} onChange={e => updateFilters({ dataFinal: e.target.value })} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => { setShowDateModal(false); updateFilters({ perioadaSelectata: 'noi', dataStart: '', dataFinal: '' }); }}>Renunță</Button>
                    <Button variant="primary" onClick={saveCustomDates}>Aplică filtru</Button>
                </Modal.Footer>
            </Modal>

            <div className="table-responsive">
                <table className="table">
                    <thead className="">
                        <tr>
                            <th>ID</th><th>Nr. factură</th><th>Partener</th><th>Tip</th><th>Metodă</th><th>Data</th><th>Suma</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan="7" className="text-center">Se încarcă...</td></tr> :
                        plati.length === 0 ? <tr><td colSpan="7" className="text-center">Nu există înregistrări.</td></tr> :
                        plati.map(p => (
                            <tr key={p.id}>
                                <td>#{p.id}</td><td className="fw-bold">{p.nr_factura}</td><td>{p.partener_nume}</td>
                                <td><span className={`badge ${p.tip === 'încasare' ? 'bg-success' : 'bg-danger'}`}>{p.tip.toUpperCase()}</span></td>
                                <td>{p.metoda_plata.toUpperCase()}</td><td>{new Date(p.data).toLocaleString('ro-RO')}</td>
                                <td className={`fw-bold ${p.tip === 'încasare' ? 'text-success' : 'text-danger'}`}>{p.tip === 'încasare' ? '+' : '-'}{p.suma} RON</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal show={showCashModal} onHide={() => setShowCashModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Alege transferul</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {cashStep === 1 ? (
                        <div className="text-center">
                            <label className="form-label fw-bold">Tip operațiune:</label>
                            <select className="form-select mb-4" value={tipCash} onChange={e => setTipCash(e.target.value)}>
                                <option value="plată">Plată (către furnizor)</option>
                                <option value="încasare">Încasare (de la client)</option>
                            </select>
                            <Button variant="primary" onClick={() => {
                                setCautareFactura('');
                                setCashStep(2);
                            }}>Continuă</Button>
                        </div>
                    ) : (
                        <>
                            <input className="form-control mb-3" placeholder="Caută factură..." value={cautareFactura} onChange={e => setCautareFactura(e.target.value)} />
                            <div className="list-group" style={{maxHeight: '300px', overflowY: 'auto'}}>
                                {facturiEligibile.filter(f => (tipCash === 'plată' ? f.status === 'primită' : f.status === 'emisă')).map(f => (
                                    <div key={f.id} className="list-group-item d-flex justify-content-between align-items-center">
                                        <span>#{f.numar} - {f.partener_nume} ({f.total_brut} RON)</span>
                                        <Button variant="outline-success" size="sm" onClick={() => handleSalvareCash(f)}>Alege factura</Button>
                                    </div>
                                ))}
                            </div>
                            <Button variant="link" className="mt-2" onClick={() => setCashStep(1)}>Înapoi</Button>
                        </>
                    )}
                </Modal.Body>
            </Modal>

            {/* paginare */}
            <div className="d-flex justify-content-center mt-3 mb-5 align-items-center">
                <button className="btn btn-sm btn-outline-secondary me-2" disabled={page <= 1} onClick={() => updateFilters({ page: '1' })}>««</button>
                <button className="btn btn-sm btn-nav-accent me-2" disabled={page <= 1} onClick={() => updateFilters({ page: (page - 1).toString() })}>«</button>
                <span className="align-self-center mx-2 fw-bold small">Pagina {page} din {totalPages || 1}</span>
                <button className="btn btn-sm btn-nav-accent ms-2" disabled={page >= totalPages} onClick={() => updateFilters({ page: (page + 1).toString() })}>»</button>
                <button className="btn btn-sm btn-outline-secondary ms-2" disabled={page >= totalPages} onClick={() => updateFilters({ page: totalPages.toString() })}>»»</button>
            </div>
        </div>
    );
}

export default Plati;