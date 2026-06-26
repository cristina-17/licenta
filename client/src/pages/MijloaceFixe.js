import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';

function MijloaceFixe() {
    const [searchParams, setSearchParams] = useSearchParams();
    const token = sessionStorage.getItem('token');

    const [mijloace, setMijloace] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(0);

    // citire filtre din URL
    const page = parseInt(searchParams.get('page') || '1');
    const cautare = searchParams.get('cautare') || '';
    const status = searchParams.get('status') || '';
    const tipAmortizare = searchParams.get('tipAmortizare') || '';
    const sortField = searchParams.get('sortField') || '';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

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

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const params = {
                page,
                limit: 10,
                cautare,
                status,
                tip_amortizare: tipAmortizare,
                sort_field: sortField,
                sort_order: sortOrder
            };

            const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/mijloace-fixe`, {
                headers: { Authorization: `Bearer ${token}` },
                params
            });

            setMijloace(res.data.data);
            setTotalPages(res.data.totalPages);
            setLoading(false);
        } catch (error) {
            console.error("Eroare la preluare date:", error);
            setLoading(false);
        }
    }, [token, page, cautare, status, tipAmortizare, sortField, sortOrder]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSort = (field) => {
        const isAsc = sortField === field && sortOrder === 'asc';
        updateFilters({
            sortField: field,
            sortOrder: isAsc ? 'desc' : 'asc'
        });
    };

    const handleCasare = async (id) => {
        if (!window.confirm("Sigur dorești să casezi acest mijloc fix?")) return;
        try {
            await axios.put(`${process.env.REACT_APP_API_URL}/api/mijloace-fixe/${id}/casare`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Mijloc fix casat cu succes!");
            fetchData();
        } catch (e) {
            alert(e.response?.data?.message || "Eroare la casare.");
        }
    };

    return (
        <div className="container-fluid">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Mijloace fixe</h2>
                <Link to="/mijloace-fixe/adaugare" className="btn btn-success">
                    <i className="bi bi-plus-circle me-2"></i>Adaugă mijloc fix
                </Link>
            </div>

            <div className="app-filter-card">
                <div className="row g-3">
                    <div className="col-md-4">
                        <div className="position-relative">
                            <input className="form-control pe-5" placeholder="Caută după denumire sau nr. inventar..."
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
                        <select className="form-select" value={status} onChange={e => updateFilters({ status: e.target.value })}>
                            <option value="">Toate statusurile</option>
                            <option value="activ">Active</option>
                            <option value="casat">Casate</option>
                        </select>
                    </div>
                    <div className="col-md-3">
                        <select className="form-select" value={tipAmortizare} onChange={e => updateFilters({ tipAmortizare: e.target.value })}>
                            <option value="">Toate tipurile</option>
                            <option value="liniară">Liniară</option>
                            <option value="accelerată">Accelerată</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="table-responsive">
                <table className="table">
                    <thead className="">
                        <tr>
                            <th>Denumire</th>
                            <th>Nr. inventar</th>
                            <th style={{cursor:'pointer'}} onClick={() => handleSort('valoare_intrare')}>
                                Val. intrare {sortField === 'valoare_intrare' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </th>
                            <th style={{cursor:'pointer'}} onClick={() => handleSort('valoare_actuala')}>
                                Val. actuală {sortField === 'valoare_actuala' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </th>
                            <th>Durată de viață (luni)</th>
                            <th>Status</th>
                            <th>Acțiuni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="7" className="text-center p-4">Se încarcă...</td></tr>
                        ) : mijloace.length === 0 ? (
                            <tr><td colSpan="7" className="text-center p-4">Nu au fost găsite înregistrări.</td></tr>
                        ) : (
                            mijloace.map(m => (
                                <tr key={m.id} className={m.status === 'casat' ? 'table-danger' : ''}>
                                    <td className="fw-bold">{m.denumire}</td>
                                    <td>{m.nr_inventar}</td>
                                    <td>{m.valoare_intrare} RON</td>
                                    <td className="text-primary fw-bold">{m.valoare_actuala} RON</td>
                                    <td>{m.durata_viata_luni}</td>
                                    <td>
                                        <span className={`badge ${m.status === 'activ' ? 'bg-success' : m.status === 'inactiv' ? 'bg-secondary' : 'bg-danger'}`}>
                                            {m.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="btn-group btn-group-sm">
                                            <Link to={`/mijloace-fixe/detalii/${m.id}`} className="btn btn-outline-primary" title="Detalii">
                                                Detalii
                                            </Link>
                                            <Link to={`/mijloace-fixe/editare/${m.id}`} className="btn btn-outline-warning" title="Editare">
                                                Editare
                                            </Link>
                                            {m.status !== 'casat' && (
                                                <button onClick={() => handleCasare(m.id)} className="btn btn-outline-danger" title="Casare">
                                                    Casare
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
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

export default MijloaceFixe;