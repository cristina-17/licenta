const db = require('./config/db');
// ruleaza un job cron in fiecare zi la 23:59:59 pt a verifica daca trebuie sa faca schimbari

// inchidere automata note contabile deschise din zilele precedente
async function inchideNoteContabile() {
    try {
        const [res] = await db.query(
            "UPDATE NOTE_CONTABILE SET status = 'finalizată' WHERE data_intocmire < CURDATE() AND status = 'deschisă'"
        );
        if (res.affectedRows > 0) {
            console.log(`[SCHEDULER] ${res.affectedRows} note contabile finalizate automat la:`, new Date().toISOString());
        }
    } catch (err) {
        console.error('[SCHEDULER] Eroare la inchiderea notelor contabile:', err.message);
    }
}

// verificare dupa ultima zi a lunii pt amortizari
async function ruleazaAmortizari() {
    try {
        console.log('[SCHEDULER] Rulare procedura genereaza_amortizari_lunare...');
        await db.query('CALL genereaza_amortizari_lunare()');
        console.log('[SCHEDULER] Amortizari procesate cu succes la:', new Date().toISOString());
    } catch (err) {
        console.error('[SCHEDULER] Eroare la rularea amortizarilor:', err.message);
    }
}

// ruleaza toate taskurile zilnice
async function taskuriZilnice() {
    await ruleazaAmortizari();
    await inchideNoteContabile();
}

// cate ms sunt pana la urmatoarea rulare (urmatoarea zi la 23:59)
function msPanaLaUrmatoareaRulare() {
    const acum = new Date();
    const target = new Date();
    target.setHours(23, 59, 59, 0);

    // daca ora 23:59 a trecut azi, programam pt maine
    if (acum >= target) {
        target.setDate(target.getDate() + 1);
    }

    return target - acum;
}

// pornire scheduler
function pornireScheduler() {
    const delay = msPanaLaUrmatoareaRulare();
    const ore = Math.floor(delay / 3600000);
    const minute = Math.floor((delay % 3600000) / 60000);

    console.log(`[SCHEDULER] Prima rulare programata in ${ore}h ${minute}min`);

    // prima rulare la 23:59
    setTimeout(() => {
        taskuriZilnice();

        // repeta la fiecare 24h
        setInterval(taskuriZilnice, 24 * 60 * 60 * 1000);
    }, delay);

    // rulare si la pornirea serverului (pt lunile ratate/notele neincheiate)
    taskuriZilnice();
}

module.exports = { pornireScheduler };
