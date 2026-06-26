import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function DetaliiFactura() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [factura, setFactura] = useState(null);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const fetchFactura = useCallback(async () => {
            try {
                const token = sessionStorage.getItem('token');
                const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/facturi/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setFactura(res.data);
                setLoading(false);
            } catch (error) {
                console.error(error);
                alert("Nu am putut încărca factura.");
                navigate('/facturi');
            }
        }, [id, navigate]);

        useEffect(() => {
            fetchFactura();
        }, [id]);


        // export csv
        const exportToCSV = async () => {
        if (!factura || !factura.produse) return;

        const isEmisaExport = factura.tip === 'emisă';
        const isMarfaExport = factura.tip_produse === 'marfă';

        const furnizorExport = isEmisaExport ? factura.firma_proprie : { nume: factura.partener_nume, cui: factura.partener_cui, adresa: factura.partener_adresa, iban: factura.partener_iban };
        const clientExport = isEmisaExport ? { nume: factura.partener_nume, cui: factura.partener_cui, adresa: factura.partener_adresa, iban: factura.partener_iban } : factura.firma_proprie;

        let csvContent = "\uFEFF"; // pt diacritice

        // detalii factura
        csvContent += `DETALII FACTURA,${factura.numar}\n`;
        csvContent += `Data Emitere,${new Date(factura.data_emitere).toLocaleDateString('ro-RO')}\n`;
        csvContent += `Data Exigibilitatii,${new Date(factura.data_emitere).toLocaleDateString('ro-RO')}\n`;
        csvContent += `Data Scadentei,${new Date(factura.data_scadenta).toLocaleDateString('ro-RO')}\n\n`;

        // detalii furnizor
        csvContent += `FURNIZOR,${(furnizorExport?.nume || "").replace(/,/g, ' ')}\n`;
        csvContent += `CUI Furnizor,${furnizorExport?.cui || ""}\n`;
        csvContent += `Adresa Furnizor,${(furnizorExport?.adresa || "").replace(/,/g, ' ')}\n`;
        csvContent += `IBAN Furnizor,${furnizorExport?.iban || ""}\n\n`;

        // detalii client
        csvContent += `CLIENT,${(clientExport?.nume || "").replace(/,/g, ' ')}\n`;
        csvContent += `CUI Client,${clientExport?.cui || ""}\n`;
        csvContent += `Adresa Client,${(clientExport?.adresa || "").replace(/,/g, ' ')}\n`;
        csvContent += `IBAN Client,${clientExport?.iban || ""}\n\n`;

        // antet, diferit pt marfuri (pret vanzare daca e emisa si pret cumparare daca e primita)
        let headers = ["Denumire", "Cantitate/UM"];
        if (isMarfaExport) headers.push(isEmisaExport ? "Pret Vanzare" : "Pret Cumparare");
        headers.push("Cota TVA (%)", "Suma TVA", "Total Net", "Total TVA", "Total Brut");
        csvContent += headers.join(",") + "\n";

        // inregistrarile elementelor de pe factura
        factura.produse.forEach((p) => {
            let row = [`"${p.denumire.replace(/"/g, '""')}"`, `${parseFloat(p.cantitate).toFixed(2)} ${p.um || ''}`];
            if (isMarfaExport) row.push(parseFloat(isEmisaExport ? (p.pret_unitar_vanzare || 0) : (p.pret_unitar_cumparare || 0)).toFixed(2));
            row.push(p.cota_tva, parseFloat(p.suma_tva || 0).toFixed(2), parseFloat(p.total_net).toFixed(2), parseFloat(p.suma_tva || 0).toFixed(2), parseFloat(p.total_brut).toFixed(2));
            csvContent += row.join(",") + "\n";
        });

        // calcul total net, total tva, total factura
        csvContent += `\n,TOTAL NET,,,,${parseFloat(factura.total_net).toFixed(2)} RON\n`;
        csvContent += `,TOTAL TVA,,,,${parseFloat(factura.suma_tva).toFixed(2)} RON\n`;
        csvContent += `,TOTAL FACTURA,,,,${parseFloat(factura.total_brut).toFixed(2)} RON\n`;

        // descarcare fisier
        try {
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            if (window.showSaveFilePicker) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: `Factura_${factura.numar}.csv`,
                    types: [{ description: 'CSV File', accept: { 'text/csv': ['.csv'] } }],
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
            } else {
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `Factura_${factura.numar}.csv`);
                link.click();
            }
        } catch (err) {
            console.log("Salvare CSV anulată.");
        }
    };

    // export pdf
    const exportToPDF = async () => {
        // selectare elementului cu factura
        const input = document.getElementById('pdf-export-container');

        if (!input) {
            alert("Eroare: Factura pentru export PDF nu a fost găsită.");
            return;
        }

        // captura a elementelor componente (antet, cap tabel, randuri, totaluri)
        const pdf = new jsPDF('p', 'mm', 'a4'); // format a4 (portret)
        const margin = 15;
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const contentWidth = pdfWidth - 2 * margin;

        // captura partile din container
        const header = document.getElementById('pdf-header-part');
        const tableHeader = document.getElementById('pdf-table-header');
        const rows = document.querySelectorAll('.pdf-row-item');
        const footer = document.getElementById('pdf-footer-part');

        const capture = async (el) => {
            if (!el) return { img: "", h: 0 };
            const canvas = await html2canvas(el, {
                scale: 2, // claritate text
                useCORS: true, // pt integrare imagini/fonturi externe
                logging: false
            });
            return {
                img: canvas.toDataURL('image/png'),
                h: (canvas.height * contentWidth) / canvas.width
            };
        };

        // captura partile fixe
        const headerImg = await capture(header);
        const tHeadImg = await capture(tableHeader);
        const footerImg = await capture(footer);

        let currentY = margin;

        // adaugare antet si cap de tabel pe paginile noi
        const startNewPage = () => {
            pdf.addImage(headerImg.img, 'PNG', margin, margin, contentWidth, headerImg.h);
            pdf.addImage(tHeadImg.img, 'PNG', margin, margin + headerImg.h, contentWidth, tHeadImg.h);
            return margin + headerImg.h + tHeadImg.h + 2;
        };

        // pagini document
        currentY = startNewPage();

        // verificare daca randul incape in pagina
        for (let i = 0; i < rows.length; i++) {
            const rowData = await capture(rows[i]);

            // calculam daca randul (si footerul) incape in  pag
            const spaceNeeded = rowData.h + (i === rows.length - 1 ? footerImg.h : 0);

            if (currentY + spaceNeeded > pdfHeight - margin - 10) {
                pdf.addPage();
                currentY = startNewPage();
            }

            pdf.addImage(rowData.img, 'PNG', margin, currentY, contentWidth, rowData.h);
            currentY += rowData.h;
        }

        // adaugare sectiune totaluri
        if (currentY + footerImg.h > pdfHeight - margin) {
            pdf.addPage();
            currentY = startNewPage();
        }
        pdf.addImage(footerImg.img, 'PNG', margin, currentY, contentWidth, footerImg.h);

        // numerotare pagina
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            pdf.setFontSize(9);
            pdf.setTextColor(100);
            pdf.text(`${i}/${totalPages}`, pdfWidth - margin - 10, pdfHeight - 10);
        }

        // setare nume document
        const numeFisier = `Factura_${factura.numar}`;
        pdf.setProperties({ title: numeFisier });

        // deschidere in tab nou
        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    };

    const handleCashPayment = async () => {
        if (!window.confirm(`Confirmați înregistrarea cash pentru această factură?`)) return;

        try {
            const token = sessionStorage.getItem('token');
            await axios.post(`${process.env.REACT_APP_API_URL}/api/plati`, {
                id_factura: factura.id,
                metoda_plata: 'cash'
            }, { headers: { Authorization: `Bearer ${token}` } });

            alert("Tranzacție cash înregistrată cu succes!");
            fetchFactura();
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Eroare la procesarea plății cash.";
            alert(errorMsg);
        }
    };

    if (loading) return <div className="text-center mt-5">Se încarcă detaliile...</div>;
    if (!factura) return <div className="text-center mt-5">Factura nu a fost găsită.</div>;

    const isEmisa = factura.tip === 'emisă';
    const furnizor = isEmisa ? factura.firma_proprie : { nume: factura.partener_nume, cui: factura.partener_cui, adresa: factura.partener_adresa, iban: factura.partener_iban };
    const client = isEmisa ? { nume: factura.partener_nume, cui: factura.partener_cui, adresa: factura.partener_adresa, iban: factura.partener_iban } : factura.firma_proprie;

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = factura.produse.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(factura.produse.length / itemsPerPage);

    const handleBack = () => {
        navigate(-1);
    };

    return (
        <div className="container-fluid">
            <div className="d-flex gap-2 mb-3">
                {/* buton spre pagina cu facturi pt navigarea de la facturipartener, calendarfacturi sau firma */}
                {location.state?.from && location.state.from !== '/facturi' && (
                    <button
                        className="btn btn-outline-secondary mb-3"
                        onClick={() => navigate('/facturi')}
                    >
                        <i className="bi bi-arrow-left me-1"></i>
                        {location.state.from.includes('partener') ? "Înapoi la partener" :
                        location.state.from.includes('calendar') ? "Înapoi la calendar" :
                        "Înapoi la detalii firmă"}
                    </button>
                )}

                {/* buton spre facturi */}
                <button className="btn btn-outline-secondary mb-3" onClick={handleBack}>
                    {location.state?.from === '/facturi' ? "Înapoi la listă facturi" : "Listă facturi"}
                </button>
            </div>

            {/* detalii factura, furnizor, client */}
            <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
                <div className="text-muted fw-bold">Operator: {factura.operator_nume}</div>
            </div>
            <div className="card shadow-sm mb-4">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <h4 className="m-0">Factura #{factura.numar}</h4>
                    <div>
                        <span className="badge bg-light text-dark me-2">
                            {factura.tip === 'emisă' ? 'EMISĂ (Vânzare)' : 'PRIMITĂ (Achiziție)'}
                        </span>
                        <span className={`badge ${['plătită', 'încasată'].includes(factura.status) ? 'bg-success' : 'bg-danger'}`}>
                            {factura.status.toUpperCase()}
                        </span>
                    </div>
                </div>
                <div className="card-body">
                    <div className="row mb-3 border-bottom pb-3">
                        <div className="col-md-4"><strong>Data emitere:</strong> {new Date(factura.data_emitere).toLocaleDateString('ro-RO')}</div>
                        <div className="col-md-4"><strong>Data exigibilitate:</strong> {new Date(factura.data_emitere).toLocaleDateString('ro-RO')}</div>
                        <div className="col-md-4 text-danger"><strong>Data scadență:</strong> {new Date(factura.data_scadenta).toLocaleDateString('ro-RO')}</div>
                    </div>
                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <div className="card shadow-sm border-primary h-100">
                                <div className="card-header fw-bold">FURNIZOR</div>
                                <div className="card-body">
                                    <h5>{furnizor?.nume}</h5>
                                    <p className="mb-1">CUI: {furnizor?.cui}</p>
                                    <p className="mb-1">Adresă: {furnizor?.adresa}</p>
                                    <p className="mb-1">IBAN: {furnizor?.iban}</p>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6 mb-3">
                            <div className="card shadow-sm border-success h-100">
                                <div className="card-header bg-success text-white fw-bold">CLIENT</div>
                                <div className="card-body">
                                    <h5>{client?.nume}</h5>
                                    <p className="mb-1">CUI: {client?.cui}</p>
                                    <p className="mb-1">Adresă: {client?.adresa}</p>
                                    <p className="mb-1">IBAN: {client?.iban}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* tabel elemente factura */}
            <h4 className="mb-3">Elemente de pe factură</h4>
            <div className="table-responsive">
                <table className="table table-striped table-bordered align-middle text-center">
                    <thead className="">
                        {factura.tip_produse === 'marfă' ? (
                            <tr>
                                <th>Denumire</th>
                                <th>Cantitate</th>
                                {isEmisa ? <th>Preț vânzare</th> : <th>Preț cumpărare</th>}
                                <th>TVA %</th>
                                <th>Valoare TVA</th>
                                <th>Total net</th>
                                <th>Total brut</th>
                            </tr>
                        ) : (
                            <tr>
                                <th>Denumire</th>
                                <th>Cantitate / UM</th>
                                <th>Cota TVA</th>
                                <th>Valoare TVA</th>
                                <th>Total net</th>
                                <th>Total brut</th>
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {currentItems && currentItems.map((p, idx) => (
                            <tr key={idx}>
                                <td className="text-start">{p.denumire}</td>
                                <td>{parseFloat(p.cantitate).toFixed(2)} {p.um && p.um !== '-' ? p.um : ''}</td>

                                {factura.tip_produse === 'marfă' ? (
                                    <>
                                        <td className={isEmisa ? "text-primary" : "text-success"}>
                                            {parseFloat(isEmisa ? (p.pret_unitar_vanzare || 0) : (p.pret_unitar_cumparare || 0)).toFixed(2)}
                                        </td>
                                        <td>{p.cota_tva}%</td>
                                        <td>{parseFloat(p.suma_tva).toFixed(2)}</td>
                                        <td>{parseFloat(p.total_net).toFixed(2)}</td>
                                        <td className="fw-bold">{parseFloat(p.total_brut).toFixed(2)} RON</td>
                                    </>
                                ) : (
                                    <>
                                        <td>{p.cota_tva}%</td>
                                        <td>{parseFloat(p.suma_tva || 0).toFixed(2)}</td>
                                        <td>{parseFloat(p.total_net).toFixed(2)}</td>
                                        <td className="fw-bold text-success">{parseFloat(p.total_brut).toFixed(2)} RON</td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="table-secondary fw-bold fs-5">
                            <td colSpan={factura.tip_produse === 'marfă' ? 6 : 5} className="text-end">TOTAL FACTURĂ:</td>
                            <td className="text-primary">
                                {parseFloat(factura.total_brut || factura.produse?.reduce((sum, p) => sum + parseFloat(p.total_brut), 0)).toFixed(2)} RON
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* paginare */}
            {totalPages > 1 && (
                <div className="d-flex justify-content-center mt-3 align-items-center">
                    <button className="btn btn-sm btn-outline-secondary me-2" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>««</button>
                    <button className="btn btn-sm btn-nav-accent me-2" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>«</button>
                    <span className="mx-2 fw-bold small">Pagina {currentPage} din {totalPages}</span>
                    <button className="btn btn-sm btn-nav-accent ms-2" disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>»</button>
                    <button className="btn btn-sm btn-outline-secondary ms-2" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>»»</button>
                </div>
            )}

            {/* butoane */}
            <div className="d-flex justify-content-end gap-2 mt-4">
                <Link to={`/facturi/editare/${id}`} className="btn btn-warning">Editează date</Link>

                <button className="btn btn-primary" onClick={exportToCSV}>
                    <i className="bi bi-file-earmark-spreadsheet me-1"></i> Export CSV
                </button>

                <button className="btn btn-danger" onClick={exportToPDF}>
                    <i className="bi bi-file-earmark-pdf me-1"></i> Export PDF
                </button>

                {factura.status === 'primită' && (
                    <button className="btn btn-success" onClick={handleCashPayment}>
                        <i className="bi bi-cash-coin me-1"></i> Înregistrare plată cash
                    </button>
                )}
                {factura.status === 'emisă' && (
                    <button className="btn btn-success" onClick={handleCashPayment}>
                        <i className="bi bi-cash-coin me-1"></i> Înregistrare încasare cash
                    </button>
                )}

                {factura.tip === 'emisă' && factura.status === 'emisă' && (
                    <button className="btn btn-info text-white" onClick={async () => {
                        try {
                            const token = sessionStorage.getItem('token');
                            const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/plati/create-checkout-session`,
                                { id_factura: factura.id },
                                { headers: { Authorization: `Bearer ${token}` } }
                            );
                            navigator.clipboard.writeText(res.data.url);
                            alert("Link-ul de plată a fost generat și copiat în clipboard!");
                        } catch (e) {
                            alert("Eroare la generare link.");
                        }
                    }}>
                        <i className="bi bi-link-45deg me-1"></i>Generează link plată pentru client
                    </button>
                )}

                {factura.tip === 'primită' && factura.status === 'primită' && (
                    <button className="btn btn-success" onClick={() => navigate('/plata-factura', {
                        state: { facturaId: factura.id, nrFactura: factura.numar, totalBrut: factura.total_brut, partenerNume: factura.partener_nume }
                    })}>
                        Plătește factura
                    </button>
                )}
            </div>

            {/* export pdf */}
            <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '210mm' }}>
                <div id="pdf-export-container" className="bg-white p-5">
                    <div id="pdf-header-part">
                        <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
                            <h2 className="m-0 text-primary">FACTURA #{factura.numar}</h2>
                            <div className="text-end fw-bold small">
                                <div>Data emitere: {new Date(factura.data_emitere).toLocaleDateString('ro-RO')}</div>
                                <div>Data exigibilitate: {new Date(factura.data_emitere).toLocaleDateString('ro-RO')}</div>
                                <div>Data scadență: {new Date(factura.data_scadenta).toLocaleDateString('ro-RO')}</div>
                            </div>
                        </div>
                        <div className="row mb-5">
                            <div className="col-6 mb-3">
                                <div className="border p-3 rounded" style={{minHeight: '130px'}}>
                                    <div className="fw-bold border-bottom mb-2 bg-light p-1">FURNIZOR</div>
                                    <h5>{furnizor?.nume}</h5>
                                    <p className="mb-1 small">CUI: {furnizor?.cui}</p>
                                    <p className="mb-1 small">Adresă: {furnizor?.adresa}</p>
                                    <p className="mb-0 small">IBAN: {furnizor?.iban}</p>
                                </div>
                            </div>
                            <div className="col-6">
                                <div className="border p-3 rounded" style={{minHeight: '130px'}}>
                                    <div className="fw-bold border-bottom mb-2 bg-light p-1">CLIENT</div>
                                    <h5>{client?.nume}</h5>
                                    <p className="mb-1 small">CUI: {client?.cui}</p>
                                    <p className="mb-1 small">Adresă: {client?.adresa}</p>
                                    <p className="mb-0 small">IBAN: {client?.iban}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <table className="table table-bordered align-middle text-center small" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead id="pdf-table-header" className="">
                            <tr>
                                <th>Denumire</th>
                                <th>Cantitate</th>
                                {factura.tip_produse === 'marfă' && <th>Preț unitar</th>}
                                <th>Cotă TVA</th>
                                <th>Total net</th>
                                <th>Total TVA</th>
                                <th>Total brut</th>
                            </tr>
                        </thead>
                        <tbody>
                            {factura.produse.map((p, idx) => (
                                <tr key={idx} className="pdf-row-item">
                                    <td className="text-start">{p.denumire}</td>
                                    <td>{parseFloat(p.cantitate).toFixed(2)} {p.um}</td>
                                    {factura.tip_produse === 'marfă' && (
                                        <td>{parseFloat(isEmisa ? p.pret_unitar_vanzare : p.pret_unitar_cumparare).toFixed(2)}</td>
                                    )}
                                    <td>{p.cota_tva}%</td>
                                    <td>{parseFloat(p.total_net).toFixed(2)}</td>
                                    <td>{parseFloat(p.suma_tva).toFixed(2)}</td>
                                    <td>{parseFloat(p.total_brut).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot id="pdf-footer-part" style={{ borderTop: '2px solid #343a40' }}>
                            <tr>
                                <td colSpan={factura.tip_produse === 'marfă' ? 6 : 5} className="text-end fw-bold">TOTAL NET:</td>
                                <td className="fw-bold" style={{ backgroundColor: '#f8f9fa' }}>{parseFloat(factura.total_net).toFixed(2)} RON</td>
                            </tr>
                            <tr>
                                <td colSpan={factura.tip_produse === 'marfă' ? 6 : 5} className="text-end fw-bold">TOTAL TVA:</td>
                                <td className="fw-bold" style={{ backgroundColor: '#f8f9fa' }}>{parseFloat(factura.suma_tva).toFixed(2)} RON</td>
                            </tr>
                            <tr style={{ borderTop: '1px solid #dee2e6' }}>
                                <td colSpan={factura.tip_produse === 'marfă' ? 6 : 5} className="text-end text-primary fw-bold">TOTAL FACTURĂ:</td>
                                <td className="text-primary fw-bold" style={{ backgroundColor: '#f0f7ff' }}>{parseFloat(factura.total_brut).toFixed(2)} RON</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default DetaliiFactura;