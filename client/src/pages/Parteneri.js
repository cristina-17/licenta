import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';

function Parteneri() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const token = sessionStorage.getItem('token');
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const isAdmin = user && user.rol === 'admin';

    const [parteneri, setParteneri] = useState([]);
    const [totalPages, setTotalPages] = useState(0);

    // citire filtre din URL
    const page = parseInt(searchParams.get('page') || '1');
    const cautare = searchParams.get('cautare') || '';
    const filtruTip = searchParams.get('tip') || '';

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

    const incarcaParteneri = useCallback(async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/parteneri`, {
                params: {
                    cautare: cautare,
                    tip: filtruTip,
                    page: page,
                    limit: 10
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            setParteneri(res.data.parteneri);
            setTotalPages(res.data.totalPages);
        } catch (err) {
            console.error(err);
        }
    }, [token, cautare, filtruTip, page]);

    useEffect(() => {
        incarcaParteneri();
    }, [incarcaParteneri]);


    const handleDelete = async (id) => {
        if(!window.confirm("Sigur ștergi acest partener?")) return;
        try {
            await axios.delete(`${process.env.REACT_APP_API_URL}/api/parteneri/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            incarcaParteneri(page);
        } catch (err) { alert("Nu se poate șterge (are facturi?)"); }
    };

    return (
        <div className="container-fluid">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Parteneri {filtruTip ? `(${filtruTip}i)` : ''}</h2>
                <div className="d-flex gap-2">
                    {isAdmin && (
                        <Link to="/parteneri/adaugare" className="btn btn-primary">
                            <i className="bi bi-plus-circle me-2"></i>Adăugare
                        </Link>
                    )}
                </div>
            </div>

            <div className="app-filter-card">
                <div className="row g-3 align-items-center">
                    <div className="col-md-4">
                        <div className="position-relative">
                            <input type="text" className="form-control pe-5" placeholder="Caută nume sau CUI"
                                   value={cautare} onChange={e => updateFilters({ cautare: e.target.value })}
                            />
                            {cautare && (
                                <button
                                    className="btn btn-link position-absolute end-0 text-secondary p-0 me-2"
                                    onClick={() => updateFilters({ cautare: '' })}
                                    style={{
                                        textDecoration: 'none',
                                        fontSize: '1.2rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        zIndex: 4
                                    }}
                                >
                                    &times;
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="col-md-3">
                        <select className="form-select" value={filtruTip} onChange={e => updateFilters({ tip: e.target.value })}>
                            <option value="">Toți partenerii</option>
                            <option value="client">Clienți</option>
                            <option value="furnizor">Furnizori</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="table-responsive">
                <table className="table">
                    <thead className="table-dark text-center">
                        <tr>
                            <th>Nume</th>
                            <th>CUI</th>
                            <th>Nr. Registrul Comerțului</th>
                            <th>Adresa</th>
                            {!filtruTip && <th>Tip</th>}
                            <th>IBAN</th>
                            <th>Banca</th>
                            <th>Email</th>
                            <th>Telefon</th>
                            <th>Acțiuni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {parteneri.length > 0 ? parteneri.map(p => (
                            <tr key={p.id} className="text-center">
                                <td className="fw-bold">{p.nume}</td>
                                <td>{p.cui}</td>
                                <td>{p.nr_reg_comert}</td>
                                <td><small>{p.adresa}</small></td>
                                {!filtruTip && (
                                    <td>
                                        {p.tip_partener === 'ambele' ? (
                                            <span className="badge bg-success">Client și Furnizor</span>
                                        ) : (
                                            <span className={`badge ${p.tip_partener === 'client' ? 'bg-info' : 'bg-warning'}`}>
                                                {p.tip_partener === 'client' ? 'Client' : 'Furnizor'}
                                            </span>
                                        )}
                                    </td>
                                )}
                                <td className="font-monospace"><small>{p.iban}</small></td>
                                <td><small>{p.banca}</small></td>
                                <td><small>{p.email}</small></td>
                                <td><small>{p.telefon}</small></td>
                                <td>
                                    <div className="btn-group btn-group-sm">
                                        <button className="btn btn-outline-primary" onClick={() => navigate(`/parteneri/facturi/${p.id}`, { state: { from: '/parteneri' } })}>Facturi</button>
                                        {isAdmin && (
                                            <>
                                                <Link to={`/parteneri/editare/${p.id}`} className="btn btn-outline-warning">Editează</Link>
                                                <button className="btn btn-outline-danger" onClick={() => handleDelete(p.id)}>Șterge</button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={!filtruTip ? "10" : "9"} className="text-center py-3">Nu există date.</td></tr>
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

export default Parteneri;