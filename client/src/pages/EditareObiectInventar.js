import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

function EditareObiectInventar() {
    const { id } = useParams();
    const navigate = useNavigate();
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');

    const [formData, setFormData] = useState({
        denumire: '',
        um: '',
        cota_tva: '21',
        stoc_curent: 0 // nu se va afisa la editare
    });

    useEffect(() => {
        const fetchData = async () => {
            const token = sessionStorage.getItem('token');
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/obiecte-inventar/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFormData(res.data);
        };
        fetchData();
    }, [id]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = sessionStorage.getItem('token');
            await axios.put(`${process.env.REACT_APP_API_URL}/api/obiecte-inventar/${id}`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            navigate('/obiecte-inventar');
        } catch (error) { alert('Eroare la editare'); }
    };

    return (
        <div className="container-fluid col-md-8 mx-auto">
            <div className="card shadow col-md-6 mx-auto border-warning">
                <div className="card-header">
                    <h3>Editare obiect inventar</h3>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label className="form-label">Denumire</label>
                            <input type="text" name="denumire" className="form-control" value={formData.denumire} onChange={handleChange} required />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Unitate de măsură</label>
                            <input type="text" name="um" className="form-control" value={formData.um} onChange={handleChange} required />
                        </div>

                        {/* doar pt admin */}
                        {user.rol === 'admin' && (
                            <div className="mb-3">
                                <label className="form-label">Cota TVA</label>
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

export default EditareObiectInventar;