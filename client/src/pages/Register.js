import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
    const [formData, setFormData] = useState({
        nume: '', prenume: '', nume_utilizator: '', email: '', parola: ''
    });
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${process.env.REACT_APP_API_URL}/api/users/register`, formData);
            setMessage('Cont creat cu succes! Te redirecționăm...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Eroare la înregistrare');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <i className="bi bi-person-plus"></i>
                </div>
                <h1 className="auth-title">Cont nou</h1>
                <p className="auth-subtitle">Completează datele pentru a crea contul</p>

                {message && (
                    <div className={`alert ${message.includes('succes') ? 'alert-success' : 'alert-danger'}`}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="row g-3 mb-3">
                        <div className="col-6">
                            <label className="form-label">Nume</label>
                            <input type="text" name="nume" className="form-control" onChange={handleChange} required />
                        </div>
                        <div className="col-6">
                            <label className="form-label">Prenume</label>
                            <input type="text" name="prenume" className="form-control" onChange={handleChange} required />
                        </div>
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Nume utilizator</label>
                        <input type="text" name="nume_utilizator" className="form-control" onChange={handleChange} required />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Email</label>
                        <input type="email" name="email" className="form-control" onChange={handleChange} required />
                    </div>
                    <div className="mb-4">
                        <label className="form-label">Parolă</label>
                        <input type="password" name="parola" className="form-control" onChange={handleChange} required />
                    </div>
                    <button type="submit" className="btn btn-primary w-100">
                        <i className="bi bi-person-check me-2"></i>Creează cont
                    </button>
                </form>

                <div className="text-center mt-4" style={{ fontSize: '0.88rem' }}>
                    <span className="text-muted">Ai deja cont? </span>
                    <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
                        Autentifică-te
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default Register;