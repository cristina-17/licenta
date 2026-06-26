import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { Modal, Button, Form } from 'react-bootstrap';

// modal pt adaugarea marfa noua
const ModalAdaugareMarfa = ({ show, onClose, onSave, denumireInitiala }) => {
    const [marfa, setMarfa] = useState({
        denumire: denumireInitiala || '',
        categorie: '',
        um: 'buc',
        cota_tva: '21',
        pret_curent: ''
    });

    React.useEffect(() => {
        if (denumireInitiala) setMarfa(prev => ({ ...prev, denumire: denumireInitiala }));
    }, [denumireInitiala]);

    if (!show) return null;

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header bg-success text-white">
                        <h5 className="modal-title">Produs inexistent - Adaugă în baza de date</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <div className="alert alert-info py-2">
                            Produsul nu a fost găsit. Completează detaliile pentru a-l salva.
                        </div>
                        <input className="form-control mb-2" placeholder="Denumire" value={marfa.denumire} onChange={e => setMarfa({...marfa, denumire: e.target.value})} />
                        <input className="form-control mb-2" placeholder="Categorie" value={marfa.categorie} onChange={e => setMarfa({...marfa, categorie: e.target.value})} />
                        <div className="row g-2 mb-2">
                            <div className="col-6">
                                <input className="form-control" placeholder="UM" value={marfa.um} onChange={e => setMarfa({...marfa, um: e.target.value})} />
                            </div>
                            <div className="col-6">
                                <select className="form-select" value={marfa.cota_tva} onChange={e => setMarfa({...marfa, cota_tva: e.target.value})}>
                                    <option value="21">TVA 21%</option>
                                    <option value="11">TVA 11%</option>
                                    <option value="0">TVA 0%</option>
                                </select>
                            </div>
                        </div>
                        <label className="form-label">Preț unitar vânzare</label>
                        <input type="number" className="form-control" value={marfa.pret_curent} onChange={e => setMarfa({...marfa, pret_curent: e.target.value})} required />
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={onClose}>Renunță</button>
                        <button className="btn btn-primary" onClick={() => onSave(marfa)}>Salvează și continuă</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// modal pt obiecte de inventar
const ModalAdaugareObiect = ({ show, onClose, onSave, denumireInitiala }) => {
    const [obiect, setObiect] = useState({ denumire: denumireInitiala || '', um: 'buc', cota_tva: '21' });

    useEffect(() => {
        if (denumireInitiala) setObiect(prev => ({ ...prev, denumire: denumireInitiala }));
    }, [denumireInitiala]);

    if (!show) return null;

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header bg-success text-white">
                        <h5 className="modal-title">Element inexistent - Adaugă element nou</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <div className="alert alert-info py-2">
                            Elementul nu a fost găsit. Completează detaliile pentru a-l salva.
                        </div>
                        <input className="form-control mb-2" placeholder="Denumire" value={obiect.denumire} onChange={e => setObiect({...obiect, denumire: e.target.value})} />
                        <div className="row g-2 mb-2">
                            <div className="col-6">
                                <input className="form-control" placeholder="UM" value={obiect.um} onChange={e => setObiect({...obiect, um: e.target.value})} />
                            </div>
                            <div className="col-6">
                                <select className="form-select" value={obiect.cota_tva} onChange={e => setObiect({...obiect, cota_tva: e.target.value})}>
                                    <option value="21">TVA 21%</option>
                                    <option value="11">TVA 11%</option>
                                    <option value="0">TVA 0%</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={onClose}>Renunță</button>
                        <button className="btn btn-primary" onClick={() => onSave(obiect)}>Salvează și selectează</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// adaugare factura
function AdaugareFactura() {
    const navigate = useNavigate();
    const location = useLocation();

    const token = sessionStorage.getItem('token');
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');

    const isAdmin = user?.rol === 'admin';

    const [step, setStep] = useState(1);
    const [tipProduse, setTipProduse] = useState('marfă');

    const today = new Date();
    const emitereDef = today.toISOString().split('T')[0];
    const limitDate = new Date();
    limitDate.setDate(today.getDate() + 30);
    const scadentaDef = limitDate.toISOString().split('T')[0];

    const headerDefault = {
        numar: '',
        data_emitere: emitereDef,
        data_scadenta: scadentaDef,
        id_partener: '',
        tip: '',
        status: ''
    };

    const [header, setHeader] = useState(headerDefault);
    const [produseLista, setProduseLista] = useState([]);

    const [partenerQuery, setPartenerQuery] = useState('');
    const [sugestiiPartener, setSugestiiPartener] = useState([]);

    const itemDefault = { id_ref: '', denumire: '', cantitate: 1, pret_unitar: 0, total_net: '', cota_tva: '21', cont_contabil: '', um: 'buc', stoc_disponibil: 0 };
    const [itemCurent, setItemCurent] = useState(itemDefault);
    const [itemQuery, setItemQuery] = useState('');
    const [sugestiiItem, setSugestiiItem] = useState([]);

    const [indexEditare, setIndexEditare] = useState(-1);
    const [itemInEditare, setItemInEditare] = useState(null);

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showAddMarfaModal, setShowAddMarfaModal] = useState(false);
    const [showAddObiectModal, setShowAddObiectModal] = useState(false);

    const [showCMPAlert, setShowCMPAlert] = useState(false);
    const [marfuriAfectate, setMarfuriAfectate] = useState([]);

    const [showSubModal, setShowSubModal] = useState(false);
    const [marfaDeEditat, setMarfaDeEditat] = useState(null);
    const [noulPretVanzare, setNoulPretVanzare] = useState('');

    const handleSchimbaPretVanzare = (m) => {
        setMarfaDeEditat(m);
        setNoulPretVanzare('');
        setShowSubModal(true);
    };

    const handleSaveNewPrice = async () => {
        const pret = parseFloat(noulPretVanzare);
        if (isNaN(pret) || pret <= parseFloat(marfaDeEditat.cmp)) {
            return alert(`Prețul trebuie să fie mai mare decât CMP (${parseFloat(marfaDeEditat.cmp).toFixed(2)})!`);
        }
        try {
            await axios.put(`${process.env.REACT_APP_API_URL}/api/marfuri/${marfaDeEditat.id}`,
                { pret_curent: pret },
                { headers: { Authorization: `Bearer ${token}` }}
            );
            const resCmp = await axios.get(
                `${process.env.REACT_APP_API_URL}/api/marfuri/verificare-cmp`,
                { headers: { Authorization: `Bearer ${token}` }}
            );
            setMarfuriAfectate(resCmp.data);
            setShowSubModal(false);
        } catch (e) {
            alert('Eroare la actualizarea prețului.');
        }
    };

    // resetare formular adaugare factura la schimbarea tipului de produse la pasul 1 cand se revine de pe pasul 2 sau 3
    useEffect(() => {
        if (step > 1) {
            setStep(1);
            setHeader(headerDefault);
            setProduseLista([]);
            setPartenerQuery('');
            setSugestiiPartener([]);
            setItemCurent(itemDefault);
            setItemQuery('');
        }
    }, [tipProduse]);

    // pt marfa tipul poate fi primita/emisa, pt restul doar primita
    useEffect(() => {
        if (location.state?.partenerId) {
            const { partenerId, partenerNume, tipPartener } = location.state;
            setPartenerQuery(partenerNume);
            let tipAuto = '';
            if (tipProduse !== 'marfă') tipAuto = 'primită';
            else if (tipPartener === 'client') tipAuto = 'emisă';
            else if (tipPartener === 'furnizor') tipAuto = 'primită';
            setHeader(prev => ({ ...prev, id_partener: partenerId, tip: tipAuto, status: tipAuto }));
            setStep(2);
        }
    }, [location.state]);

    useEffect(() => {
        if (step === 2 && tipProduse !== 'marfă') {
            setHeader(prev => ({ ...prev, tip: 'primită', status: 'primită' }));
        }
    }, [step, tipProduse]);

    // pas1
    const handleNextStep1 = () => setStep(2);

    // pas2
    const searchPartener = async (val) => {
        setPartenerQuery(val);
        setHeader(prev => ({ ...prev, id_partener: '' }));
        if (val.length < 2) { setSugestiiPartener([]); return; }
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/parteneri?cautare=${val}`, { headers: { Authorization: `Bearer ${token}` }});
            let parteneri = Array.isArray(res.data.parteneri) ? res.data.parteneri : [];
            if (tipProduse !== 'marfă') {
                parteneri = parteneri.filter(p => p.tip_partener === 'furnizor' || p.tip_partener === 'ambele');
            }
            setSugestiiPartener(parteneri);
        } catch (e) {
            setSugestiiPartener([]);
        }
    };

    const selectPartener = (p) => {
        setPartenerQuery(p.nume);
        let tipAuto = '';
        if (tipProduse !== 'marfă') tipAuto = 'primită';
        else if (p.tip_partener === 'client') tipAuto = 'emisă';
        else if (p.tip_partener === 'furnizor') tipAuto = 'primită';
        setHeader({ ...header, id_partener: p.id, tip: tipAuto, status: tipAuto || '' });
        setSugestiiPartener([]);
    };

    const handleNextStep2 = () => {
        if (!header.id_partener) return alert('Selectează partenerul din lista de sugestii!');
        if (!header.numar) return alert('Introdu numărul facturii!');
        if (!header.tip) return alert('Alege tipul facturii (emisă/primită)!');
        if (!header.data_emitere) return alert('Selectează data emiterii!');
        if (!header.data_scadenta) return alert('Selectează data scadenței!');
        const eDate = new Date(header.data_emitere);
        const sDate = new Date(header.data_scadenta);
        const diff = (sDate - eDate) / (1000 * 60 * 60 * 24);
        if (diff < 30) return alert('Data scadenței trebuie să fie la minim 30 de zile după emitere!');
        setStep(3);
    };

    // pas3
    const searchItem = async (val) => {
        setItemQuery(val);
        setItemCurent(prev => ({ ...prev, id_ref: '', denumire: val }));
        if (val.length < 2) { setSugestiiItem([]); return; }
        try {
            let endpoint = tipProduse === 'marfă' ? 'marfuri' : 'obiecte-inventar';
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/${endpoint}?cautare=${val}`, { headers: { Authorization: `Bearer ${token}` }});
            setSugestiiItem(Array.isArray(res.data.data) ? res.data.data : []);
        } catch (e) {
            setSugestiiItem([]);
        }
    };

    const selectItem = (i) => {
        setItemQuery(i.denumire);
        const pretInitial = header.tip === 'emisă' ? (i.pret_curent || 0) : 0;
        setItemCurent({
            id_ref: i.id,
            denumire: i.denumire,
            pret_unitar: pretInitial,
            cota_tva: i.cota_tva,
            um: i.um,
            cantitate: 1,
            total_net: '',
            stoc_disponibil: i.stoc_curent || 0
        });
        setSugestiiItem([]);
    };

    const handleItemBlur = () => {
        setTimeout(() => {
            if (itemQuery.length > 0 && !itemCurent.id_ref) {
                if (tipProduse === 'marfă' || tipProduse === 'obiecte inventar') setShowConfirmModal(true);
            }
        }, 200);
    };

    const saveNewItemDatabase = async (data) => {
        try {
            let endpoint = tipProduse === 'marfă' ? 'marfuri' : 'obiecte-inventar';
            const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/${endpoint}`, data, { headers: { Authorization: `Bearer ${token}` }});
            setItemCurent({
                id_ref: res.data.id,
                denumire: data.denumire,
                pret_unitar: 0,
                cota_tva: data.cota_tva,
                um: data.um,
                cantitate: 1,
                total_net: '',
                stoc_disponibil: 0
            });
            setItemQuery(data.denumire);
            setShowAddMarfaModal(false);
            setShowAddObiectModal(false);
            setShowConfirmModal(false);
        } catch (e) { alert('Eroare la salvare în baza de date.'); }
    };

    const resetFormularItem = () => {
        setItemCurent(itemDefault);
        setItemQuery('');
    };

    const adaugaInLista = () => {
        if ((tipProduse === 'marfă' || tipProduse === 'obiecte inventar') && !itemCurent.id_ref) return alert('Selectează un element valid!');
        if (!itemCurent.denumire) return alert('Completează denumirea!');
        if (tipProduse === 'servicii' && !itemCurent.cont_contabil) return alert('Alege contul contabil pentru acest serviciu!');

        const quantity = parseFloat(itemCurent.cantitate);
        if (isNaN(quantity) || quantity <= 0) return alert('Introdu o cantitate validă, mai mare decât 0!');

        // daca produsul e acelasi si pretul e diferit, linie noua; daca e acelasi pret, cumulam cantitatea
        const indexExistent = produseLista.findIndex(p =>
            p.id_ref === itemCurent.id_ref &&
            parseFloat(p.pret_unitar) === parseFloat(itemCurent.pret_unitar) &&
            (tipProduse === 'marfă' || tipProduse === 'obiecte inventar')
        );

        if (indexExistent !== -1) {
            // acelasi produs, acelasi pret, cumulam cantitatea
            const produsExistent = produseLista[indexExistent];
            const nouaCantitateTotala = Number(produsExistent.cantitate) + quantity;

            if (header.tip === 'emisă' && tipProduse === 'marfă') {
                if (nouaCantitateTotala > itemCurent.stoc_disponibil) {
                    return alert(`Stoc insuficient pentru totalul cumulat! Aveți deja ${produsExistent.cantitate} în listă. Disponibil: ${itemCurent.stoc_disponibil} ${itemCurent.um}`);
                }
            }

            let nouNet = 0;
            if (tipProduse === 'marfă') {
                nouNet = itemCurent.pret_unitar * nouaCantitateTotala;
            } else {
                const netNouIntrodus = parseFloat(itemCurent.total_net);
                if (isNaN(netNouIntrodus) || netNouIntrodus <= 0) return alert('Introdu suma netă corectă!');
                nouNet = Number(produsExistent.net) + netNouIntrodus;
            }

            const nouTva = nouNet * (parseInt(itemCurent.cota_tva) / 100);
            const nouBrut = nouNet + nouTva;

            const nouaLista = [...produseLista];
            nouaLista[indexExistent] = { ...produsExistent, cantitate: nouaCantitateTotala, net: nouNet, valTva: nouTva, brut: nouBrut };
            setProduseLista(nouaLista);
            resetFormularItem();
            return;
        }

        // pret diferit sau element nou, adaugare linie noua
        if (header.tip === 'emisă' && tipProduse === 'marfă') {
            // calculeaza stocul deja pus in lista pt acest produs
            const stocRezervat = produseLista
                .filter(p => p.id_ref === itemCurent.id_ref)
                .reduce((acc, p) => acc + Number(p.cantitate), 0);

            if ((stocRezervat + quantity) > itemCurent.stoc_disponibil) {
                return alert(`Stoc insuficient! Disponibil: ${itemCurent.stoc_disponibil} ${itemCurent.um}, deja în factură: ${stocRezervat}`);
            }
        }

        let net = 0;
        if (tipProduse === 'marfă') {
            net = itemCurent.pret_unitar * quantity;
        } else {
            net = parseFloat(itemCurent.total_net);
            if (isNaN(net) || net <= 0) return alert('Introdu suma netă corectă!');

            if (tipProduse === 'mijloc fix') {
                const dataFactura = new Date(header.data_emitere);
                const prag = dataFactura < new Date('2026-01-01') ? 2500 : 5000;
                if (net < prag) return alert(`Valoarea trebuie să fie peste ${prag} RON.`);
            }
        }

        const valTva = net * (parseInt(itemCurent.cota_tva) / 100);
        const brut = net + valTva;

        setProduseLista([...produseLista, { ...itemCurent, cantitate: quantity, net, valTva, brut }]);
        resetFormularItem();
    };

    const stergeDinLista = (index) => {
        const nouaLista = [...produseLista];
        nouaLista.splice(index, 1);
        setProduseLista(nouaLista);
    };

    const handleStartEdit = (index) => {
        setIndexEditare(index);
        setItemInEditare({ ...produseLista[index] });
    };

    const handleSaveEdit = (index) => {
        const item = { ...itemInEditare };
        const quantity = parseFloat(item.cantitate);
        if (isNaN(quantity) || quantity <= 0) return alert('Cantitate invalidă');

        let net = 0;
        if (tipProduse === 'marfă') {
            net = item.pret_unitar * quantity;
        } else {
            net = parseFloat(item.total_net);
            if (isNaN(net) || net <= 0) return alert('Sumă netă invalidă');
        }
        item.net = net;
        item.cantitate = quantity;
        item.valTva = net * (parseInt(item.cota_tva) / 100);
        item.brut = net + item.valTva;

        const nouaLista = [...produseLista];
        nouaLista[index] = item;
        setProduseLista(nouaLista);
        setIndexEditare(-1);
        setItemInEditare(null);
    };

    const salveazaFactura = async () => {
        try {
            const payload = { ...header, tip_produse: tipProduse, produse: produseLista };
            await axios.post(`${process.env.REACT_APP_API_URL}/api/facturi`, payload, { headers: { Authorization: `Bearer ${token}` }});

            if (header.tip === 'primită' && tipProduse === 'marfă') {
                const resCmp = await axios.get(`${process.env.REACT_APP_API_URL}/api/marfuri/verificare-cmp`, { headers: { Authorization: `Bearer ${token}` }});
                if (resCmp.data.length > 0) {
                    setMarfuriAfectate(resCmp.data);
                    setShowCMPAlert(true);
                    return;
                }
            }

            alert('Factura salvată cu succes!');
            navigate('/facturi');
        } catch (e) {
            alert(e.response?.data?.message || 'Eroare la salvare.');
        }
    };

    const totalBrut = produseLista.reduce((acc, p) => acc + p.brut, 0);

    return (
        <div className="container-fluid" style={{ maxWidth: '960px' }}>

            {/* modal element negasit */}
            {showConfirmModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content text-center p-4">
                            <h5 className="mb-2">Element negăsit</h5>
                            <p className="text-muted mb-4">Dorești să-l adaugi în baza de date?</p>
                            <div className="d-flex justify-content-center gap-3">
                                <button className="btn btn-secondary" onClick={() => { setShowConfirmModal(false); setItemQuery(''); }}>Nu</button>
                                <button className="btn btn-primary" onClick={() => { setShowConfirmModal(false); tipProduse === 'marfă' ? setShowAddMarfaModal(true) : setShowAddObiectModal(true); }}>Da, adaugă</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* modal vanzare in pierdere */}
            <Modal show={showCMPAlert} onHide={() => {}} backdrop="static" keyboard={false} centered size="lg">
                <Modal.Header className="bg-danger text-white">
                    <Modal.Title><i className="bi bi-exclamation-triangle-fill me-2"></i>Vânzare în pierdere</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {marfuriAfectate.length > 0 ? (
                        <>
                            <p className="fw-bold">Mărfuri cu prețul de vânzare mai mic decât costul de achiziție (CMP):</p>
                            <div className="list-group">
                                {marfuriAfectate.map(m => (
                                    <div key={m.id} className="list-group-item d-flex justify-content-between align-items-center">
                                        <div>
                                            <span className="fw-bold">{m.denumire}</span><br/>
                                            <small className="text-danger">Vânzare: {m.pret_curent} RON | CMP: {parseFloat(m.cmp).toFixed(2)} RON</small>
                                        </div>
                                        <button className="btn btn-outline-primary btn-sm" onClick={() => handleSchimbaPretVanzare(m)}>Schimbă preț</button>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-3">
                            <i className="bi bi-check-circle text-success fs-1"></i>
                            <p className="mt-2">Nu mai există mărfuri cu prețul de vânzare mai mic decât CMP.</p>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    {marfuriAfectate.length > 0 ? (
                        <>
                            <Button variant="secondary" onClick={() => navigate('/facturi')}>Închide</Button>
                            <Button variant="primary" onClick={() => navigate('/marfuri', { state: { filterPierdere: true } })}>Vezi mărfuri</Button>
                        </>
                    ) : (
                        <Button variant="primary" onClick={() => navigate('/facturi')}>Închide</Button>
                    )}
                </Modal.Footer>
            </Modal>

            {/* submodal pret nou */}
            <Modal show={showSubModal} onHide={() => setShowSubModal(false)} centered size="sm">
                <Modal.Header closeButton>
                    <Modal.Title className="fs-5">Preț nou: {marfaDeEditat?.denumire}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Noul preț de vânzare (RON):</Form.Label>
                        <Form.Control
                            type="number"
                            value={noulPretVanzare}
                            onChange={(e) => setNoulPretVanzare(e.target.value)}
                            placeholder={`Peste ${marfaDeEditat ? parseFloat(marfaDeEditat.cmp).toFixed(2) : ''}`}
                        />
                        <Form.Text className="text-muted">Minim: {(parseFloat(marfaDeEditat?.cmp || 0) + 0.01).toFixed(2)} RON</Form.Text>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" size="sm" onClick={() => setShowSubModal(false)}>Renunță</Button>
                    <Button variant="primary" size="sm" onClick={handleSaveNewPrice}>Salvează</Button>
                </Modal.Footer>
            </Modal>

            <ModalAdaugareMarfa show={showAddMarfaModal} onClose={() => { setShowAddMarfaModal(false); setItemQuery(''); }} onSave={saveNewItemDatabase} denumireInitiala={itemQuery} />
            <ModalAdaugareObiect show={showAddObiectModal} onClose={() => { setShowAddObiectModal(false); setItemQuery(''); }} onSave={saveNewItemDatabase} denumireInitiala={itemQuery} />

            {/* header cu stepper */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="app-page-title">
                    <i className="bi bi-receipt"></i>Adăugare factură
                </h2>
                <span className="text-muted small">Operator: <strong>{user?.nume}</strong></span>
            </div>

            {/* stepper */}
            <div className="app-stepper mb-4">
                <div className={`app-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
                    <div className="app-step-circle">{step > 1 ? <i className="bi bi-check"></i> : '1'}</div>
                    <div className="app-step-label">Tip factură</div>
                </div>
                <div className={`app-step-line ${step > 1 ? 'done' : ''}`}></div>
                <div className={`app-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`}>
                    <div className="app-step-circle">{step > 2 ? <i className="bi bi-check"></i> : '2'}</div>
                    <div className="app-step-label">Detalii factură și partener</div>
                </div>
                <div className={`app-step-line ${step > 2 ? 'done' : ''}`}></div>
                <div className={`app-step ${step >= 3 ? 'active' : ''}`}>
                    <div className="app-step-circle">3</div>
                    <div className="app-step-label">Elemente factură</div>
                </div>
            </div>

            {/* pas 1 */}
            {step === 1 && (
                <div className="card col-md-6 mx-auto text-center">
                    <div className="card-body p-5">
                        <h5 className="mb-4" style={{ color: 'var(--primary)', fontWeight: 700 }}>Ce conține această factură?</h5>
                        <select className="form-select form-select-lg mb-4" value={tipProduse} onChange={e => setTipProduse(e.target.value)}>
                            <option value="marfă">Mărfuri</option>
                            <option value="mijloc fix">Mijloace fixe</option>
                            <option value="obiecte inventar">Obiecte de inventar</option>
                            <option value="servicii">Servicii / Utilități / Chirii</option>
                        </select>
                        <div className="d-flex gap-2">
                            <button className="btn btn-secondary w-50" onClick={() => navigate('/facturi')}>Renunță</button>
                            <button className="btn btn-primary w-50" onClick={handleNextStep1}>
                                Continuă <i className="bi bi-arrow-right ms-1"></i>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* pas 2 */}
            {step === 2 && (
                <div className="card">
                    <div className="card-body">
                        <div className="row g-3">
                            <div className="col-md-6 position-relative">
                                <label className="form-label">
                                    Partener {!header.id_partener && partenerQuery.length > 0 && <span className="text-danger">(Selectează din listă!)</span>}
                                </label>
                                <input
                                    className={`form-control ${!header.id_partener && partenerQuery.length > 0 ? 'is-invalid' : ''}`}
                                    value={partenerQuery}
                                    onChange={e => searchPartener(e.target.value)}
                                    placeholder="Caută partener..."
                                />
                                {sugestiiPartener && sugestiiPartener.length > 0 && (
                                    <ul className="list-group position-absolute w-100" style={{ zIndex: 1000 }}>
                                        {sugestiiPartener.map(p => (
                                            <li key={p.id} className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => selectPartener(p)}>
                                                <strong>{p.nume}</strong> <small className="text-muted">({p.tip_partener})</small>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">Număr factură</label>
                                <input type="number" className="form-control" value={header.numar} onChange={e => setHeader({...header, numar: e.target.value})} />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">Tip factură</label>
                                {tipProduse === 'marfă' ? (
                                    <select className="form-select" value={header.tip} onChange={e => setHeader({...header, tip: e.target.value, status: e.target.value})}>
                                        <option value="">Selectează...</option>
                                        <option value="emisă">Emisă (Vânzare)</option>
                                        <option value="primită">Primită (Achiziție)</option>
                                    </select>
                                ) : (
                                    <input type="text" className="form-control" value="Primită (Achiziție)" disabled />
                                )}
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">Data emitere</label>
                                <input type="date" className="form-control" value={header.data_emitere} onChange={e => setHeader({...header, data_emitere: e.target.value})} />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">Data scadență</label>
                                <input type="date" className="form-control" value={header.data_scadenta} onChange={e => setHeader({...header, data_scadenta: e.target.value})} />
                            </div>
                        </div>
                        <div className="d-flex justify-content-between mt-4">
                            <button className="btn btn-secondary" onClick={() => setStep(1)}>
                                <i className="bi bi-arrow-left me-1"></i>Înapoi
                            </button>
                            <button className="btn btn-primary" onClick={handleNextStep2}>
                                Continuă <i className="bi bi-arrow-right ms-1"></i>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* pas 3 */}
            {step === 3 && (
                <div>
                    {/* tabel produse */}
                    <div className="card mb-4">
                        <div className="card-header">
                            <span className="text-capitalize">Lista {tipProduse}</span>
                            {produseLista.length > 0 && (
                                <span className="ms-3 fw-bold" style={{ color: 'var(--accent)' }}>
                                    Total: {totalBrut.toFixed(2)} RON
                                </span>
                            )}
                        </div>
                        <div className="card-body p-0">
                            {produseLista.length === 0 ? (
                                <div className="app-empty py-4">
                                    <i className="bi bi-inbox d-block"></i>
                                    Niciun element adăugat încă
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table mb-0">
                                        <thead>
                                            <tr>
                                                <th>Denumire</th>
                                                <th>Cantitate</th>
                                                <th>Preț unitar / Net</th>
                                                <th>TVA</th>
                                                <th>Total brut</th>
                                                <th>Acțiuni</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {produseLista.map((p, idx) => (
                                                <tr key={idx}>
                                                    {indexEditare === idx ? (
                                                        <>
                                                            <td><input className="form-control form-control-sm" value={itemInEditare.denumire} onChange={e => setItemInEditare({...itemInEditare, denumire: e.target.value})} /></td>
                                                            <td><input type="number" className="form-control form-control-sm" value={itemInEditare.cantitate} onChange={e => setItemInEditare({...itemInEditare, cantitate: e.target.value})} /></td>
                                                            <td>
                                                                {tipProduse === 'marfă' ? (
                                                                    <input type="number" className="form-control form-control-sm" value={itemInEditare.pret_unitar} onChange={e => setItemInEditare({...itemInEditare, pret_unitar: e.target.value})} />
                                                                ) : (
                                                                    <input type="number" className="form-control form-control-sm" value={itemInEditare.total_net} onChange={e => setItemInEditare({...itemInEditare, total_net: e.target.value})} />
                                                                )}
                                                            </td>
                                                            <td>
                                                                <select className="form-select form-select-sm" value={itemInEditare.cota_tva} onChange={e => setItemInEditare({...itemInEditare, cota_tva: e.target.value})}>
                                                                    <option value="21">21%</option>
                                                                    <option value="11">11%</option>
                                                                    <option value="0">0%</option>
                                                                </select>
                                                            </td>
                                                            <td>-</td>
                                                            <td>
                                                                <div className="d-flex gap-1">
                                                                    <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(idx)}>Salvează</button>
                                                                    <button className="btn btn-secondary btn-sm" onClick={() => setIndexEditare(-1)}>Renunță</button>
                                                                </div>
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td>{p.denumire}</td>
                                                            <td>{(tipProduse === 'marfă' || tipProduse === 'obiecte inventar') ? `${p.cantitate} ${p.um}` : '-'}</td>
                                                            <td>{tipProduse === 'marfă' ? `${p.pret_unitar} RON` : `${p.net} RON`}</td>
                                                            <td>{p.cota_tva}%</td>
                                                            <td className="fw-bold text-success">{p.brut.toFixed(2)} RON</td>
                                                            <td>
                                                                <div className="d-flex gap-1">
                                                                    <button className="btn btn-outline-warning btn-sm" onClick={() => handleStartEdit(idx)}>Editează</button>
                                                                    <button className="btn btn-outline-danger btn-sm" onClick={() => stergeDinLista(idx)}>Șterge</button>
                                                                </div>
                                                            </td>
                                                        </>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* formular adaugare element */}
                    <div className="card mb-4">
                        <div className="card-header">Adaugă element pe factură</div>
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-md-6 position-relative">
                                    <label className="form-label text-capitalize">
                                        {tipProduse === 'marfă' || tipProduse === 'obiecte inventar' ? `Caută ${tipProduse === 'obiecte inventar' ? 'obiect' : 'marfă'}` : 'Denumire'}
                                    </label>
                                    {(tipProduse === 'marfă' || tipProduse === 'obiecte inventar') ? (
                                        <>
                                            <input className="form-control" value={itemQuery} onChange={e => searchItem(e.target.value)} onBlur={handleItemBlur} placeholder="Caută..." />
                                            {sugestiiItem && sugestiiItem.length > 0 && (
                                                <ul className="list-group position-absolute w-100" style={{ zIndex: 1000 }}>
                                                    {sugestiiItem.map(i => (
                                                        <li key={i.id} className="list-group-item list-group-item-action"
                                                            style={{ cursor: 'pointer' }}
                                                            onMouseDown={(e) => { e.preventDefault(); selectItem(i); }}>
                                                            {i.denumire} {i.pret_curent ? `- ${i.pret_curent} RON` : ''}
                                                            <br/><small className="text-muted">Stoc: {i.stoc_curent} {i.um}</small>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </>
                                    ) : (
                                        <input className="form-control" value={itemCurent.denumire} onChange={e => setItemCurent({...itemCurent, denumire: e.target.value})} placeholder="Introduceți denumirea" />
                                    )}
                                </div>

                                {tipProduse === 'servicii' && (
                                    <div className="col-md-3">
                                        <label className="form-label">Cont Contabil</label>
                                        <select className="form-select" value={itemCurent.cont_contabil || ''} onChange={e => setItemCurent({ ...itemCurent, cont_contabil: e.target.value })}>
                                            <option value="">Selectează...</option>
                                            <option value="605">605 - energie și apă</option>
                                            <option value="6058">6058 - alte utilități</option>
                                            <option value="626">626 - telecomunicații</option>
                                            <option value="611">611 - întreținere/reparații</option>
                                            <option value="612">612 - chirii</option>
                                            <option value="628">628 - alte servicii</option>
                                        </select>
                                    </div>
                                )}

                                {(tipProduse === 'marfă' || tipProduse === 'obiecte inventar') && (
                                    <div className="col-md-2">
                                        <label className="form-label">Cantitate</label>
                                        <input type="number" className="form-control" value={itemCurent.cantitate} onChange={e => setItemCurent({...itemCurent, cantitate: e.target.value})} />
                                    </div>
                                )}

                                {tipProduse === 'marfă' && (
                                    <div className="col-md-3">
                                        <label className="form-label">{header.tip === 'emisă' ? 'Preț Vânzare' : 'Preț Cumpărare'}</label>
                                        <input type="number" className="form-control" value={itemCurent.pret_unitar} onChange={e => setItemCurent({...itemCurent, pret_unitar: e.target.value})} />
                                    </div>
                                )}

                                {tipProduse !== 'marfă' && (
                                    <div className="col-md-2">
                                        <label className="form-label">Total net (RON)</label>
                                        <input type="number" className="form-control" value={itemCurent.total_net} onChange={e => setItemCurent({...itemCurent, total_net: e.target.value})} />
                                    </div>
                                )}

                                <div className="col-md-2">
                                    <label className="form-label">Cota TVA</label>
                                    {isAdmin ? (
                                        <select className="form-select" value={itemCurent.cota_tva} onChange={e => setItemCurent({...itemCurent, cota_tva: e.target.value})}>
                                            <option value="21">21%</option>
                                            <option value="11">11%</option>
                                            <option value="0">0%</option>
                                        </select>
                                    ) : (
                                        <input className="form-control" value={`${itemCurent.cota_tva}%`} disabled />
                                    )}
                                </div>

                                <div className="col-12 d-flex justify-content-end gap-2">
                                    <button className="btn btn-secondary btn-sm" onClick={resetFormularItem}>Resetează</button>
                                    <button className="btn btn-primary" onClick={adaugaInLista}>
                                        <i className="bi bi-plus me-1"></i>
                                        Adaugă {tipProduse === 'marfă' ? 'marfă' : tipProduse === 'obiecte inventar' ? 'obiect' : tipProduse === 'mijloc fix' ? 'mijloc fix' : 'serviciu'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="d-flex justify-content-between">
                        <button className="btn btn-secondary" onClick={() => setStep(2)}>
                            <i className="bi bi-arrow-left me-1"></i>Înapoi
                        </button>
                        {produseLista.length > 0 && (
                            <button className="btn btn-primary btn-lg" onClick={salveazaFactura}>
                                <i className="bi bi-check2-circle me-2"></i>Salvează factura
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdaugareFactura;