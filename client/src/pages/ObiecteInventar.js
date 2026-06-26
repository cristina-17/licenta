import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';

function ObiecteInventar() {
    const [searchParams, setSearchParams] = useSearchParams();
    const token = sessionStorage.getItem('token');

    const [obiecte, setObiecte] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(0);

    // citire filtre din url
    const page = parseInt(searchParams.get('page') || '1');
    const cautare = searchParams.get('cautare') || '';
    const cotaTva = searchParams.get('cotaTva') || '';
    const sortStoc = searchParams.get('sortStoc') || '';

    const user = JSON.parse(sessionStorage.getItem('user') || '{}');

    // actualizarea filtre
    const updateFilters = useCallback((newFilters) => {
        const params = new URLSearchParams(searchParams);
        Object.entries(newFilters).forEach(([key, value]) => {
            if (value) params.set(key, value);
            else params.delete(key);
        });
        if (newFilters.page === undefined) params.set('page', '1');
        setSearchParams(params);
    }, [searchParams, setSearchParams]);

    const fetchObiecte = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/obiecte-inventar`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { page, limit: 10, cautare, cota_tva: cotaTva, sort_stoc: sortStoc }
            });
            setObiecte(response.data.data);
            setTotalPages(response.data.totalPages);
            setLoading(false);
        } catch (error) {
            console.error("Eroare la preluare obiecte:", error);
            setLoading(false);
        }
    }, [token, page, cautare, cotaTva, sortStoc]);

    useEffect(() => {
        fetchObiecte();
    }, [fetchObiecte]);


    const handleDelete = async (id) => {
        if(!window.confirm("Sigur vrei să ștergi acest obiect?")) return;
        try {
            await axios.delete(`${process.env.REACT_APP_API_URL}/api/obiecte-inventar/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchObiecte();
        } catch (error) {
            alert("Eroare la ștergere.");
        }
    };

    return (
        <div className="container-fluid">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="text-primary fw-bold">Obiecte de inventar</h2>
                <Link to="/obiecte-inventar/adaugare" className="btn btn-success">
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
                    <div className="col-md-2">
                        <select className="form-select" value={cotaTva} onChange={e => updateFilters({ cotaTva: e.target.value })}>
                            <option value="">Toate TVA</option>
                            <option value="21">TVA 21%</option>
                            <option value="11">TVA 11%</option>
                            <option value="0">TVA 0%</option>
                        </select>
                    </div>
                    <div className="col-md-3">
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
                        <tr>
                            <th>Denumire</th>
                            <th>UM</th>
                            <th>TVA</th>
                            <th>Stoc</th>
                            <th>Acțiuni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan="5" className="text-center">Se încarcă...</td></tr> :
                         obiecte.length === 0 ? <tr><td colSpan="5" className="text-center">Nu există obiecte.</td></tr> :
                         obiecte.map(o => (
                            <tr key={o.id}>
                                <td className="fw-bold">{o.denumire}</td>
                                <td>{o.um}</td>
                                <td>{o.cota_tva}%</td>
                                <td className="fw-bold">{o.stoc_curent}</td>
                                <td>
                                    <div className="btn-group btn-group-sm">
                                        <Link to={`/obiecte-inventar/detalii/${o.id}`} className="btn btn-outline-primary" title="Detalii">Detalii</Link>
                                        <Link to={`/obiecte-inventar/editare/${o.id}`} className="btn btn-outline-warning" title="Editare">Editare</Link>
                                        {user.rol === 'admin' && (
                                            <button onClick={() => handleDelete(o.id)} className="btn btn-outline-danger" title="Ștergere">Șterge</button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
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

export default ObiecteInventar;