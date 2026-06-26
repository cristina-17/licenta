import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

function EditarePartener() {
    const navigate = useNavigate();
    const { id } = useParams();
    const token = sessionStorage.getItem('token');

    // formular editare partener pt admin
    const [formData, setFormData] = useState({
        nume: '', cui: '', nr_reg_comert: '', adresa: '',
        tip_partener: 'client', iban: '', banca: '', email: '', telefon: ''
    });

    const handleIbanChange = (val) => {
        const cleanIban = val.toUpperCase().replace(/\s/g, '');
        let detectedBank = '';

        if (cleanIban.length >= 8) {
            const bic = cleanIban.substring(4, 8);
            const mapping = { 'INGB': 'ING Bank', 'RNCB': 'BCR', 'BRDE': 'BRD', 'BTRL': 'Banca Transilvania', 'REVO': 'Revolut', 'RZBR': 'Raiffeisen Bank', 'UGBI': 'Garanti Bank', 'TREZ': 'Trezoreria Statului', 'CECE': 'CEC Bank' };
            detectedBank = mapping[bic] || `Banca (BIC: ${bic})`;
        }
        setFormData(prev => ({ ...prev, iban: cleanIban, banca: detectedBank }));
    };

    useEffect(() => {
        const fetchPartener = async () => {
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/parteneri/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setFormData(res.data);
            } catch (err) {
                alert("Eroare la încărcarea datelor.");
                navigate('/parteneri');
            }
        };
        fetchPartener();
    }, [id, token, navigate]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`${process.env.REACT_APP_API_URL}/api/parteneri/${id}`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Partener actualizat!");
            navigate('/parteneri');
        } catch (err) {
            alert("Eroare la actualizare.");
        }
    };

    return (
        <div className="container-fluid">
            <div className="card shadow mb-5">
                <div className="card-header">
                    <h3 className="app-page-title mb-0">Editare Partener: {formData.nume}</h3>
                </div>
                <div className="card-body p-4">
                    <form onSubmit={handleUpdate} className="row g-3">
                        <div className="col-md-4"><label className="form-label">Nume</label><input type="text" value={formData.nume} className="form-control" onChange={e => setFormData({...formData, nume: e.target.value})} required/></div>
                        <div className="col-md-2"><label className="form-label">CUI</label><input type="text" value={formData.cui} className="form-control" onChange={e => setFormData({...formData, cui: e.target.value})} required/></div>
                        <div className="col-md-2"><label className="form-label">Nr. Registrul Comerțului</label><input type="text" value={formData.nr_reg_comert} className="form-control" onChange={e => setFormData({...formData, nr_reg_comert: e.target.value})} required/></div>
                        <div className="col-12"><label className="form-label">Adresa</label><input type="text" value={formData.adresa} className="form-control" onChange={e => setFormData({...formData, adresa: e.target.value})} required/></div>
                        <div className="col-md-2"><label className="form-label">Tip</label>
                            <select className="form-select" value={formData.tip_partener} onChange={e => setFormData({...formData, tip_partener: e.target.value})}>
                                <option value="client">Client</option>
                                <option value="furnizor">Furnizor</option>
                                <option value="ambele">Ambele</option>
                            </select>
                        </div>
                        <div className="col-md-4"><label className="form-label">IBAN</label><input type="text" value={formData.iban} className="form-control" onChange={e => handleIbanChange(e.target.value)} required/></div>
                        <div className="col-md-3"><label className="form-label">Banca</label><input type="text" value={formData.banca} className="form-control bg-light" disabled/></div>
                        <div className="col-md-2"><label className="form-label">Telefon</label><input type="text" value={formData.telefon} className="form-control" onChange={e => setFormData({...formData, telefon: e.target.value})} required/></div>

                        <div className="col-12 mt-4 d-flex justify-content-between">
                            <button type="button" className="btn btn-secondary" onClick={() => navigate('/parteneri')}>Renunță</button>
                            <button type="submit" className="btn btn-outline-warning">Salvează</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default EditarePartener;