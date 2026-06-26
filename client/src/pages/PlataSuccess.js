import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

// pagina publica (nu necesita autentificare)
function PlataSuccess() {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('loading');
    const [nrFactura, setNrFactura] = useState('');

    useEffect(() => {
        const sessionId = searchParams.get('session_id');
        const facturaId = searchParams.get('factura_id');

        if (!sessionId || !facturaId) {
            setStatus('error');
            return;
        }

        if (sessionId === 'cancelled') {
            setStatus('cancelled');
            return;
        }

        const confirmPlata = async () => {
            try {
                const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/plati/confirm-checkout-session`,
                    { session_id: sessionId, id_factura: facturaId }
                    // fara header authorization, ruta e publica
                );
                if (res.data.success) {
                    setNrFactura(res.data.nr_factura || facturaId);
                    setStatus('success');
                } else {
                    setStatus('error');
                }
            } catch (e) {
                // daca plata a fost deja confirmata anterior, tot afisam succes
                if (e.response?.status === 409) {
                    setStatus('success');
                } else {
                    setStatus('error');
                }
            }
        };

        confirmPlata();
    }, [searchParams]);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #3d1a6e 0%, #5a2a9e 40%, #9b59d0 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Inter', 'Segoe UI', sans-serif"
        }}>
            <div style={{
                background: 'white',
                borderRadius: '20px',
                padding: '48px 40px',
                maxWidth: '440px',
                width: '90%',
                textAlign: 'center',
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
            }}>
                {status === 'loading' && (
                    <>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⏳</div>
                        <h2 style={{ color: '#3d1a6e', fontWeight: 800, marginBottom: '8px' }}>
                            Se procesează plata...
                        </h2>
                        <p style={{ color: '#7a7a9a', fontSize: '0.95rem' }}>
                            Te rugăm să aștepți câteva secunde.
                        </p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div style={{
                            width: '72px', height: '72px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #198754, #0f5132)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 20px', fontSize: '2rem', color: 'white'
                        }}>
                            ✓
                        </div>
                        <h2 style={{ color: '#3d1a6e', fontWeight: 800, marginBottom: '8px' }}>
                            Plată confirmată!
                        </h2>
                        <p style={{ color: '#7a7a9a', fontSize: '0.95rem' }}>
                            Plata pentru {nrFactura ? `factura #${nrFactura}` : 'această factură'} a fost
                            înregistrată cu succes. Mulțumim!
                        </p>
                    </>
                )}

                {(status === 'error' || status === 'cancelled') && (
                    <>
                        <div style={{
                            width: '72px', height: '72px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #dc3545, #842029)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 20px', fontSize: '2rem', color: 'white'
                        }}>
                            ✗
                        </div>
                        <h2 style={{ color: '#3d1a6e', fontWeight: 800, marginBottom: '8px' }}>
                            Plată anulată
                        </h2>
                        <p style={{ color: '#7a7a9a', fontSize: '0.95rem', marginBottom: '28px' }}>
                            Nu am putut confirma plata. Contactează administratorul.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}

export default PlataSuccess;
