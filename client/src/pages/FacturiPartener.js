import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Modal, Button, Form } from 'react-bootstrap';

function FacturiPartener() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const token = sessionStorage.getItem('token');

    const [partener, setPartener] = useState(null);
    const [facturi, setFacturi] = useState([]);

    // paginare
    const [totalPages, setTotalPages] = useState(1);
    const limit = 10;

    // citire filtre din url
    const page = parseInt(searchParams.get('page') || '1');
    const cautare = searchParams.get('cautare') || '';
    const tip = searchParams.get('tip') || '';
    const tipProduse = searchParams.get('tipProduse') || '';
    const status = searchParams.get('status') || '';

    const perioadaEmitere = searchParams.get('perioadaEmitere') || 'all';
    const dataStartEmitere = searchParams.get('dataStartEmitere') || '';
    const dataFinalEmitere = searchParams.get('dataFinalEmitere') || '';
    const [showModalEmitere, setShowModalEmitere] = useState(false);

    const perioadaScadenta = searchParams.get('perioadaScadenta') || 'all';
    const dataStartScadenta = searchParams.get('dataStartScadenta') || '';
    const dataFinalScadenta = searchParams.get('dataFinalScadenta') || '';
    const [showModalScadenta, setShowModalScadenta] = useState(false);

    // actualizare filtre
    const updateFilters = useCallback((newFilters) => {
        const params = new URLSearchParams(searchParams);
        Object.entries(newFilters).forEach(([key, value]) => {
            if (value && value !== 'all') params.set(key, value);
            else params.delete(key);
        });
        if (!newFilters.page) params.set('page', '1');
        setSearchParams(params);
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        const fetchPartener = async () => {
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/parteneri/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setPartener(res.data);
            } catch (err) {
                console.error(err);
                alert("Eroare la încărcarea partenerului");
                navigate('/parteneri');
            }
        };
        fetchPartener();
    }, [id, navigate, token]);

    const fetchFacturi = useCallback(async () => {
        if (!id) return;
        try {
            const params = {
                partener: id,
                page,
                limit,
                cautare,
                tip,
                tip_produse: tipProduse,
                status,
                data_emitere_start: dataStartEmitere,
                data_emitere_final: dataFinalEmitere,
                data_scadenta_start: dataStartScadenta,
                data_scadenta_final: dataFinalScadenta
            };

            const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/facturi`, {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });
            setFacturi(res.data.data);
            setTotalPages(res.data.totalPages);
        } catch (err) {
            console.error(err);
        }
    }, [id, token, page, cautare, tip, tipProduse, status, dataStartEmitere, dataFinalEmitere, dataStartScadenta, dataFinalScadenta]);

    useEffect(() => {
        fetchFacturi();
    }, [fetchFacturi]);

    const handlePerioadaEmitereChange = (e) => {
        const val = e.target.value;
        const azi = new Date().toISOString().split('T')[0];
        let start = '', final = '';

        if (val === 'custom') { setShowModalEmitere(true); return; }

        if (val === '1luna') {
            const d = new Date(); d.setMonth(d.getMonth() - 1); start = d.toISOString().split('T')[0]; final = azi;
        } else if (val === '6luni') {
            const d = new Date(); d.setMonth(d.getMonth() - 6); start = d.toISOString().split('T')[0]; final = azi;
        } else if (val === '1an') {
            const d = new Date(); d.setFullYear(d.getFullYear() - 1); start = d.toISOString().split('T')[0]; final = azi;
        }

        updateFilters({ perioadaEmitere: val, dataStartEmitere: start, dataFinalEmitere: final });
    };

    const handlePerioadaScadentaChange = (e) => {
        const val = e.target.value;
        const azi = new Date().toISOString().split('T')[0];
        let start = '', final = '';

        if (val === 'custom') { setShowModalScadenta(true); return; }

        if (['1luna', '6luni', '1an'].includes(val)) {
            final = azi;
            const d = new Date();
            if (val === '1luna') d.setMonth(d.getMonth() - 1);
            else if (val === '6luni') d.setMonth(d.getMonth() - 6);
            else if (val === '1an') d.setFullYear(d.getFullYear() - 1);
            start = d.toISOString().split('T')[0];
        } else if (val.startsWith('next')) {
            start = azi;
            const d = new Date();
            if (val === 'next_luna') d.setMonth(d.getMonth() + 1);
            else if (val === 'next_6luni') d.setMonth(d.getMonth() + 6);
            else if (val === 'next_1an') d.setFullYear(d.getFullYear() + 1);
            final = d.toISOString().split('T')[0];
        }

        updateFilters({ perioadaScadenta: val, dataStartScadenta: start, dataFinalScadenta: final });
    };

    if (!partener) return <div className="text-center mt-5">Se încarcă datele...</div>;

    const optiuniStatus = () => {
        if (partener.tip_partener === 'client') return (
            <>
                <option value="emisă">Emisă</option>
                <option value="încasată">Încasată</option>
            </>
        );
        if (partener.tip_partener === 'furnizor') return (
            <>
                <option value="primită">Primită</option>
                <option value="plătită">Plătită</option>
            </>
        );
        return (
            <>
                <option value="emisă">Emisă</option>
                <option value="primită">Primită</option>
                <option value="plătită">Plătită</option>
                <option value="încasată">Încasată</option>
            </>
        );
    };

    return (
        <div className="container-fluid">
            <button className="btn btn-outline-secondary mb-3" onClick={() => navigate('/parteneri')}>Înapoi la parteneri</button>

            {/* date despre partener */}
            <div className="card shadow-sm mb-4 border-primary">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <h4 className="mb-0">{partener.nume}</h4>
                    <span className="badge bg-light text-dark text-uppercase py-2 px-3" style={{ lineHeight: '1.2' }}>
                        {partener.tip_partener}
                    </span>
                </div>
                <div className="card-body">
                    <div className="row">
                        <div className="col-md-3"><strong>Nume:</strong> {partener.nume}</div>
                        <div className="col-md-3"><strong>CUI:</strong> {partener.cui}</div>
                        <div className="col-md-3"><strong>Nr. Registrul Comerțului:</strong> {partener.nr_reg_comert}</div>
                        <div className="col-md-3"><strong>Telefon:</strong> {partener.telefon}</div>
                        <div className="col-md-3"><strong>Email:</strong> {partener.email}</div>
                    </div>
                    <div className="row mt-2">
                        <div className="col-md-6"><strong>Adresă:</strong> {partener.adresa}</div>
                        <div className="col-md-6"><strong>IBAN:</strong> {partener.iban}</div>
                    </div>
                </div>
            </div>

            {/* filtre */}
            <div className="app-filter-card">
                <div className="row g-2 align-items-end">
                    <div className="col-md-2 position-relative">
                        <label className="form-label small fw-bold">Nr. factură</label>
                        <input className="form-control pe-4" value={cautare} onChange={e => updateFilters({ cautare: e.target.value })} placeholder="Ex: F100" />
                        {cautare && (
                            <button
                                className="btn btn-link position-absolute end-0 text-secondary p-0 me-2"
                                onClick={() => updateFilters({ cautare: '' })}
                                style={{ top: '70%', transform: 'translateY(-50%)', textDecoration: 'none', fontSize: '1.2rem' }}
                            >
                                &times;
                            </button>
                        )}
                    </div>

                    {partener.tip_partener === 'ambele' && (
                        <div className="col-md-2">
                            <label className="form-label small fw-bold">Tip factură</label>
                            <select className="form-select" value={tip} onChange={e => updateFilters({ tip: e.target.value })}>
                                <option value="">Toate</option>
                                <option value="emisă">Emise</option>
                                <option value="primită">Primite</option>
                            </select>
                        </div>
                    )}

                    <div className="col-md-2">
                        <label className="form-label small fw-bold">Conținut</label>
                        <select className="form-select" value={tipProduse} onChange={e => updateFilters({ tipProduse: e.target.value })}>
                            <option value="">Toate</option>
                            <option value="marfă">Mărfuri</option>
                            <option value="mijloc fix">Mijloace fixe</option>
                            <option value="obiecte inventar">Obiecte de inventar</option>
                            <option value="servicii">Servicii</option>
                        </select>
                    </div>

                    <div className="col-md-2">
                        <label className="form-label small fw-bold">Status</label>
                        <select className="form-select" value={status} onChange={e => updateFilters({ status: e.target.value })}>
                            <option value="">Toate</option>
                            {optiuniStatus()}
                        </select>
                    </div>

                    <div className="col-md-2">
                        <label className="form-label small fw-bold">Data emiterii</label>
                        <select className="form-select" value={perioadaEmitere} onChange={handlePerioadaEmitereChange}>
                            <option value="all">Toată perioada</option>
                            <option value="1luna">Ultima lună</option>
                            <option value="6luni">Ultimele 6 luni</option>
                            <option value="1an">Ultimul an</option>
                            <option value="custom">Alege data</option>
                        </select>
                    </div>

                    <div className="col-md-2">
                        <label className="form-label small fw-bold">Data scadenței</label>
                        <select className="form-select" value={perioadaScadenta} onChange={handlePerioadaScadentaChange}>
                            <option value="all">Toată perioada</option>
                            <option value="1luna">Ultima lună</option>
                            <option value="6luni">Ultimele 6 luni</option>
                            <option value="1an">Ultimul an</option>
                            <option value="next_luna">Următoarea lună</option>
                            <option value="next_6luni">Următoarele 6 luni</option>
                            <option value="next_1an">Următorul an</option>
                            <option value="custom">Alege data</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* modal filtru data */}
            <Modal show={showModalEmitere} onHide={() => setShowModalEmitere(false)} centered>
                <Modal.Header closeButton><Modal.Title>Alege perioada</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form.Control type="date" value={dataStartEmitere} onChange={e => updateFilters({ dataStartEmitere: e.target.value })} className="mb-2" />
                    <Form.Control type="date" value={dataFinalEmitere} onChange={e => updateFilters({ dataFinalEmitere: e.target.value })} />
                </Modal.Body>
                <Modal.Footer><Button onClick={() => setShowModalEmitere(false)}>Aplică</Button></Modal.Footer>
            </Modal>

            <Modal show={showModalScadenta} onHide={() => setShowModalScadenta(false)} centered>
                <Modal.Header closeButton><Modal.Title>Alege perioada scadență</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form.Control type="date" value={dataStartScadenta} onChange={e => updateFilters({ dataStartScadenta: e.target.value })} className="mb-2" />
                    <Form.Control type="date" value={dataFinalScadenta} onChange={e => updateFilters({ dataFinalScadenta: e.target.value })} />
                </Modal.Body>
                <Modal.Footer><Button onClick={() => setShowModalScadenta(false)}>Aplică</Button></Modal.Footer>
            </Modal>

            {/* tabel facturi */}
            <div className="table-responsive shadow-sm bg-white">
                <table className="table table-hover table-bordered align-middle text-center">
                    <thead className="">
                        <tr>
                            <th>Nr.</th>
                            <th>Tip</th>
                            <th>Conținut</th>
                            <th>Emitere</th>
                            <th>Scadență</th>
                            <th>Total net</th>
                            <th>TVA</th>
                            <th>Total brut</th>
                            <th>Status</th>
                            <th>Acțiuni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {facturi.length > 0 ? facturi.map(f => (
                            <tr key={f.id}>
                                <td className="fw-bold">{f.numar}</td>
                                <td>{f.tip === 'emisă' ? 'Emisă' : 'Primită'}</td>
                                <td className="text-capitalize text-secondary">{f.tip_produse || 'marfă'}</td>
                                <td>{new Date(f.data_emitere).toLocaleDateString('ro-RO')}</td>
                                <td>{new Date(f.data_scadenta).toLocaleDateString('ro-RO')}</td>
                                <td>{parseFloat(f.total_net).toFixed(2)}</td>
                                <td>{parseFloat(f.suma_tva).toFixed(2)}</td>
                                <td className="fw-bold">{parseFloat(f.total_brut).toFixed(2)}</td>
                                <td>
                                    <span className={`badge ${['plătită', 'încasată'].includes(f.status) ? 'bg-success' : 'bg-danger'}`}>
                                        {f.status.toUpperCase()}
                                    </span>
                                </td>
                                <td>
                                    <div className="d-flex justify-content-center gap-1">
                                        <button
                                        className="btn btn-sm btn-outline-info"
                                        onClick={() => navigate(`/facturi/detalii/${f.id}`, {
                                            state: { from: location.pathname }
                                        })}
                                    >
                                        Detalii
                                    </button>

                                        {/* buton pt plata facturilor cu status primita */}
                                        {f.status === 'primită' && (
                                            <button className="btn btn-sm btn-success" onClick={() => {
                                                navigate('/plata-factura', {
                                                    state: { facturaId: f.id, nrFactura: f.numar, totalBrut: f.total_brut, partenerNume: partener.nume }
                                                });
                                            }}>
                                                Plătește
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="10" className="py-3">Nu s-au găsit facturi.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

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
export default FacturiPartener;