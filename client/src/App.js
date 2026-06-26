import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';

// pagina principala + editare
import Firma from './pages/Firma';
import EditareFirma from './pages/EditareFirma';

// pagini publice
import Login from './pages/Login';
import Register from './pages/Register';
import PlataSuccess from './pages/PlataSuccess';

// restul paginilor
import Parteneri from './pages/Parteneri';
import AdaugarePartener from './pages/AdaugarePartener';
import EditarePartener from './pages/EditarePartener';
import FacturiPartener from './pages/FacturiPartener';
import Navbar from './components/Navbar';
import Marfuri from './pages/Marfuri';
import AdaugareMarfa from './pages/AdaugareMarfa';
import EditareMarfa from './pages/EditareMarfa';
import DetaliiMarfa from './pages/DetaliiMarfa.js';
import Facturi from './pages/Facturi';
import AdaugareFactura from './pages/AdaugareFactura';
import DetaliiFactura from './pages/DetaliiFactura';
import EditareFactura from './pages/EditareFactura';
import PlataFactura from './pages/PlataFactura';
import MijloaceFixe from './pages/MijloaceFixe';
import AdaugareMijlocFix from './pages/AdaugareMijlocFix';
import EditareMijlocFix from './pages/EditareMijlocFix';
import DetaliiMijlocFix from './pages/DetaliiMijlocFix';
import IstoricAmortizari from './pages/IstoricAmortizari';
import Plati from './pages/Plati';
import CalendarFacturi from './pages/CalendarFacturi';
import ObiecteInventar from './pages/ObiecteInventar';
import AdaugareObiectInventar from './pages/AdaugareObiectInventar';
import EditareObiectInventar from './pages/EditareObiectInventar';
import DetaliiObiectInventar from './pages/DetaliiObiectInventar';
import NoteContabile from './pages/NoteContabile';
import DetaliiNotaContabila from './pages/DetaliiNotaContabila';

const PrivateRoute = ({ children }) => {
  const token = sessionStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" />;
};

// pagini fara navbar (login, register, plata success)
const noNavbarPaths = ['/login', '/register', '/plata-success'];

const Layout = ({ children }) => {
  const location = useLocation();
  const showNavbar = !noNavbarPaths.some(p => location.pathname.startsWith(p));

  return (
    <>
      {showNavbar && <Navbar />}
      <div className={showNavbar ? 'app-page-wrapper' : ''}>
        {children}
      </div>
    </>
  );
};

function App() {
  useEffect(() => {
    let timer;

    const logoutUser = () => {
      console.log('Sesiune expirată din cauza inactivității.');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
    };

    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(logoutUser, 3600000); // 1h
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll'];

    if (sessionStorage.getItem('token')) {
      events.forEach(event => window.addEventListener(event, resetTimer));
      resetTimer();
    }

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <Router>
      <Layout>
        <Routes>
          {/* rute publice */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/plata-success" element={<PlataSuccess />} />

          {/* rute firma */}
          <Route path="/" element={<PrivateRoute><Firma /></PrivateRoute>} />
          <Route path="/firma" element={<PrivateRoute><Firma /></PrivateRoute>} />
          <Route path="/dashboard" element={<Navigate to="/firma" />} />
          <Route path="/editare-firma" element={<PrivateRoute><EditareFirma /></PrivateRoute>} />

          {/* rute parteneri */}
          <Route path="/parteneri" element={<PrivateRoute><Parteneri /></PrivateRoute>} />
          <Route path="/parteneri/adaugare" element={<PrivateRoute><AdaugarePartener /></PrivateRoute>} />
          <Route path="/parteneri/editare/:id" element={<PrivateRoute><EditarePartener /></PrivateRoute>} />
          <Route path="/parteneri/facturi/:id" element={<PrivateRoute><FacturiPartener /></PrivateRoute>} />

          {/* rute marfuri */}
          <Route path="/marfuri" element={<PrivateRoute><Marfuri /></PrivateRoute>} />
          <Route path="/marfuri/adaugare" element={<PrivateRoute><AdaugareMarfa /></PrivateRoute>} />
          <Route path="/marfuri/editare/:id" element={<PrivateRoute><EditareMarfa /></PrivateRoute>} />
          <Route path="/marfuri/detalii/:id" element={<PrivateRoute><DetaliiMarfa /></PrivateRoute>} />

          {/* rute obiecte inventar */}
          <Route path="/obiecte-inventar" element={<PrivateRoute><ObiecteInventar /></PrivateRoute>} />
          <Route path="/obiecte-inventar/adaugare" element={<PrivateRoute><AdaugareObiectInventar /></PrivateRoute>} />
          <Route path="/obiecte-inventar/editare/:id" element={<PrivateRoute><EditareObiectInventar /></PrivateRoute>} />
          <Route path="/obiecte-inventar/detalii/:id" element={<PrivateRoute><DetaliiObiectInventar /></PrivateRoute>} />

          {/* rute facturi */}
          <Route path="/facturi" element={<PrivateRoute><Facturi /></PrivateRoute>} />
          <Route path="/facturi/adaugare" element={<PrivateRoute><AdaugareFactura /></PrivateRoute>} />
          <Route path="/facturi/detalii/:id" element={<PrivateRoute><DetaliiFactura /></PrivateRoute>} />
          <Route path="/facturi/editare/:id" element={<PrivateRoute><EditareFactura /></PrivateRoute>} />
          <Route path="/plata-factura" element={<PrivateRoute><PlataFactura /></PrivateRoute>} />

          {/* rute mijloace fixe */}
          <Route path="/mijloace-fixe" element={<PrivateRoute><MijloaceFixe /></PrivateRoute>} />
          <Route path="/mijloace-fixe/adaugare" element={<PrivateRoute><AdaugareMijlocFix /></PrivateRoute>} />
          <Route path="/mijloace-fixe/editare/:id" element={<PrivateRoute><EditareMijlocFix /></PrivateRoute>} />
          <Route path="/mijloace-fixe/detalii/:id" element={<PrivateRoute><DetaliiMijlocFix /></PrivateRoute>} />
          <Route path="/istoric-amortizari" element={<PrivateRoute><IstoricAmortizari /></PrivateRoute>} />

          {/* ruta calendar */}
          <Route path="/calendar-facturi" element={<PrivateRoute><CalendarFacturi /></PrivateRoute>} />

          {/* ruta plati */}
          <Route path="/plati" element={<PrivateRoute><Plati /></PrivateRoute>} />

          {/* rute note contabile */}
          <Route path="/note-contabile" element={<PrivateRoute><NoteContabile /></PrivateRoute>} />
          <Route path="/note-contabile/detalii/:id" element={<PrivateRoute><DetaliiNotaContabila /></PrivateRoute>} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;