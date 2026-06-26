import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Modal, Button, Form, Card, Row, Col } from 'react-bootstrap';

function NoteContabile() {
    const navigate = useNavigate();
    const token = sessionStorage.getItem('token');
    const [searchParams, setSearchParams] = useSearchParams();

    const [note, setNote] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDateModal, setShowDateModal] = useState(false);

    // citire filtre din URL
    const numar = searchParams.get('numar') || '';
    const perioadaSelectata = searchParams.get('perioadaSelectata') || 'all';
    const dataStart = searchParams.get('dataStart') || '';
    const dataFinal = searchParams.get('dataFinal') || '';

    // actualizarea filtre
    const updateFilters = useCallback((newFilters) => {
        const params = new URLSearchParams(searchParams);
        Object.entries(newFilters).forEach(([key, value]) => {
            if (value && value !== 'all') params.set(key, value);
            else params.delete(key);
        });
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
            setShowDateModal(true);
            updateFilters({ perioadaSelectata: 'custom' });
        } else {
            updateFilters({ perioadaSelectata: val, dataStart: start, dataFinal: final });
        }
    };

    const fetchNote = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/note-contabile`, {
                params: {
                    numar,
                    data_start: dataStart,
                    data_sfarsit: dataFinal
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            setNote(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    }, [token, numar, dataStart, dataFinal]);

    useEffect(() => {
        if (perioadaSelectata !== 'custom' || !showDateModal) {
            fetchNote();
        }
    }, [fetchNote, perioadaSelectata, showDateModal]);

    const saveCustomDates = () => {
        if (!dataStart || !dataFinal) {
            alert("Alege ambele date!");
            return;
        }
        setShowDateModal(false);
        fetchNote();
    };

    const handleFinalizeaza = async (id) => {
        if (!window.confirm("Sigur dorești să finalizezi această notă contabilă?")) return;
        try {
            await axios.put(`${process.env.REACT_APP_API_URL}/api/note-contabile/${id}/finalizeaza`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchNote();
        } catch (err) {
            alert("Eroare la finalizare.");
        }
    };

    return (
        <div className="container-fluid">
            {/* modal filtru data */}
            <Modal show={showDateModal} onHide={() => { setShowDateModal(false); if (perioadaSelectata === 'custom' && (!dataStart || !dataFinal)) updateFilters({ perioadaSelectata: 'all' }); }} centered>
                <Modal.Header closeButton className="bg-primary text-white">
                <Modal.Title>Alege perioada</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>De la:</Form.Label>
                        <Form.Control type="date" value={dataStart} onChange={e => updateFilters({ dataStart: e.target.value })} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Până la:</Form.Label>
                        <Form.Control type="date" value={dataFinal} onChange={e => updateFilters({ dataFinal: e.target.value })} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => { setShowDateModal(false); updateFilters({ perioadaSelectata: 'all', dataStart: '', dataFinal: '' }); }}>Renunță</Button>
                    <Button variant="primary" onClick={saveCustomDates}>Aplică</Button>
                </Modal.Footer>
            </Modal>

            <h2 className="app-page-title mb-4">Note contabile</h2>

            <Card className="p-3 mb-4 bg-light shadow-sm">
                <Row className="g-3">
                    <Col md={6}>
                        <Form.Control
                            placeholder="Caută după număr (ex: NC0704261)..."
                            value={numar}
                            onChange={e => updateFilters({ numar: e.target.value })}
                        />
                    </Col>
                    <Col md={6}>
                        <Form.Select value={perioadaSelectata} onChange={handlePerioadaChange}>
                            <option value="all">Toată perioada</option>
                            <option value="1luna">Ultima lună</option>
                            <option value="6luni">Ultimele 6 luni</option>
                            <option value="1an">Ultimul an</option>
                            <option value="custom">Alege perioada</option>
                        </Form.Select>
                    </Col>
                </Row>
                {(dataStart && dataFinal) && (
                    <div className="mt-2 text-muted small">
                        Filtru curent: {new Date(dataStart).toLocaleDateString()} - {new Date(dataFinal).toLocaleDateString()}
                    </div>
                )}
            </Card>

            <div className="table-responsive">
                <table className="table table-hover table-bordered align-middle text-center bg-white">
                    <thead className="">
                        <tr>
                            <th>Număr</th>
                            <th>Data întocmire</th>
                            <th>Status</th>
                            <th>Acțiuni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="4" className="py-4 text-center">Se încarcă...</td></tr>
                        ) : note.length > 0 ? note.map(n => (
                            <tr key={n.id}>
                                <td className="fw-bold">{n.numar}</td>
                                <td>{new Date(n.data_intocmire).toLocaleDateString('ro-RO')}</td>
                                <td>
                                    <span className={`badge ${n.status === 'finalizată' ? 'bg-success' : 'bg-warning text-dark'}`}>
                                        {n.status.toUpperCase()}
                                    </span>
                                </td>
                                <td>
                                    <div className="btn-group btn-group-sm">
                                        <button className="btn btn-outline-primary" onClick={() => navigate(`/note-contabile/detalii/${n.id}`)}>Detalii</button>
                                        {n.status === 'deschisă' && (
                                            <button className="btn btn-outline-primary" onClick={() => handleFinalizeaza(n.id)}>Finalizează</button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="4" className="py-4 text-muted text-center">Nu există note contabile înregistrate.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default NoteContabile;