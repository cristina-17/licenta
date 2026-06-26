import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

function EditareFactura() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [header, setHeader] = useState({
        numar: '',
        data_emitere: '',
        data_scadenta: '',
        status: '',
        tip_produse: 'marfă'
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFactura = async () => {
            try {
                const token = sessionStorage.getItem('token');
                const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/facturi/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = res.data;

                setHeader({
                    numar: data.numar,
                    data_emitere: data.data_emitere ? new Date(data.data_emitere).toISOString().split('T')[0] : '',
                    data_scadenta: data.data_scadenta ? new Date(data.data_scadenta).toISOString().split('T')[0] : '',
                    status: data.status,
                    tip_produse: data.tip_produse || 'marfă'
                });
                setLoading(false);
            } catch (e) {
                console.error(e);
                alert("Eroare la încărcarea datelor.");
                navigate('/facturi');
            }
        };
        fetchFactura();
    }, [id, navigate]);

    const handleSave = async () => {
        try {
            const token = sessionStorage.getItem('token');
            await axios.put(`${process.env.REACT_APP_API_URL}/api/facturi/${id}`, header, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Datele au fost actualizate!");
            navigate('/facturi');
        } catch (e) {
            console.error(e);
            alert("Eroare la salvare.");
        }
    };

    if (loading) return <div className="text-center mt-5">Se încarcă...</div>;

    return (
        <div className="container-fluid">
            <div className="card shadow mb-5">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <h3 className="app-page-title mb-0">Editare factură #{header.numar}</h3>
                    <div className="text-muted fw-bold">Operator: {header.operator_nume}</div>
                </div>
                <div className="card-body p-4">
                    <div className="mb-3">
                        <label className="form-label">Număr factură</label>
                        <input type="text" className="form-control" value={header.numar} onChange={e => setHeader({...header, numar: e.target.value})} />
                    </div>

                    <div className="row mb-3">
                        <div className="col-md-6">
                            <label className="form-label">Data emitere</label>
                            <input type="date" className="form-control" value={header.data_emitere} onChange={e => setHeader({...header, data_emitere: e.target.value})} />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label">Data scadență</label>
                            <input type="date" className="form-control" value={header.data_scadenta} onChange={e => setHeader({...header, data_scadenta: e.target.value})} />
                        </div>
                        <div className="col-md-12">
                                <label className="form-label">Tip conținut factură</label>
                                <select className="form-select" value={header.tip_produse} disabled>
                                    <option value="marfă">Mărfuri</option>
                                    <option value="mijloc fix">Mijloace fixe</option>
                                    <option value="obiecte inventar">Obiecte de inventar</option>
                                    <option value="servicii">Servicii</option>
                                </select>
                            </div>
                    </div>
                    <div className="mb-4">
                        <label className="form-label d-block">Status curent</label>
                        <span className={`badge p-2 fs-6 ${['încasată', 'plătită'].includes(header.status) ? 'bg-success' : 'bg-danger'}`}>
                            {header.status.toUpperCase()}
                        </span>
                    </div>

                    <div className="d-flex justify-content-between align-items-center">
                        <button className="btn btn-secondary" onClick={() => navigate('/facturi')}>Renunță</button>
                        <button className="btn btn-primary" onClick={handleSave}>Salvează modificări</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EditareFactura;