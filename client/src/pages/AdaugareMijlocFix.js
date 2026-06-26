import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function AdaugareMijlocFix() {
    const navigate = useNavigate();
    const token = sessionStorage.getItem('token');

    const [disponibileDinFacturi, setDisponibileDinFacturi] = useState([]);

    const [formData, setFormData] = useState({
        id_factura_item: '',
        denumire: '',
        nr_inventar: '',
        data_intrare: '',
        data_sfarsit: '',
        valoare_intrare: '',
        tip_amortizare: 'liniară',
        val_amort_acc: 0,
        cont_contabil: '',
        status: 'activ'
    });

    // preluare mijloace fixe din facturi
    useEffect(() => {
        const fetchDisponibile = async () => {
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/mijloace-fixe/neregistrate`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setDisponibileDinFacturi(res.data);
            } catch (err) { console.error("Eroare la preluare"); }
        };
        fetchDisponibile();
    }, [token]);

    const handleChange = e => setFormData({...formData, [e.target.name]: e.target.value});

    // completare automata pt mijlocul fix din factura
    const handleSelectFactura = (e) => {
        const id_item = e.target.value;
        if (!id_item) {
            setFormData({ ...formData, id_factura_item: '', denumire: '', valoare_intrare: '', data_intrare: '' });
            return;
        }

        const itemSelectat = disponibileDinFacturi.find(item => item.id_item_factura.toString() === id_item);
        if (itemSelectat) {
            setFormData({
                ...formData,
                id_factura_item: itemSelectat.id_item_factura,
                denumire: itemSelectat.denumire,
                valoare_intrare: itemSelectat.valoare_intrare,
                data_intrare: new Date(itemSelectat.data_emitere).toISOString().split('T')[0]
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // validare val_amort_acc
        if (formData.tip_amortizare === 'accelerată') {
            const valAcc = parseFloat(formData.val_amort_acc);
            const valIntrare = parseFloat(formData.valoare_intrare);
            if (!valAcc || valAcc <= 0) {
                alert('Introdu o valoare pozitivă pentru amortizarea accelerată.');
                return;
            }
            if (valAcc > valIntrare / 2) {
                alert('Valoarea amortizării accelerate nu poate depăși jumătate din valoarea de intrare (' + (valIntrare / 2).toFixed(2) + ' RON).');
                return;
            }
        }

        try {
            await axios.post(`${process.env.REACT_APP_API_URL}/api/mijloace-fixe`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Mijloc fix adăugat cu succes!");
            navigate('/mijloace-fixe');
        } catch (error) {
            alert(error.response?.data?.message || "Eroare la salvare.");
        }
    };

    return (
        <div className="container-fluid">
            <div className="card" style={{maxWidth: '800px', margin: '0 auto'}}>
                <div className="card-header">
                    <h3 className="app-page-title mb-0">Adăugare mijloc fix</h3>
                </div>
                <div className="card-body p-4">
                    <form onSubmit={handleSubmit}>

                        {/* dropdown pentru preluare automata din facturi/introducere manuala */}
                        <div className="row mb-4">
                            <div className="col-12">
                                <label className="form-label fw-bold">Introducere manuală / Preluare din factură</label>
                                <select className="form-select" name="id_factura_item" onChange={handleSelectFactura} value={formData.id_factura_item}>
                                    <option value="">Introducere manuală</option>
                                    {disponibileDinFacturi.length === 0 ? (
                                        <option disabled value="none">Nu există facturi cu mijloace fixe.</option>
                                    ) : (
                                        disponibileDinFacturi.map(item => (
                                            <option key={item.id_item_factura} value={item.id_item_factura}>
                                                Factura #{item.numar_factura} - {item.denumire} ({item.valoare_intrare} RON)
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>
                        </div>

                        <hr className="mb-4" />

                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="form-label fw-bold">Denumire</label>
                                <input name="denumire" className="form-control" required value={formData.denumire} onChange={handleChange} />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold">Nr. inventar</label>
                                <input name="nr_inventar" className="form-control" required value={formData.nr_inventar} onChange={handleChange} />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold">Cont Contabil</label>
                                <select name="cont_contabil" className="form-select" required value={formData.cont_contabil} onChange={handleChange}>
                                    <option value="">Alege contul...</option>
                                    <option value="2131">2131 - mașini/utilaje/instalații</option>
                                    <option value="2132">2132 - aparate de măsurare/control/reglare</option>
                                    <option value="2133">2133 - mijloace de transport</option>
                                    <option value="214">214 - altele</option>
                                </select>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold">Data intrare</label>
                                <input type="date" name="data_intrare" className="form-control" required value={formData.data_intrare} onChange={handleChange} />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold">Data sfârșit</label>
                                <input type="date" name="data_sfarsit" className="form-control" required value={formData.data_sfarsit} onChange={handleChange} />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label fw-bold">Valoare intrare (RON)</label>
                                <input type="number" name="valoare_intrare" className="form-control" required value={formData.valoare_intrare} onChange={handleChange} />
                            </div>

                           <div className="col-md-6">
                                <label className="form-label fw-bold">Tip amortizare</label>
                                <select name="tip_amortizare" className="form-select" onChange={handleChange} value={formData.tip_amortizare}>
                                    <option value="liniară">Liniară</option>
                                    <option value="accelerată">Accelerată</option>
                                </select>
                            </div>

                            {formData.tip_amortizare === 'accelerată' && (
                                <div className="col-md-6">
                                    <label className="form-label fw-bold">
                                        Valoare amortizare accelerată (în primul an)
                                    </label>
                                    <input
                                        type="number"
                                        name="val_amort_acc"
                                        className="form-control"
                                        value={formData.val_amort_acc}
                                        onChange={handleChange}
                                    />
                                    {formData.valoare_intrare && (
                                        <div className="form-text text-muted">
                                            Maxim admis: {(parseFloat(formData.valoare_intrare) / 2).toFixed(2)} RON
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="d-flex justify-content-between mt-5">
                            <button type="button" className="btn btn-secondary px-4" onClick={() => navigate('/mijloace-fixe')}>Renunță</button>
                            <button type="submit" className="btn btn-primary px-5">Salvează</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default AdaugareMijlocFix;