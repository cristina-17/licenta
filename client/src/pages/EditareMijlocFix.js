import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

function EditareMijlocFix() {
    const { id } = useParams();
    const navigate = useNavigate();
    const token = sessionStorage.getItem('token');


    const [formData, setFormData] = useState({
        denumire: '',
        nr_inventar: '',
        data_intrare: '',
        data_sfarsit: '',
        valoare_intrare: '',
        tip_amortizare: 'liniară',
        val_amort_acc: 0
    });

    useEffect(() => {
        const fetchMijlocFix = async () => {
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/mijloace-fixe/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = res.data;

                setFormData({
                    denumire: data.denumire || '',
                    nr_inventar: data.nr_inventar || '',
                    data_intrare: data.data_intrare ? new Date(data.data_intrare).toISOString().split('T')[0] : '',
                    data_sfarsit: data.data_sfarsit ? new Date(data.data_sfarsit).toISOString().split('T')[0] : '',
                    valoare_intrare: data.valoare_intrare || '',
                    tip_amortizare: data.tip_amortizare || 'liniară',
                    val_amort_acc: data.val_amort_acc || 0
                });
            } catch (err) {
                alert("Eroare la preluarea datelor mijlocului fix.");
                navigate('/mijloace-fixe');
            }
        };
        fetchMijlocFix();
    }, [id, token, navigate]);

    const handleChange = e => setFormData({...formData, [e.target.name]: e.target.value});

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`${process.env.REACT_APP_API_URL}/api/mijloace-fixe/${id}`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Mijloc fix actualizat cu succes!");
            navigate('/mijloace-fixe');
        } catch (error) {
            alert(error.response?.data?.message || "Eroare la actualizare.");
        }
    };

    return (
        <div className="container-fluid">
            <div className="card" style={{maxWidth: '800px', margin: '0 auto'}}>
                <div className="card-header">
                    <h4 className="mb-0">Editare mijloc fix</h4>
                </div>
                <div className="card-body p-4">
                    <form onSubmit={handleSubmit}>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="form-label">Denumire</label>
                                <input name="denumire" className="form-control" required value={formData.denumire} onChange={handleChange} />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label">Nr. inventar</label>
                                <input
                                    name="nr_inventar"
                                    className="form-control"
                                    required
                                    value={formData.nr_inventar}
                                    onChange={handleChange}
                                    disabled
                                    title="Numărul de inventar nu poate fi modificat după înregistrare"
                                />
                            </div>

                            {/* sunt vizibile dar nu pot fi schimbate */}
                            <div className="col-md-6">
                                <label className="form-label">Data intrare</label>
                                <input type="date" name="data_intrare" className="form-control" required value={formData.data_intrare} onChange={handleChange} disabled title="Data de intrare nu se poate modifica retrospectiv" />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">Data sfârșit</label>
                                <input type="date" name="data_sfarsit" className="form-control" required value={formData.data_sfarsit} onChange={handleChange}  disabled title="Data de sfârșit nu se poate modifica retrospectiv" />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label">Valoare intrare (RON)</label>
                                <input type="number" name="valoare_intrare" className="form-control" required value={formData.valoare_intrare} disabled title="Valoarea de intrare inițială nu se modifică" />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label">Tip amortizare</label>
                                <select name="tip_amortizare" className="form-select" value={formData.tip_amortizare} disabled>
                                    <option value="liniară">Liniară</option>
                                    <option value="accelerată">Accelerată</option>
                                </select>
                            </div>

                            {formData.tip_amortizare === 'accelerată' && (
                                <div className="col-md-6">
                                    <label className="form-label">Valoare amortizare accelerată (max 50%)</label>
                                    {/* nu poate fi schimbat */}
                                    <input type="number" name="val_amort_acc" className="form-control" value={formData.val_amort_acc} disabled />
                                </div>
                            )}
                        </div>

                        <div className="d-flex justify-content-between mt-5">
                            <button type="button" className="btn btn-secondary" onClick={() => navigate('/mijloace-fixe')}>Renunță</button>
                            <button type="submit" className="btn btn-primary px-4">Salvează</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default EditareMijlocFix;