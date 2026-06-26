import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import { Modal, Button, Form } from 'react-bootstrap';

function Facturi() {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const token = sessionStorage.getItem('token');

    const [searchParams, setSearchParams] = useSearchParams();


    const [facturi, setFacturi] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(0);

    const [showModalEmitere, setShowModalEmitere] = useState(false);
    const [showModalScadenta, setShowModalScadenta] = useState(false);

    // citire valori filtre din url
    const page = parseInt(searchParams.get('page') || '1');
    const cautare = searchParams.get('cautare') || '';
    const cautarePartener = searchParams.get('cautarePartener') || '';
    const tip = searchParams.get('tip') || '';
    const status = searchParams.get('status') || '';
    const tipProduse = searchParams.get('tipProduse') || '';
    const perioadaEmitere = searchParams.get('perioadaEmitere') || 'all';
    const perioadaScadenta = searchParams.get('perioadaScadenta') || 'all';
    const dataStartEmitere = searchParams.get('dataStartEmitere') || '';
    const dataFinalEmitere = searchParams.get('dataFinalEmitere') || '';
    const dataStartScadenta = searchParams.get('dataStartScadenta') || '';
    const dataFinalScadenta = searchParams.get('dataFinalScadenta') || '';

    // actualizare filtre
    const updateFilters = (newFilters) => {
        const params = new URLSearchParams(searchParams);
        Object.entries(newFilters).forEach(([key, value]) => {
            if (value && value !== 'all') params.set(key, value);
            else params.delete(key);
        });
        if (!newFilters.page) params.set('page', '1');
        setSearchParams(params);
    };

    const fetchFacturi = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const params = {
                page,
                limit: 10,
                cautare,
                cautare_partener: cautarePartener,
                status,
                tip,
                tip_produse: tipProduse,
                data_emitere_start: dataStartEmitere,
                data_emitere_final: dataFinalEmitere,
                data_scadenta_start: dataStartScadenta,
                data_scadenta_final: dataFinalScadenta
            };
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/facturi`, {
                headers: { Authorization: `Bearer ${token}` },
                params
            });
            setFacturi(response.data.data);
            setTotalPages(response.data.totalPages);
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    }, [token, page, cautare, cautarePartener, status, tip, tipProduse, dataStartEmitere, dataFinalEmitere, dataStartScadenta, dataFinalScadenta]);

    useEffect(() => {
        fetchFacturi();
    }, [fetchFacturi]);

    const handlePerioadaEmitereChange = (e) => {
        const val = e.target.value;
        const azi = new Date();
        const aziStr = azi.toISOString().split('T')[0];
        let start = '', final = '';

        if (val === '1luna') {
            const trecut = new Date(); trecut.setMonth(trecut.getMonth() - 1);
            start = trecut.toISOString().split('T')[0]; final = aziStr;
        } else if (val === '6luni') {
            const trecut = new Date(); trecut.setMonth(trecut.getMonth() - 6);
            start = trecut.toISOString().split('T')[0]; final = aziStr;
        } else if (val === '1an') {
            const trecut = new Date(); trecut.setFullYear(trecut.getFullYear() - 1);
            start = trecut.toISOString().split('T')[0]; final = aziStr;
        }

        if (val === 'custom') {
            updateFilters({ perioadaEmitere: 'custom' });
            setShowModalEmitere(true);
        } else {
            updateFilters({ perioadaEmitere: val, dataStartEmitere: start, dataFinalEmitere: final });
        }
    };

    const handlePerioadaScadentaChange = (e) => {
        const val = e.target.value;
        const azi = new Date();
        const aziStr = azi.toISOString().split('T')[0];
        let start = '', final = '';

        if (val === 'next_luna') {
            const viitor = new Date(); viitor.setMonth(viitor.getMonth() + 1);
            start = aziStr; final = viitor.toISOString().split('T')[0];
        } else if (val === 'next_6luni') {
            const viitor = new Date(); viitor.setMonth(viitor.getMonth() + 6);
            start = aziStr; final = viitor.toISOString().split('T')[0];
        } else if (val === 'next_1an') {
            const viitor = new Date(); viitor.setFullYear(viitor.getFullYear() + 1);
            start = aziStr; final = viitor.toISOString().split('T')[0];
        } else if (val === 'last_luna') {
            const trecut = new Date(); trecut.setMonth(trecut.getMonth() - 1);
            start = trecut.toISOString().split('T')[0]; final = aziStr;
        } else if (val === 'last_6luni') {
            const trecut = new Date(); trecut.setMonth(trecut.getMonth() - 6);
            start = trecut.toISOString().split('T')[0]; final = aziStr;
        } else if (val === 'last_1an') {
            const trecut = new Date(); trecut.setFullYear(trecut.getFullYear() - 1);
            start = trecut.toISOString().split('T')[0]; final = aziStr;
        }

        if (val === 'custom') {
            updateFilters({ perioadaScadenta: 'custom' });
            setShowModalScadenta(true);
        } else {
            updateFilters({ perioadaScadenta: val, dataStartScadenta: start, dataFinalScadenta: final });
        }
    };

    return (
        <div className="container-fluid">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="app-page-title">Facturi {tip ? (tip === 'emisă' ? '(Vânzări)' : '(Achiziții)') : ''}</h2>
                <Link to="/facturi/adaugare" className="btn btn-primary">
                    <i className="bi bi-plus-circle me-2"></i>Adăugare
                </Link>
            </div>

            {/* filtre */}
            <div className="app-filter-card">
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-3 position-relative">
                            <input type="text" className="form-control" placeholder="Nr. factură..." value={cautare} onChange={(e) => updateFilters({ cautare: e.target.value })} />
                            {cautare && <button className="btn btn-link position-absolute end-0 top-0 text-secondary" onClick={() => updateFilters({ cautare: '' })} style={{textDecoration:'none', marginRight:'10px'}}>×</button>}
                        </div>
                        <div className="col-md-3 position-relative">
                            <input type="text" className="form-control" placeholder="Partener (Nume/CUI)..." value={cautarePartener} onChange={(e) => updateFilters({ cautarePartener: e.target.value })} />
                            {cautarePartener && <button className="btn btn-link position-absolute end-0 top-0 text-secondary" onClick={() => updateFilters({ cautarePartener: '' })} style={{textDecoration:'none', marginRight:'10px'}}>×</button>}
                        </div>
                        <div className="col-md-2">
                            <select className="form-select" value={status} onChange={e => updateFilters({ status: e.target.value })}>
                                <option value="">Status...</option>
                                <option value="emisă">Emisă (neîncasată)</option>
                                <option value="încasată">Încasată</option>
                                <option value="primită">Primită (neplătită)</option>
                                <option value="plătită">Plătită</option>
                            </select>
                        </div>
                        <div className="col-md-2">
                            <select className="form-select" value={tipProduse} onChange={e => updateFilters({ tipProduse: e.target.value })}>
                                <option value="">Conținut...</option>
                                <option value="marfă">Mărfuri</option>
                                <option value="mijloc fix">Mijloace fixe</option>
                                <option value="obiecte inventar">Obiecte de inventar</option>
                                <option value="servicii">Servicii</option>
                            </select>
                        </div>
                        <div className="col-md-3">
                            <select className="form-select" value={perioadaEmitere} onChange={handlePerioadaEmitereChange}>
                                <option value="all">Orice data de emitere</option>
                                <option value="1luna">Ultima luna</option>
                                <option value="6luni">Ultimele 6 luni</option>
                                <option value="1an">Ultimul an</option>
                                <option value="custom">Alege perioada</option>
                            </select>
                        </div>

                        <div className="col-md-3">
                            <select className="form-select" value={perioadaScadenta} onChange={handlePerioadaScadentaChange}>
                                <option value="all">Orice data de scadenta</option>
                                <option value="next_luna">Urmatoarea luna</option>
                                <option value="next_6luni">Următoarele 6 luni</option>
                                <option value="next_1an">Următorul an</option>
                                <option value="last_luna">Ultima luna</option>
                                <option value="last_6luni">Ultimele 6 luni</option>
                                <option value="last_1an">Ultimul an</option>
                                <option value="custom">Alege perioada</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* detalii factura */}
            {loading ? <div className="text-center">Se încarcă...</div> : (
                <div className="table-responsive">
                    <table className="table table-hover align-middle">
                        <thead className="">
                            <tr><th>Număr</th><th>Data emitere</th><th>Data scadență</th><th>Partener</th><th>Tip</th><th>Conținut</th><th>Total brut</th><th>Status</th><th>Operator</th>
                            <th className="text-center">Acțiuni</th></tr>
                        </thead>
                        <tbody>
                            {facturi.map((f) => (
                                <tr key={f.id}>
                                    <td className="fw-bold">{f.numar}</td>
                                    <td>{new Date(f.data_emitere).toLocaleDateString()}</td>
                                    <td>{new Date(f.data_scadenta).toLocaleDateString()}</td>
                                    <td>{f.partener_nume}</td>
                                    <td>{f.tip === 'emisă' ? <span className="badge bg-info text-dark">Emisă</span> : <span className="badge bg-warning text-dark">Primită</span>}</td>
                                    <td className="text-capitalize">{f.tip_produse}</td>
                                    <td className="fw-bold">{f.total_brut} RON</td>
                                    <td><span className={`badge ${['încasată','plătită'].includes(f.status) ? 'bg-success' : 'bg-danger'}`}>{f.status.toUpperCase()}</span></td>
                                    <td><small>{f.operator_nume}</small></td>
                                    <td>
                                        <div className="btn-group btn-group-sm">
                                            <Link to={`/facturi/detalii/${f.id}`} state={{ from: '/facturi' }} className="btn btn-outline-primary" title="Detalii">Detalii</Link>
                                            {(user.rol === 'admin' || f.id_utilizator === user.id) && (
                                                <Link to={`/facturi/editare/${f.id}`} className="btn btn-outline-warning" title="Editare">Editează</Link>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* modal perioada emitere */}
            <Modal show={showModalEmitere} onHide={() => setShowModalEmitere(false)} centered>
                <Modal.Header closeButton className="">
                    <Modal.Title>Alege perioada emitere</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>De la:</Form.Label>
                        <Form.Control type="date" value={dataStartEmitere} onChange={(e) => updateFilters({ dataStartEmitere: e.target.value } )} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Până la:</Form.Label>
                        <Form.Control type="date" value={dataFinalEmitere} onChange={(e) => updateFilters({ dataFinalEmitere: e.target.value } )} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={() => setShowModalEmitere(false)}>Aplică</Button>
                </Modal.Footer>
            </Modal>

            {/* modal perioada scadenta */}
            <Modal show={showModalScadenta} onHide={() => setShowModalScadenta(false)} centered>
                <Modal.Header closeButton className="">
                    <Modal.Title>Alege perioada scadență</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>De la:</Form.Label>
                        <Form.Control type="date" value={dataStartScadenta} onChange={(e) => updateFilters({ dataStartScadenta: e.target.value } )} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Până la:</Form.Label>
                        <Form.Control type="date" value={dataFinalScadenta} onChange={(e) => updateFilters({ dataFinalScadenta: e.target.value } )} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={() => setShowModalScadenta(false)}>Aplică</Button>
                </Modal.Footer>
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

export default Facturi;