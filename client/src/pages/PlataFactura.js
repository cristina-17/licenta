import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';

// cheia publica din .env
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

function CheckoutForm({ facturaData }) {
    const stripe = useStripe();
    const elements = useElements();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setLoading(true);
        setMessage('');

        try {
            const token = sessionStorage.getItem('token');

            // cerere permisiune de la backend
            const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/plati/create-payment-intent`, {
                id_factura: facturaData.facturaId
            }, { headers: { Authorization: `Bearer ${token}` } });

            const clientSecret = res.data.clientSecret;

            // procesare card
            const result = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: elements.getElement(CardElement),
                    billing_details: { name: facturaData.partenerNume },
                }
            });

            if (result.error) {
                setMessage(`Eroare: ${result.error.message}`);
            } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
                // confirmare ca se actualizeaza baza de date
                await axios.post(`${process.env.REACT_APP_API_URL}/api/plati/confirm-payment`, {
                    paymentIntentId: result.paymentIntent.id,
                    id_factura: facturaData.facturaId,
                    metoda_plata: 'card'
                }, { headers: { Authorization: `Bearer ${token}` } });

                alert("Plată efectuată cu succes!");
                navigate('/plati');
            }
        } catch (err) {
            console.error(err);
            setMessage('A apărut o eroare la procesare.');
        }
        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="mt-4 p-4 border rounded bg-light">
            <h5 className="mb-3 text-secondary">Detalii card bancar</h5>
            <div className="mb-4 bg-white p-3 border rounded">
                <CardElement options={{hidePostalCode: true}} />
            </div>
            {message && <div className="alert alert-danger">{message}</div>}

            <div className="d-flex justify-content-center gap-3">
                <button type="button" className="btn btn-secondary btn-lg" onClick={() => navigate(-1)}>Renunță</button>
                <button type="submit" className="btn btn-primary btn-lg" disabled={!stripe || loading}>
                    {loading ? 'Se procesează...' : `Plătește ${facturaData.totalBrut} RON`}
                </button>
            </div>
        </form>
    );
}

function PlataFactura() {
    const { state } = useLocation();
    const navigate = useNavigate();

    if (!state || !state.facturaId) {
        return (
            <div className="container mt-5 text-center">
                <h3 className="text-danger">Eroare: nicio factură selectată pentru plată.</h3>
                <button className="btn btn-primary mt-3" onClick={() => navigate('/facturi')}>Înapoi la facturi</button>
            </div>
        );
    }

    return (
        <div className="container-fluid">
            <div className="row justify-content-center">
                <div className="col-md-7">
                    <div className="card">
                        <h2 className="text-success mb-4 text-center">
                            <i className="bi bi-shield-lock-fill me-2"></i>Plată securizată Stripe
                        </h2>

                        <div className="alert alert-info">
                            <p className="mb-1"><strong>Către:</strong> {state.partenerNume}</p>
                            <p className="mb-1"><strong>Document:</strong> Factura #{state.nrFactura}</p>
                            <p className="mb-0 fs-5"><strong>Total de plată:</strong> <span className="fw-bold text-danger">{state.totalBrut} RON</span></p>
                        </div>

                        {/* sistem de securitate stripe pt formular */}
                        <Elements stripe={stripePromise}>
                            <CheckoutForm facturaData={state} />
                        </Elements>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PlataFactura;