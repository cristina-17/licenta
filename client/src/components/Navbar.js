import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();

    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const token = sessionStorage.getItem('token');

    const [isOpen, setIsOpen] = useState(true);
    const [numeFirma, setNumeFirma] = useState('GESTIFY');

    useEffect(() => {
        if (!token || !user?.id) return;

        const fetchFirma = async () => {
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/firme`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setNumeFirma(res.data.nume);
            } catch (err) { console.error('Eroare preluare nume firma:', err); }
        };
        fetchFirma();

        document.body.style.transition = 'margin-left 0.3s ease';
        document.body.style.marginLeft = isOpen ? '260px' : '70px';

        return () => { document.body.style.marginLeft = '0px'; };
    }, [isOpen, user, token]);

    const handleLogout = () => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        document.body.style.marginLeft = '0px';
        navigate('/login');
    };

    if (!token || !user?.id) return null;

    const checkActive = (path) => location.pathname.startsWith(path);

    return (
        <>
            {/* topbar */}
            <div className={`app-topbar ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
                <div className="d-flex align-items-center gap-3">
                    {/* buton inchidere/deschidere in topbar */}
                    <button
                        className="btn btn-sm btn-outline-secondary border-0"
                        onClick={() => setIsOpen(!isOpen)}
                        title={isOpen ? 'Comprimă meniu' : 'Extinde meniu'}
                    >
                        <i className={`bi ${isOpen ? 'bi-text-indent-right' : 'bi-list'} fs-5`}></i>
                    </button>
                    <span className="app-brand-name">{numeFirma}</span>
                </div>

                <div className="d-flex align-items-center gap-3">
                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                        Salut, <strong>{user.nume}</strong>
                    </span>
                    <button className="btn-logout" onClick={handleLogout}>
                        <i className="bi bi-box-arrow-right me-1"></i>Deconectare
                    </button>
                </div>
            </div>

             {/* sidebar */}
            <div className={`app-sidebar ${isOpen ? 'open' : 'closed'}`}>
                {/* header sidebar cu butonul < > */}
                <div className={`sidebar-header ${isOpen ? 'justify-content-end px-3' : 'justify-content-center'}`}>
                    <button
                        className="sidebar-toggle-btn"
                        onClick={() => setIsOpen(!isOpen)}
                        title={isOpen ? 'Comprimă' : 'Extinde'}
                    >
                        <span style={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1 }}>
                            {isOpen ? '<' : '>'}
                        </span>
                    </button>
                </div>

                {/* navigatie */}
                <div style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1 }}>

                    {/* acasa */}
                    <Link
                        to="/firma"
                        className={`nav-link-item ${location.pathname === '/firma' || location.pathname === '/' ? 'active' : ''}`}
                    >
                        <i className="bi bi-house-door"></i>
                        {isOpen && <span className="ms-3">Acasă</span>}
                    </Link>

                    {/* parteneri */}
                    <div>
                        <div
                            className={`nav-link-item ${checkActive('/parteneri') ? 'active' : ''}`}
                            onClick={() => navigate('/parteneri')}
                        >
                            <i className="bi bi-people"></i>
                            {isOpen && (
                                <div className="d-flex justify-content-between w-100 align-items-center ms-3">
                                    <span>Parteneri</span>
                                    <i className="bi bi-caret-down-fill" style={{ fontSize: '0.65em', opacity: 0.7 }}></i>
                                </div>
                            )}
                        </div>
                        <div className={`collapse ${checkActive('/parteneri') && isOpen ? 'show' : ''} sub-nav`}>
                            {isOpen && (
                                <>
                                    <Link to="/parteneri?tip=client" className="sub-link">Clienți</Link>
                                    <Link to="/parteneri?tip=furnizor" className="sub-link">Furnizori</Link>
                                    <Link to="/parteneri" className="sub-link">Toți partenerii</Link>
                                </>
                            )}
                        </div>
                    </div>

                    {/* marfuri */}
                    <Link to="/marfuri" className={`nav-link-item ${checkActive('/marfuri') ? 'active' : ''}`}>
                        <i className="bi bi-boxes"></i>
                        {isOpen && <span className="ms-3">Mărfuri</span>}
                    </Link>

                    {/* obiecte inventar */}
                    <Link to="/obiecte-inventar" className={`nav-link-item ${checkActive('/obiecte-inventar') ? 'active' : ''}`}>
                        <i className="bi bi-box-seam"></i>
                        {isOpen && <span className="ms-3">Obiecte de inventar</span>}
                    </Link>

                    {/* mijloace fixe */}
                    <div>
                        <div
                            className={`nav-link-item ${checkActive('/mijloace-fixe') ? 'active' : ''}`}
                            onClick={() => navigate('/mijloace-fixe')}
                        >
                            <i className="bi bi-pc-display"></i>
                            {isOpen && (
                                <div className="d-flex justify-content-between w-100 align-items-center ms-3">
                                    <span>Mijloace fixe</span>
                                    <i className="bi bi-caret-down-fill" style={{ fontSize: '0.65em', opacity: 0.7 }}></i>
                                </div>
                            )}
                        </div>
                        <div className={`collapse ${checkActive('/mijloace-fixe') && isOpen ? 'show' : ''} sub-nav`}>
                            {isOpen && (
                                <>
                                    <Link to="/mijloace-fixe?status=activ" className="sub-link">Active</Link>
                                    <Link to="/mijloace-fixe?status=casat" className="sub-link">Casate</Link>
                                    <Link to="/mijloace-fixe" className="sub-link">Toate mijloacele</Link>
                                </>
                            )}
                        </div>
                    </div>

                    {/* istoric amortizari */}
                    <Link to="/istoric-amortizari" className={`nav-link-item ${checkActive('/istoric-amortizari') ? 'active' : ''}`}>
                        <i className="bi bi-graph-down"></i>
                        {isOpen && <span className="ms-3">Istoric amortizări</span>}
                    </Link>

                    {/* facturi */}
                    <div>
                        <div
                            className={`nav-link-item ${checkActive('/facturi') ? 'active' : ''}`}
                            onClick={() => navigate('/facturi')}
                        >
                            <i className="bi bi-receipt"></i>
                            {isOpen && (
                                <div className="d-flex justify-content-between w-100 align-items-center ms-3">
                                    <span>Facturi</span>
                                    <i className="bi bi-caret-down-fill" style={{ fontSize: '0.65em', opacity: 0.7 }}></i>
                                </div>
                            )}
                        </div>
                        <div className={`collapse ${checkActive('/facturi') && isOpen ? 'show' : ''} sub-nav`}>
                            {isOpen && (
                                <>
                                    <Link to="/facturi?tip=emisă" className="sub-link">Facturi emise (vânzări)</Link>
                                    <Link to="/facturi?tip=primită" className="sub-link">Facturi primite (achiziții)</Link>
                                    <Link to="/facturi" className="sub-link">Toate facturile</Link>
                                </>
                            )}
                        </div>
                    </div>

                    {/* plati */}
                    <div>
                        <div
                            className={`nav-link-item ${checkActive('/plati') ? 'active' : ''}`}
                            onClick={() => navigate('/plati')}
                        >
                            <i className="bi bi-cash-coin"></i>
                            {isOpen && (
                                <div className="d-flex justify-content-between w-100 align-items-center ms-3">
                                    <span>Plăți</span>
                                    <i className="bi bi-caret-down-fill" style={{ fontSize: '0.65em', opacity: 0.7 }}></i>
                                </div>
                            )}
                        </div>
                        <div className={`collapse ${checkActive('/plati') && isOpen ? 'show' : ''} sub-nav`}>
                            {isOpen && (
                                <>
                                    <Link to="/plati?tip=plată" className="sub-link">Plăți efectuate</Link>
                                    <Link to="/plati?tip=încasare" className="sub-link">Plăți încasate</Link>
                                    <Link to="/plati" className="sub-link">Toate plățile</Link>
                                </>
                            )}
                        </div>
                    </div>

                    {/* calendar */}
                    <Link to="/calendar-facturi" className={`nav-link-item ${checkActive('/calendar-facturi') ? 'active' : ''}`}>
                        <i className="bi bi-calendar-date"></i>
                        {isOpen && <span className="ms-3">Calendar scadențe</span>}
                    </Link>

                    {/* note contabile */}
                    <Link to="/note-contabile" className={`nav-link-item ${checkActive('/note-contabile') ? 'active' : ''}`}>
                        <i className="bi bi-journal-text"></i>
                        {isOpen && <span className="ms-3">Note contabile</span>}
                    </Link>
                </div>
            </div>
        </>
    );
}

export default Navbar;