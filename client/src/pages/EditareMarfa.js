import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

function EditareMarfa() {
    const { id } = useParams();
    const navigate = useNavigate();
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');

    const [formData, setFormData] = useState({
        denumire: '',
        categorie: '',
        um: '',
        cota_tva: '21',
        pret_curent: '',
        stoc_curent: 0 // nu se va afisa la editare
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = sessionStorage.getItem('token');
                const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/marfuri/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setFormData(res.data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchData();
    }, [id]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = sessionStorage.getItem('token');
            await axios.put(`${process.env.REACT_APP_API_URL}/api/marfuri/${id}`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            navigate('/marfuri');
        } catch (error) { alert('Eroare la editare'); }
    };

    return (
        <div className="container-fluid">
            <div className="card shadow col-md-8 mx-auto border-warning">
                <div className="card-header">
                    <h3 className="mb-0">Editare marfă</h3>
                </div>
                <div className="card-body p-4">
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label className="form-label">Denumire</label>
                            <input type="text" name="denumire" className="form-control" value={formData.denumire} onChange={handleChange} required />
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Categorie</label>
                                <input type="text" name="categorie" className="form-control" value={formData.categorie} onChange={handleChange} required />
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label">UM (unitate de măsură)</label>
                                <input type="text" name="um" className="form-control" value={formData.um} onChange={handleChange} required />
                            </div>

                            <div className="col-md-6 mb-3">
                                <label className="form-label">Preț vânzare curent (RON)</label>
                                <input type="number" name="pret_curent" className="form-control" value={formData.pret_curent || ''} onChange={handleChange} required />
                            </div>

                            {/* doar pt admin */}
                            {user.rol === 'admin' && (
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Cota TVA</label>
                                    <select name="cota_tva" className="form-select" value={formData.cota_tva} onChange={handleChange}>
                                        <option value="21">TVA 21%</option>
                                        <option value="11">TVA 11%</option>
                                        <option value="0">TVA 0%</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="d-flex gap-2 mt-4">
                            <button type="button" className="btn btn-secondary w-50" onClick={() => navigate('/marfuri')}>Renunță</button>
                            <button type="submit" className="btn btn-primary w-50">Salvează</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default EditareMarfa;