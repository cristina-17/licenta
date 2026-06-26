import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function AdaugarePartener() {
    const navigate = useNavigate();
    const token = sessionStorage.getItem('token');

    // formular adaugare partener pt admin
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
        setFormData({ ...formData, iban: cleanIban, banca: detectedBank });
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${process.env.REACT_APP_API_URL}/api/parteneri`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Partener adăugat!");
            navigate('/parteneri');
        } catch (err) {
            alert(err.response?.data?.message || "Eroare la adăugare");
        }
    };

    return (
        <div className="container-fluid">
            <div className="card shadow mb-5">
                <div className="card-header">
                    <h3 className="app-page-title mb-0">Adăugare partener nou</h3>
                </div>
                <div className="card-body p-4">
                    <form onSubmit={handleAdd} className="row g-3">
                        <div className="col-md-4">
                            <label className="form-label fw-bold">Nume</label>
                            <input type="text" className="form-control" onChange={e => setFormData({...formData, nume: e.target.value})} required/>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label fw-bold">CUI</label>
                            <input type="text" className="form-control" onChange={e => setFormData({...formData, cui: e.target.value})} required/>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label fw-bold">Nr. Registrul Comerțului</label>
                            <input type="text" className="form-control" onChange={e => setFormData({...formData, nr_reg_comert: e.target.value})} required/>
                        </div>
                        <div className="col-12">
                            <label className="form-label fw-bold">Adresa</label>
                            <input type="text" className="form-control" onChange={e => setFormData({...formData, adresa: e.target.value})} required/>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label fw-bold">Tip</label>
                            <select className="form-select" onChange={e => setFormData({...formData, tip_partener: e.target.value})}>
                                <option value="client">Client</option>
                                <option value="furnizor">Furnizor</option>
                                <option value="ambele">Ambele</option>
                            </select>
                        </div>
                        <div className="col-md-4">
                            <label className="form-label fw-bold">IBAN</label>
                            <input type="text" value={formData.iban} className="form-control" onChange={e => handleIbanChange(e.target.value)} required/>
                        </div>
                        <div className="col-md-4">
                            <label className="form-label fw-bold">Banca</label>
                            <input type="text" value={formData.banca} className="form-control bg-light" disabled />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label fw-bold">Email</label>
                            <input type="email" className="form-control" onChange={e => setFormData({...formData, email: e.target.value})} required/>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label fw-bold">Telefon</label>
                            <input type="text" className="form-control" onChange={e => setFormData({...formData, telefon: e.target.value})} required/>
                        </div>

                        <div className="col-12 mt-4 d-flex justify-content-between">
                            <button type="button" className="btn btn-secondary px-4" onClick={() => navigate('/parteneri')}>Renunță</button>
                            <button type="submit" className="btn btn-primary px-5">Salvează</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default AdaugarePartener;