import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

function Login() {
    const [formData, setFormData] = useState({ identifier: '', parola: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/users/login` , formData);
            sessionStorage.setItem('token', res.data.token);
            sessionStorage.setItem('user', JSON.stringify(res.data.user));
            navigate('/firma'); // redirectionare la pagina principala

        } catch (err) {
            setError(err.response?.data?.message || 'Eroare la autentificare');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo" style={{ background: 'none', padding: 0 }}>
                    <img src="/apple-touch-icon.png" alt="EnGrosApp" style={{ width: '56px', height: '56px', objectFit: 'contain' }} />
                </div>
                <h1 className="auth-title">EnGrosApp</h1>
                <p className="auth-subtitle">Autentifică-te pentru a continua</p>

                {error && <div className="alert alert-danger">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label">Email sau nume de utilizator</label>
                        <input
                            type="text"
                            name="identifier"
                            className="form-control"
                            placeholder="email@exemplu.ro"
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="form-label">Parolă</label>
                        <input
                            type="password"
                            name="parola"
                            className="form-control"
                            placeholder="••••••••"
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary w-100">
                        <i className="bi bi-box-arrow-in-right me-2"></i>Intră în cont
                    </button>
                </form>

                <div className="text-center mt-4" style={{ fontSize: '0.88rem' }}>
                    <span className="text-muted">Nu ai cont? </span>
                    <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
                        Înregistrează-te
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default Login;
