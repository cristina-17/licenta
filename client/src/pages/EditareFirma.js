import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// pagina doar pt admin
function EditareFirma() {
    const navigate = useNavigate();
    const token = sessionStorage.getItem('token');
    const [idFirma, setIdFirma] = useState(null);
    const [formData, setFormData] = useState({
        nume: '', adresa: '', iban: '', banca: '', email: '', telefon: ''
    });

    useEffect(() => {
        const fetchFirma = async () => {
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/firme`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setFormData({
                    nume: res.data.nume,
                    adresa: res.data.adresa,
                    iban: res.data.iban,
                    banca: res.data.banca,
                    email: res.data.email,
                    telefon: res.data.telefon
                });
                setIdFirma(res.data.id);
            } catch (err) { alert("Eroare la încărcare date."); }
        };
        fetchFirma();
    }, [token]);

    const handleIbanChange = (val) => {
        const cleanIban = val.toUpperCase().replace(/\s/g, '');
        let detectedBank = '';
        if (cleanIban.length >= 8) {
            const bic = cleanIban.substring(4, 8);
            const mapping = { 'INGB': 'ING Bank', 'RNCB': 'BCR', 'BRDE': 'BRD', 'BTRL': 'Banca Transilvania', 'REVO': 'Revolut', 'RZBR': 'Raiffeisen Bank', 'TREZ': 'Trezoreria Statului', 'CECE': 'CEC Bank' };
            detectedBank = mapping[bic] || `Banca (BIC: ${bic})`;
        }
        setFormData({ ...formData, iban: cleanIban, banca: detectedBank });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`${process.env.REACT_APP_API_URL}/api/firme/${idFirma}`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Datele firmei au fost actualizate!");
            navigate('/dashboard');
        } catch (err) { alert("Eroare la salvare."); }
    };

    return (
        <div className="container mt-5 col-md-8">
            <h2 className="mb-4 text-primary">Editare date firma</h2>
            <div className="card shadow p-4 border-0">
                <form onSubmit={handleSave} className="row g-3">
                    <div className="col-12">
                        <label className="form-label fw-bold">Nume firmă</label>
                        <input type="text" className="form-control" value={formData.nume} onChange={e => setFormData({...formData, nume: e.target.value})} required />
                    </div>
                    <div className="col-12">
                        <label className="form-label fw-bold">Adresă</label>
                        <input type="text" className="form-control" value={formData.adresa} onChange={e => setFormData({...formData, adresa: e.target.value})} required />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label fw-bold">IBAN</label>
                        <input type="text" className="form-control" value={formData.iban} onChange={e => handleIbanChange(e.target.value)} required />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label fw-bold">Bancă</label>
                        <input type="text" className="form-control bg-light" value={formData.banca} disabled />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label fw-bold">Email</label>
                        <input type="email" className="form-control" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label fw-bold">Telefon</label>
                        <input type="text" className="form-control" value={formData.telefon} onChange={e => setFormData({...formData, telefon: e.target.value})} required />
                    </div>
                    <div className="col-12 d-flex justify-content-between mt-4">
                        <button type="button" className="btn btn-secondary" onClick={() => navigate('/dashboard')}>Renunță</button>
                        <button type="submit" className="btn btn-primary fw-bold px-5">Salvează modificările</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EditareFirma;