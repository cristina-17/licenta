import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Modal, Button, Form } from 'react-bootstrap';

function CalendarFacturi() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const token = sessionStorage.getItem('token');

    const [facturi, setFacturi] = useState([]);
    const [loading, setLoading] = useState(true);

    // citire filtre din url
    const viewMode = searchParams.get('view') || 'calendar';
    const dateFromUrl = searchParams.get('date');
    const selectedDate = dateFromUrl ? new Date(dateFromUrl) : new Date(); // selectarea zilei pt vizualizarea tip lista

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showDueModal, setShowDueModal] = useState(false);
    const [dueInvoicesCount, setDueInvoicesCount] = useState(0);
    const [showDateFilterModal, setShowDateFilterModal] = useState(false);
    const [tempDate, setTempDate] = useState('');

    // actualizare filtre
    const updateCalendarParams = (updates) => {
        const params = new URLSearchParams(searchParams);
        Object.entries(updates).forEach(([key, value]) => {
            if (value) params.set(key, value);
            else params.delete(key);
        });
        setSearchParams(params);
    };

    const fetchToateFacturile = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/facturi`, {
                params: { limit: 1000 },
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = res.data.data || [];
            setFacturi(data);

            // verificare dacturi scadente in urmatoarele 30 zile
            const azi = new Date();
            azi.setHours(0, 0, 0, 0);
            const peste30Zile = new Date(azi);
            peste30Zile.setDate(azi.getDate() + 30);

            const facturiScadente = data.filter(f => {
                if (f.status !== 'primită') return false;
                const dataScadenta = new Date(f.data_scadenta);
                dataScadenta.setHours(0, 0, 0, 0);
                return dataScadenta >= azi && dataScadenta <= peste30Zile;
            });

            if (facturiScadente.length > 0) {
                setDueInvoicesCount(facturiScadente.length);
                if (facturiScadente.length > 0 && !location.state) setShowDueModal(true);
            }
        } catch (err) {
            console.error("Eroare la preluare facturi:", err);
        }
        setLoading(false);
    }, [token, location.state]);

    useEffect(() => {
        fetchToateFacturile();
    }, [fetchToateFacturile]);

    // aspect calendar
    const getZileInLuna = (an, luna) => new Date(an, luna + 1, 0).getDate();
    const getPrimaZiALunii = (an, luna) => {
        let zi = new Date(an, luna, 1).getDay();
        // duminica = pozitia 0, luni = pozitia 1, ..., sambata = pozitia 6
        // daca zi este duminica => plaseaza pe pozitia 6 in calendar, altfel scade 1 din pozitia corespunzatoare zilei
        // ex: pt luni (pozitia 1) plaseaza pe pozitia 1-1=0 => prima pozitie din saptamana in calendar
        return zi === 0 ? 6 : zi - 1;
    };

    const schimbaLuna = (directie) => {
        const nouaLuna = new Date(currentMonth);
        nouaLuna.setMonth(currentMonth.getMonth() + directie);
        setCurrentMonth(nouaLuna);
    };

    const handleSelectieZi = (zi) => {
        const dataSelectata = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), zi);
        // prima zi a saptamanii sa fie luni
        const anStr = dataSelectata.getFullYear();
        const lunaStr = String(dataSelectata.getMonth() + 1).padStart(2, '0');
        const ziStr = String(dataSelectata.getDate()).padStart(2, '0');
        const dataFormataLocal = `${anStr}-${lunaStr}-${ziStr}`;
        updateCalendarParams({ view: 'lista', date: dataFormataLocal });
    };

    const filtreazaFacturiPeZi = (dataExacta) => {
        return facturi.filter(f => {
            const scadenta = new Date(f.data_scadenta);
            return (
                scadenta.getFullYear() === dataExacta.getFullYear() &&
                scadenta.getMonth() === dataExacta.getMonth() &&
                scadenta.getDate() === dataExacta.getDate()
            );
        });
    };

    const handleSaveDateFilter = () => {
        if (tempDate) {
            const parsedDate = new Date(tempDate);
            updateCalendarParams({ view: 'lista', date: tempDate });
            setCurrentMonth(parsedDate);
            setShowDateFilterModal(false);
        }
    };

    const getBadgeClass = (status) => {
        const s = status.toLowerCase();
        if (['plătită', 'încasată'].includes(s)) return 'badge-finalizata';
        if (s === 'emisă') return 'badge-emisa';
        if (s === 'primită') return 'badge-primita';
        return 'bg-primary';
    };

    if (loading) return <div className="text-center mt-5">Se încarcă calendarul...</div>;

    const an = currentMonth.getFullYear();
    const luna = currentMonth.getMonth();
    const totalZile = getZileInLuna(an, luna);
    const spatiiGoale = getPrimaZiALunii(an, luna);
    const facturiPentruListaCurenta = filtreazaFacturiPeZi(selectedDate);
    const numeLuni = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];

    return (
        <div className="container-fluid">
            <h2 className="app-calendar-title"><i className="bi bi-calendar-check me-2"></i>Calendar facturi scadente</h2>

            {/* bara filtre */}
            <div className="app-filter-card">
                {/* mod vizualizare si buton cautare data */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <select
                        className="form-select w-auto"
                        value={viewMode}
                        onChange={(e) => updateCalendarParams({ view: e.target.value })}
                    >
                        <option value="calendar">Calendar</option>
                        <option value="lista">Listă detaliată</option>
                    </select>

                    <button className="btn btn-primary btn-sm" onClick={() => setShowDateFilterModal(true)}>
                        <i className="bi bi-search me-1"></i>Căutare dată
                    </button>
                </div>

                {/* navigare luna/zi */}
                <div className="d-flex justify-content-center align-items-center gap-3">
                    {viewMode === 'calendar' ? (
                        <>
                            <button className="btn btn-sm btn-nav-accent" onClick={() => schimbaLuna(-1)}>
                                « Luna anterioară
                            </button>
                            <h5 className="app-nav-date-text mb-0">{numeLuni[luna]} {an}</h5>
                            <button className="btn btn-sm btn-nav-accent" onClick={() => schimbaLuna(1)}>
                                Luna următoare »
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                className="btn btn-sm btn-nav-accent"
                                onClick={() => {
                                    const d = new Date(selectedDate);
                                    d.setDate(d.getDate() - 1);
                                    updateCalendarParams({ date: d.toISOString().split('T')[0] });
                                }}
                            >
                                « Ziua anterioară
                            </button>
                            <h5 className="app-nav-date-text mb-0">{selectedDate.toLocaleDateString('ro-RO')}</h5>
                            <button
                                className="btn btn-sm btn-nav-accent"
                                onClick={() => {
                                    const d = new Date(selectedDate);
                                    d.setDate(d.getDate() + 1);
                                    updateCalendarParams({ date: d.toISOString().split('T')[0] });
                                }}
                            >
                                Ziua următoare »
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* vizualizare calendar */}
            {viewMode === 'calendar' && (
                <div className="card shadow-sm border-0">
                    <div className="card-body p-0">
                        <div className="calendar-grid-header">
                            {['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'].map(zi => (
                                <div key={zi} className="p-2 border-end border-secondary">{zi}</div>
                            ))}
                        </div>
                        <div className="calendar-grid-body">
                            {Array.from({ length: spatiiGoale }).map((_, idx) => (
                                <div key={`empty-${idx}`} className="calendar-day-empty"></div>
                            ))}
                            {Array.from({ length: totalZile }).map((_, idx) => {
                                const zi = idx + 1;
                                const facturiZiuaCurenta = filtreazaFacturiPeZi(new Date(an, luna, zi));
                                return (
                                    <div key={`zi-${zi}`} className="calendar-day-cell" onClick={() => handleSelectieZi(zi)}>
                                        <div className="fw-bold text-end text-muted mb-1 small">{zi}</div>
                                        <div className="d-flex flex-column gap-1">
                                            {facturiZiuaCurenta.slice(0, 3).map(f => (
                                                <div key={f.id} className={`badge ${getBadgeClass(f.status)} text-truncate`} style={{ fontSize: '0.75rem' }}>
                                                    F: {f.numar}
                                                </div>
                                            ))}
                                            {facturiZiuaCurenta.length > 3 && (
                                                <div className="text-muted text-center fw-bold" style={{ fontSize: '0.65rem' }}>
                                                    + alte {facturiZiuaCurenta.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* vizualizare lista */}
            {viewMode === 'lista' && (
                <div className="card shadow border-0 overflow-hidden mt-3">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle text-center mb-0">
                            <thead className="">
                                <tr>
                                    <th>Nr. factură</th>
                                    <th>Partener</th>
                                    <th>Emitere</th>
                                    <th>Scadență</th>
                                    <th>Total brut</th>
                                    <th>Status</th>
                                    <th>Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {facturiPentruListaCurenta.length > 0 ? facturiPentruListaCurenta.map(f => (
                                    <tr key={f.id}>
                                        <td className="fw-bold">{f.numar}</td>
                                        <td>{f.partener_nume}</td>
                                        <td>{new Date(f.data_emitere).toLocaleDateString('ro-RO')}</td>
                                        <td className="fw-bold text-danger">{new Date(f.data_scadenta).toLocaleDateString('ro-RO')}</td>
                                        <td className="fw-bold">{parseFloat(f.total_brut).toFixed(2)} RON</td>
                                        <td><span className={`badge ${getBadgeClass(f.status)}`}>{f.status.toUpperCase()}</span></td>
                                        <td>
                                            <div className="d-flex justify-content-center gap-1">
                                                <button className="btn btn-sm btn-outline-info" onClick={() => navigate(`/facturi/detalii/${f.id}`, {
                                                        state: { from: '/calendar-facturi', viewMode: 'lista', selectedDate: selectedDate.toISOString() }
                                                    })}>Detalii</button>
                                                {f.status === 'primită' && (
                                                    <button className="btn btn-sm btn-success" onClick={() => {
                                                        navigate('/plata-factura', {
                                                            state: { facturaId: f.id, nrFactura: f.numar, totalBrut: f.total_brut, partenerNume: f.partener_nume }
                                                        });
                                                    }}>Plătește</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="7" className="py-4 text-muted">Nu există facturi scadente în această dată.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <Modal show={showDueModal} onHide={() => setShowDueModal(false)} centered backdrop="static">
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold"><i className="bi bi-exclamation-triangle-fill me-2 text-warning"></i>Facturi scadente!</Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center py-4">
                    <h5 className="mb-0">Există <strong className="text-danger fs-3">{dueInvoicesCount}</strong> facturi scadente în următoarele 30 de zile.</h5>
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button variant="dark" className="px-4" onClick={() => setShowDueModal(false)}>Am înțeles</Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showDateFilterModal} onHide={() => setShowDateFilterModal(false)} centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold">Caută după dată</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold small">Selectează o dată exactă:</Form.Label>
                        <Form.Control type="date" className="rounded-pill" value={tempDate} onChange={(e) => setTempDate(e.target.value)} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button variant="secondary" onClick={() => setShowDateFilterModal(false)}>Renunță</Button>
                    <Button variant="success" onClick={handleSaveDateFilter}>Caută</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default CalendarFacturi;