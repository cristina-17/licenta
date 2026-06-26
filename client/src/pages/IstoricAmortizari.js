import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';

function IstoricAmortizari() {
    const navigate = useNavigate();
    const token = sessionStorage.getItem('token');
    const [searchParams, setSearchParams] = useSearchParams();
    const [amortizari, setAmortizari] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(0);
    const [showModal, setShowModal] = useState(false);

    // citire filtre pt perioada din url
    const page = parseInt(searchParams.get('page') || '1');
    const cautare = searchParams.get('cautare') || '';
    const perioadaSelectata = searchParams.get('perioadaSelectata') || 'all';
    const dataStart = searchParams.get('dataStart') || '';
    const dataFinal = searchParams.get('dataFinal') || '';

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

    const handlePerioadaChange = (e) => {
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
            setShowModal(true);
            updateFilters({ perioadaSelectata: 'custom' });
        } else {
            updateFilters({ perioadaSelectata: val, dataStart: start, dataFinal: final });
        }
    };

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const params = {
                page,
                limit: 20,
                cautare,
                data_start: dataStart,
                data_final: dataFinal
            };
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/mijloace-fixe/istoric-global`, {
                headers: { Authorization: `Bearer ${token}` },
                params
            });
            setAmortizari(res.data.data);
            setTotalPages(res.data.total ? Math.ceil(res.data.total / 20) : 1);
            setLoading(false);
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    }, [token, page, cautare, dataStart, dataFinal]);

    useEffect(() => {
        if (perioadaSelectata !== 'custom' || !showModal) {
            fetchData();
        }
    }, [fetchData, perioadaSelectata, showModal]);

    const saveCustomDates = () => {
        if (!dataStart || !dataFinal) {
            alert("Alege ambele date!");
            return;
        }
        setShowModal(false);
        fetchData();
    };

    return (
        <div className="container-fluid">
            {/* modal pt selectare perioada */}
            {showModal && (
                <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Alege perioada</h5>
                            </div>
                            <div className="modal-body">
                                <label>De la:</label>
                                <input type="date" className="form-control mb-2" value={dataStart} onChange={e => updateFilters({ dataStart: e.target.value })} />
                                <label>Până la:</label>
                                <input type="date" className="form-control" value={dataFinal} onChange={e => updateFilters({ dataFinal: e.target.value })} />
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => {setShowModal(false); updateFilters({ perioadaSelectata: 'all', dataStart: '', dataFinal: '' }); }}>Renunță</button>
                                <button className="btn btn-primary" onClick={saveCustomDates}>Aplică</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Istoric amortizări</h2>
                <button className="btn btn-outline-primary" onClick={() => navigate('/mijloace-fixe')}>Mijloace fixe</button>
            </div>

            <div className="app-filter-card">
                <div className="row g-3">
                    <div className="col-md-6">
                        <input className="form-control" placeholder="Caută mijloc fix (denumire/nr. inventar)..."
                            value={cautare} onChange={e => updateFilters({ cautare: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                        <select className="form-select" value={perioadaSelectata} onChange={handlePerioadaChange}>
                            <option value="all">Toată perioada</option>
                            <option value="1luna">Ultima lună</option>
                            <option value="6luni">Ultimele 6 luni</option>
                            <option value="1an">Ultimul an</option>
                            <option value="custom">Alege perioada</option>
                        </select>
                    </div>
                </div>
                {(dataStart && dataFinal) && (
                    <div className="mt-2 text-muted small">
                        Filtru curent: {new Date(dataStart).toLocaleDateString()} - {new Date(dataFinal).toLocaleDateString()}
                    </div>
                )}
            </div>

            <div className="table-responsive">
                <table className="table">
                    <thead className="">
                        <tr>
                            <th>Mijloc fix</th>
                            <th>Nr. inventar</th>
                            <th>Luna/An</th>
                            <th>Sumă amortizată</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan="4" className="text-center">Se încarcă...</td></tr> :
                        amortizari.length === 0 ? <tr><td colSpan="4" className="text-center">Nu există date.</td></tr> :
                        amortizari.map((a, idx) => (
                            <tr key={idx}>
                                <td className="fw-bold text-primary">{a.denumire}</td>
                                <td>{a.nr_inventar}</td>
                                <td>{new Date(a.luna_an).toLocaleDateString('ro-RO')}</td>
                                <td className="fw-bold">{a.valoare_amortizare} RON</td>
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

export default IstoricAmortizari;