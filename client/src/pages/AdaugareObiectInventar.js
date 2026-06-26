import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function AdaugareObiectInventar() {
    const navigate = useNavigate();
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');

    const [formData, setFormData] = useState({
        denumire: '',
        um: '',
        cota_tva: '21',
    });

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = sessionStorage.getItem('token');
            await axios.post(`${process.env.REACT_APP_API_URL}/api/obiecte-inventar`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            navigate('/obiecte-inventar');
        } catch (error) { alert('Eroare la adăugare'); }
    };

    return (
        <div className="container-fluid col-md-8 mx-auto">
            <div className="card shadow col-md-6 mx-auto">
                <div className="card-header">
                    <h3 className="app-page-title mb-0">Adăugare obiect inventar nou</h3>
                </div>
                <div className="card-body p-4">
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label className="form-label fw-bold">Denumire</label>
                            <input type="text" name="denumire" className="form-control" required onChange={handleChange} />
                        </div>
                        <div className="mb-3">
                            <label className="form-label fw-bold">Unitate de măsură</label>
                            <input type="text" name="um" className="form-control" placeholder="ex: buc, set" required onChange={handleChange} />
                        </div>
                        {/* doar pt admin */}
                        {user.rol === 'admin' && (
                            <div className="mb-3">
                                <label className="form-label fw-bold">Cota TVA</label>
                                <select name="cota_tva" className="form-select" value={formData.cota_tva} onChange={handleChange}>
                                    <option value="21">TVA 21%</option>
                                    <option value="11">TVA 11%</option>
                                    <option value="0">TVA 0%</option>
                                </select>
                            </div>
                        )}
                        <div className="d-flex gap-2 mt-4">
                            <button type="button" className="btn btn-secondary w-50" onClick={() => navigate('/obiecte-inventar')}>Renunță</button>
                            <button type="submit" className="btn btn-primary w-50">Salvează</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default AdaugareObiectInventar;