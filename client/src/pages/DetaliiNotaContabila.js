import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function DetaliiNotaContabila() {
    const { id } = useParams();
    const navigate = useNavigate();
    const token = sessionStorage.getItem('token');
    const [nota, setNota] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/note-contabile/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setNota(res.data);
            } catch (err) {
                alert("Nota nu a fost găsită.");
                navigate('/note-contabile');
            }
        };
        fetch();
    }, [id, navigate, token]);

    // export csv
    const exportToCSV = async () => {
        if (!nota || !nota.operatii) return;

        let csvContent = "\uFEFF"; // pt caractere in lb romana

        csvContent += `NOTA CONTABILA,${nota.numar}\n`;
        csvContent += `Data Intocmire,${new Date(nota.data_intocmire).toLocaleDateString('ro-RO')}\n\n`;

        const headers = ["Nr. Op.", "Debit", "Credit", "Suma", "Explicații"];
        csvContent += headers.join(",") + "\n";

        // transformare date
        nota.operatii.forEach((op, index) => {
            const row = [
                index + 1,
                op.debit2 ? `"${op.debit1}, ${op.debit2}"` : op.debit1,
                op.credit2 ? `"${op.credit1}, ${op.credit2}"` : op.credit1,
                op.debit2 || op.credit2 ? op.suma_credit1 : op.suma_debit1,
                `"${op.explicatii.replace(/"/g, '""')}"` // pt recunoastere ghilimele in campul explicatii
            ];
            csvContent += row.join(",") + "\n"; // continut csv
        });

        // decarcare csv
        try {
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            if (window.showSaveFilePicker) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: `Nota_contabila_${nota.numar}.csv`,
                    types: [{ description: 'CSV File', accept: { 'text/csv': ['.csv'] } }],
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
            } else {
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `Nota_contabila_${nota.numar}.csv`);
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
            alert("Eroare: Nota contabilă pentru export PDF nu a fost găsită.");
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

            // calculam daca randul incape in  pag
            const spaceNeeded = rowData.h;

            if (currentY + spaceNeeded > pdfHeight - margin - 10) {
                pdf.addPage();
                currentY = startNewPage();
            }
            pdf.addImage(rowData.img, 'PNG', margin, currentY, contentWidth, rowData.h);
            currentY += rowData.h;
        }

        // numerotare pagina
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            pdf.setFontSize(9);
            pdf.setTextColor(100);
            pdf.text(`${i}/${totalPages}`, pdfWidth - margin - 10, pdfHeight - 10);
        }

        // setare nume document
        const numeFisier = `Nota_Contabila_${nota.numar}`;
        pdf.setProperties({ title: numeFisier });

        // deschidere in tab nou
        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    };

    if (!nota) return <div className="text-center mt-5">Se încarcă...</div>;

    // indexul operatiunilor (pt paginare)
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentOperatii = nota.operatii.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(nota.operatii.length / itemsPerPage);

    return (
        <div className="container-fluid">
            <button className="btn btn-outline-secondary mb-3" onClick={() => navigate('/note-contabile')}>
                <i className="bi bi-arrow-left me-1"></i> Înapoi la Listă
            </button>

            <div className="card shadow-sm mb-4 border-0">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <h4 className="m-0">Notă contabilă: {nota.numar}</h4>
                    <span className={`badge bg-light text-dark`}>{nota.status.toUpperCase()}</span>
                </div>
                <div className="card-body bg-light">
                    <div className="row">
                        <div className="col-md-4">
                            <strong>Data întocmire:</strong> {new Date(nota.data_intocmire).toLocaleDateString('ro-RO')}
                        </div>
                        <div className="col-md-4"><strong>Tip document:</strong> Notă contabilă</div>
                    </div>
                </div>
            </div>

            <h5 className="mb-3 text-secondary"><i className="bi bi-list-check me-2"></i>Operațiuni înregistrate</h5>

            <style>{`
                .table-nc { border-collapse: collapse !important; }
                .table-nc td, .table-nc th { border: 1px solid #dee2e6 !important; }
                .col-egal { width: 1px; padding: 0 !important; border-left: none !important; border-right: none !important; vertical-align: middle; }
                .col-debit { border-right: none !important; }
                .col-credit { border-left: none !important; }
                .no-border-top td { border-top: none !important; }
                .no-border-bottom td { border-bottom: none !important; }
            `}</style>

            <div className="table-responsive">
                <table className="table table-bordered align-middle bg-white table-nc">
                    <thead className="table-dark text-center">
                        <tr>
                            <th style={{width: '5%'}}>Nr. op.</th>
                            <th style={{width: '20%'}}>Debit</th>
                            <th style={{width: '1%'}}></th>
                            <th style={{width: '20%'}}>Credit</th>
                            <th style={{width: '15%'}}>Suma</th>
                            <th>Explicații</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentOperatii && currentOperatii.length > 0 ? (
                            currentOperatii.map((op, localIdx) => {
                                const idx = indexOfFirstItem + localIdx;
                                const esteCompusaDebit = op.debit2 && op.debit2 !== "";
                                const esteCompusaCredit = op.credit2 && op.credit2 !== "";
                                const nrRanduri = (esteCompusaDebit || esteCompusaCredit) ? 3 : 1;
                                const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8f9fa';

                                return (
                                    <React.Fragment key={idx}>
                                        {/* primul rand din operatiune are % la debit daca debit e compus sau % la credit daca credit e compus */}
                                        <tr className="text-center align-middle" style={{ backgroundColor: rowBg }}>
                                            <td rowSpan={nrRanduri} className="fw-bold">{idx + 1}</td>

                                            <td className={`fw-bold col-debit ${nrRanduri > 1 ? 'no-border-bottom' : ''}`}>
                                                {esteCompusaDebit ? '%' : op.debit1}
                                            </td>

                                            <td className="col-egal fw-bold fs-5 text-primary">=</td>

                                            <td className={`fw-bold col-credit ${nrRanduri > 1 ? 'no-border-bottom' : ''}`}>
                                                {esteCompusaCredit ? '%' : op.credit1}
                                            </td>

                                            <td className={`fw-bold ${nrRanduri > 1 ? 'no-border-bottom' : ''}`}>
                                                {esteCompusaDebit ? parseFloat(op.suma_credit1).toFixed(2) : parseFloat(op.suma_debit1).toFixed(2)}
                                            </td>

                                            <td rowSpan={nrRanduri} className="text-start">{op.explicatii}</td>
                                        </tr>

                                        {/* randul 2 si 3 pt debit compus */}
                                        {esteCompusaDebit && (
                                            <>
                                                <tr className="text-center table-sm no-border-top no-border-bottom" style={{ backgroundColor: rowBg }}>
                                                    <td className="col-debit italic">{op.debit1}</td>
                                                    <td className="col-egal"></td>
                                                    <td className="col-credit"></td>
                                                    <td className="italic">{parseFloat(op.suma_debit1).toFixed(2)}</td>
                                                </tr>
                                                <tr className="text-center table-sm no-border-top" style={{ backgroundColor: rowBg }}>
                                                    <td className="col-debit italic">{op.debit2}</td>
                                                    <td className="col-egal"></td>
                                                    <td className="col-credit"></td>
                                                    <td className="italic">{parseFloat(op.suma_debit2).toFixed(2)}</td>
                                                </tr>
                                            </>
                                        )}

                                        {/* randul 2 si 3 pt credit compus */}
                                        {esteCompusaCredit && (
                                            <>
                                                <tr className="text-center table-sm no-border-top no-border-bottom" style={{ backgroundColor: rowBg }}>
                                                    <td className="col-debit"></td>
                                                    <td className="col-egal"></td>
                                                    <td className="col-credit italic">{op.credit1}</td>
                                                    <td className="italic">{parseFloat(op.suma_credit1).toFixed(2)}</td>
                                                </tr>
                                                <tr className="text-center table-sm no-border-top" style={{ backgroundColor: rowBg }}>
                                                    <td className="col-debit"></td>
                                                    <td className="col-egal"></td>
                                                    <td className="col-credit italic">{op.credit2}</td>
                                                    <td className="italic">{parseFloat(op.suma_credit2).toFixed(2)}</td>
                                                </tr>
                                            </>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        ) : (
                            <tr><td colSpan="6" className="text-center py-4 text-muted">Nu există operațiuni în această notă.</td></tr>
                        )}
                    </tbody>
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
                <button className="btn btn-primary" onClick={exportToCSV}>
                    <i className="bi bi-file-earmark-spreadsheet me-1"></i> Export CSV
                </button>
                <button className="btn btn-danger" onClick={exportToPDF}>
                    <i className="bi bi-file-earmark-pdf me-1"></i> Export PDF
                </button>
            </div>

            {/* export pdf */}
            <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '190mm' }}>
                <div id="pdf-export-container" className="bg-white p-4">
                    <div id="pdf-header-part">
                        <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
                            <h2 className="m-0 text-primary">NOTĂ CONTABILĂ #{nota.numar}</h2>
                            <div className="text-end fw-bold small">
                                <div>Data întocmire: {new Date(nota.data_intocmire).toLocaleDateString('ro-RO')}</div>
                                <div>Tip document: Notă contabilă</div>
                            </div>
                        </div>
                    </div>

                    <table className="table table-bordered align-middle text-center small" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead id="pdf-table-header" className="">
                            <tr>
                                <th style={{ border: '1px solid #000' }}>Nr.</th>
                                <th style={{ border: '1px solid #000' }}>Debit</th>
                                <th style={{ border: '1px solid #000', width: '10px' }}>=</th>
                                <th style={{ border: '1px solid #000' }}>Credit</th>
                                <th style={{ border: '1px solid #000' }}>Sumă</th>
                                <th style={{ border: '1px solid #000' }}>Explicații</th>
                            </tr>
                        </thead>
                        {nota.operatii.map((op, idx) => (
                            <tbody key={idx} className="pdf-row-item">
                                <tr>
                                    <td style={{ border: '1px solid #dee2e6' }}>{idx + 1}</td>
                                    <td style={{ border: '1px solid #dee2e6' }}>{op.debit2 ? '%' : op.debit1}</td>
                                    <td style={{ border: '1px solid #dee2e6' }}>=</td>
                                    <td style={{ border: '1px solid #dee2e6' }}>{op.credit2 ? '%' : op.credit1}</td>
                                    <td style={{ border: '1px solid #dee2e6' }}>{op.debit2 ? parseFloat(op.suma_credit1).toFixed(2) : parseFloat(op.suma_debit1).toFixed(2)}</td>
                                    <td style={{ border: '1px solid #dee2e6', textAlign: 'left' }}>{op.explicatii}</td>
                                </tr>
                                {op.debit2 && (
                                    <>
                                        <tr>
                                            <td style={{ border: '1px solid #dee2e6' }}></td>
                                            <td style={{ border: '1px solid #dee2e6', fontStyle: 'italic' }}>{op.debit1}</td>
                                            <td></td><td></td>
                                            <td style={{ border: '1px solid #dee2e6' }}>{parseFloat(op.suma_debit1).toFixed(2)}</td>
                                            <td></td>
                                        </tr>
                                        <tr>
                                            <td style={{ border: '1px solid #dee2e6' }}></td>
                                            <td style={{ border: '1px solid #dee2e6', fontStyle: 'italic' }}>{op.debit2}</td>
                                            <td></td><td></td>
                                            <td style={{ border: '1px solid #dee2e6' }}>{parseFloat(op.suma_debit2).toFixed(2)}</td>
                                            <td></td>
                                        </tr>
                                    </>
                                )}
                                {op.credit2 && (
                                    <>
                                        <tr>
                                            <td style={{ border: '1px solid #dee2e6' }}></td>
                                            <td></td><td></td>
                                            <td style={{ border: '1px solid #dee2e6', fontStyle: 'italic' }}>{op.credit1}</td>
                                            <td style={{ border: '1px solid #dee2e6' }}>{parseFloat(op.suma_credit1).toFixed(2)}</td>
                                            <td></td>
                                        </tr>
                                        <tr>
                                            <td style={{ border: '1px solid #dee2e6' }}></td>
                                            <td></td><td></td>
                                            <td style={{ border: '1px solid #dee2e6', fontStyle: 'italic' }}>{op.credit2}</td>
                                            <td style={{ border: '1px solid #dee2e6' }}>{parseFloat(op.suma_credit2).toFixed(2)}</td>
                                            <td></td>
                                        </tr>
                                    </>
                                )}
                            </tbody>
                        ))}
                    </table>
                </div>
            </div>
        </div>
    );
}

export default DetaliiNotaContabila;