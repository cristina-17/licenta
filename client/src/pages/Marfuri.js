import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Modal, Button, Form } from 'react-bootstrap';

function Marfuri() {
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const token = sessionStorage.getItem('token');
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');

    const [marfuri, setMarfuri] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(0);

    const [showCMPAlert, setShowCMPAlert] = useState(false);
    const [marfuriAfectate, setMarfuriAfectate] = useState([]);
    const [showSubModal, setShowSubModal] = useState(false);
    const [marfaDeEditat, setMarfaDeEditat] = useState(null);
    const [noulPretVanzare, setNoulPretVanzare] = useState('');

    // citire filtre din url
    const page = parseInt(searchParams.get('page') || '1');
    const cautare = searchParams.get('cautare') || '';
    const categorie = searchParams.get('categorie') || '';
    const cotaTva = searchParams.get('cotaTva') || '';
    const sortStoc = searchParams.get('sortStoc') || '';
    const profitabilitate = searchParams.get('profitabilitate') || '';

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
        if (location.state?.filterPierdere && profitabilitate !== 'pierdere') {
            updateFilters({ profitabilitate: 'pierdere' });
        }
        verificareProfitabilitate();
    }, [location.state, profitabilitate, updateFilters]);

    const verificareProfitabilitate = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/marfuri/verificare-cmp`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.length > 0) {
                setMarfuriAfectate(res.data);
                setShowCMPAlert(true);
            }
        } catch (e) {
            console.error("Eroare la verificarea profitabilității");
        }
    };

    const fetchMarfuri = useCallback(async () => {
        try {
            setLoading(true);
            const params = {
                page,
                limit: 10,
                cautare,
                categorie,
                cota_tva: cotaTva,
                sort_stoc: sortStoc,
                profitabilitate
            };

            const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/marfuri`, {
                headers: { Authorization: `Bearer ${token}` },
                params
            });

            setMarfuri(response.data.data);
            setTotalPages(response.data.totalPages);
            setLoading(false);
        } catch (error) {
            console.error("Eroare la preluarea mărfurilor:", error);
            setLoading(false);
        }
    }, [token, page, cautare, categorie, cotaTva, sortStoc, profitabilitate]);

    useEffect(() => {
        fetchMarfuri();
    }, [fetchMarfuri]);

    const handleSaveNewPrice = async () => {
        const pret = parseFloat(noulPretVanzare);
        if (isNaN(pret) || pret <= parseFloat(marfaDeEditat.cmp)) {
            return alert(`Prețul trebuie să fie mai mare decât CMP!`);
        }
        try {
            await axios.put(`${process.env.REACT_APP_API_URL}/api/marfuri/${marfaDeEditat.id}`,
                { pret_curent: pret },
                { headers: { Authorization: `Bearer ${token}` }}
            );
            setShowSubModal(false);
            fetchMarfuri();
        } catch (e) {
            alert("Eroare la actualizarea prețului.");
        }
    };

    const handleDelete = async (id) => {
        if(!window.confirm("Sigur vrei să ștergi această marfă?")) return;
        try {
            await axios.delete(`${process.env.REACT_APP_API_URL}/api/marfuri/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchMarfuri();
        } catch (error) {
            alert(error.response?.data?.message || "Eroare la ștergere");
        }
    };

    return (
        <div className="container-fluid">
            {/* modal cu lista marfuri care au pret_unitar_vanzare<cmp */}
            <Modal show={showCMPAlert} onHide={() => setShowCMPAlert(false)} backdrop="static" keyboard={false} centered size="lg">
                <Modal.Header className="bg-danger text-white">
                    <Modal.Title><i className="bi bi-exclamation-triangle-fill me-2"></i>Mărfuri cu preț de vânzare prea mic</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {marfuriAfectate.length > 0 ? (
                        <>
                            <p className="fw-bold">Următoarele mărfuri au prețul de vânzare mai mic decât CMP:</p>
                            <div className="list-group">
                                {marfuriAfectate.map(m => (
                                    <div key={m.id} className="list-group-item d-flex justify-content-between align-items-center">
                                        <div>
                                            <span className="fw-bold">{m.denumire}</span><br/>
                                            <small className="text-danger">Vânzare: {m.pret_curent} RON | CMP: {parseFloat(m.cmp).toFixed(4)} RON</small>
                                        </div>
                                        <Button variant="outline-primary" size="sm" onClick={() => { setMarfaDeEditat(m); setShowSubModal(true); }}>Schimbă preț de vânzare</Button>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-3">
                            <i className="bi bi-check-circle text-success fs-1"></i>
                            <p className="mt-2 fs-5">Nu mai există mărfuri cu prețul de vânzare mai mic decât CMP.</p>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowCMPAlert(false)}>Închidere</Button>
                </Modal.Footer>
            </Modal>

            {/* submodal pentru introducere pret nou */}
            <Modal show={showSubModal} onHide={() => setShowSubModal(false)} centered size="sm">
                <Modal.Header closeButton>
                    <Modal.Title className="fs-5">Preț Nou: {marfaDeEditat?.denumire}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Noul preț de vânzare:</Form.Label>
                        <Form.Control type="number" value={noulPretVanzare} onChange={(e) => setNoulPretVanzare(e.target.value)} />
                        <Form.Text className="text-muted text-danger fw-bold">Trebuie să fie {'>'} {parseFloat(marfaDeEditat?.cmp || 0).toFixed(2)} RON</Form.Text>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" size="sm" onClick={() => setShowSubModal(false)}>Renunță</Button>
                    <Button variant="success" size="sm" onClick={handleSaveNewPrice}>Salvează</Button>
                </Modal.Footer>
            </Modal>

            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="text-primary fw-bold">Mărfuri</h2>
                <Link to="/marfuri/adaugare" className="btn btn-primary">
                    <i className="bi bi-plus-circle me-2"></i>Adăugare
                </Link>
            </div>
            <div className="card p-3 mb-4 shadow-sm">
                <div className="row g-3">
                    <div className="col-md-3">
                        <div className="position-relative">
                            <input type="text" className="form-control pe-5" placeholder="Caută denumire"
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
                        <div className="position-relative">
                            <input type="text" className="form-control pe-5" placeholder="Categorie"
                                value={categorie} onChange={e => updateFilters({ categorie: e.target.value })} />
                            {categorie && (
                                <button
                                    className="btn btn-link position-absolute end-0 text-secondary pe-2"
                                    onClick={() => updateFilters({ categorie: '' })}
                                    style={{ textDecoration: 'none', fontSize: '1.2rem', top: '50%', transform: 'translateY(-50%)' }}
                                >
                                    &times;
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="col-md-2">
                        <select className="form-select" value={cotaTva} onChange={e => updateFilters({ cotaTva: e.target.value })}>
                            <option value="">Toate TVA</option>
                            <option value="21">TVA 21%</option>
                            <option value="11">TVA 11%</option>
                            <option value="0">TVA 0%</option>
                        </select>
                    </div>
                    <div className="col-md-2">
                        <select className="form-select" value={profitabilitate} onChange={e => updateFilters({ profitabilitate: e.target.value })}>
                            <option value="">Preț de vânzare...</option>
                            <option value="">Toate mărfurile</option>
                            <option value="pierdere">Vânzare în pierdere</option>
                        </select>
                    </div>
                    <div className="col-md-2">
                            <select className="form-select" value={sortStoc} onChange={e => updateFilters({ sortStoc: e.target.value })}>
                                <option value="">Stoc (Implicit)</option>
                            <option value="asc">Stoc crescător</option>
                            <option value="desc">Stoc descrescător</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="table-responsive">
                <table className="table">
                    <thead className="">
                        <tr><th>Denumire</th><th>Categorie</th><th>UM</th><th>TVA</th><th>Preț Curent</th><th>CMP</th><th>Stoc</th><th>Acțiuni</th></tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan="8" className="text-center">Se încarcă...</td></tr> :
                        marfuri.length === 0 ? <tr><td colSpan="8" className="text-center">Nu există mărfuri.</td></tr> :
                        marfuri.map(m => (
                            <tr key={m.id} className={parseFloat(m.cmp) > parseFloat(m.pret_curent) ? 'table-danger' : ''}>
                            <td>{m.denumire}</td>
                                <td>{m.categorie}</td>
                                <td>{m.um}</td>
                                <td>{m.cota_tva}%</td>
                                <td className="fw-bold">{m.pret_curent} RON</td>
                                <td className="text-muted">{parseFloat(m.cmp || 0).toFixed(2)} RON</td>
                                <td className="fw-bold text-dark">{parseFloat(m.stoc_curent || 0).toFixed(2)} {m.um}</td>
                                <td>
                                    <div className="btn-group btn-group-sm">
                                        <Link to={`/marfuri/detalii/${m.id}`} className="btn btn-outline-primary" title="Detalii">Detalii</Link>
                                        <Link to={`/marfuri/editare/${m.id}`} className="btn btn-outline-warning" title="Editare">Editează</Link>
                                        {user.rol === 'admin' && (
                                            <button onClick={() => handleDelete(m.id)} className="btn btn-outline-danger" title="Ștergere">Șterge</button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            { /* paginare */}
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

export default Marfuri;