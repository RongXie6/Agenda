function parseLocalDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;

    const s = String(value).trim().replace("T", " ");
    const parts = s.split(" ");
    const datePart = parts[0];
    const timePart = parts[1] || "00:00:00";

    const d = datePart.split("-");
    const t = timePart.split(":");

    return new Date(
        parseInt(d[0], 10),
        parseInt(d[1], 10) - 1,
        parseInt(d[2], 10),
        parseInt(t[0] || 0, 10),
        parseInt(t[1] || 0, 10),
        parseInt(t[2] || 0, 10)
    );
}

function formatYMD(date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");
}

function toDatetimeLocalValue(value) {
    const dt = parseLocalDate(value);
    if (!dt) return "";
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}T${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}`;
}

function getMonthName(monthIndex) {
    return ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
            "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"][monthIndex];
}

function sameCalendarDay(value, year, month, day, ric = "nessuna", promId = null, dataFine = null) {
    const dt = parseLocalDate(value);
    if (!dt) return false;

    const current = new Date(year, month, day);

    const eccezioniProm = eccezioniData.some(e =>
        Number(e.idPromemoria) === Number(promId) &&
        formatYMD(current) === e.data &&
        (Number(e.cancellato) === 1 || (e.nuovaData !== null && e.nuovaData !== ""))
    );
    if (eccezioniProm) return false;

    dt.setHours(0, 0, 0, 0);
    current.setHours(0, 0, 0, 0);
    if (current < dt) return false;

    // Oltre la data di fine ricorrenza: non mostrare più
    if (dataFine) {
        const fine = parseLocalDate(dataFine);
        if (fine) {
            fine.setHours(0, 0, 0, 0);
            if (current > fine) return false;
        }
    }

    if (ric === "mensile") {
        // Se il mese corrente non ha il giorno di partenza (es. 31 a febbraio),
        // l'occorrenza cade sull'ultimo giorno del mese.
        const ultimoGiorno = giorniNelMese(year, month);
        const giornoEffettivo = Math.min(dt.getDate(), ultimoGiorno);
        return day === giornoEffettivo;
    }

    if (ric === "annuale") {
        if (dt.getMonth() !== month) return false;
        // Es. 29 febbraio negli anni non bisestili: cade sul 28.
        const ultimoGiorno = giorniNelMese(year, month);
        const giornoEffettivo = Math.min(dt.getDate(), ultimoGiorno);
        return day === giornoEffettivo;
    }

    if (ric === "settimanale") {
        const diffDays = Math.round((current - dt) / 86400000);
        return diffDays % 7 === 0;
    }

    return dt.getFullYear() === year && dt.getMonth() === month && dt.getDate() === day;
}

// Numero di giorni nel mese (month: 0-11). Gestisce automaticamente gli anni bisestili.
function giorniNelMese(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function isNaturalOccurrence(ricorrenza, dataInizio, targetDateStr) {
    const dt     = parseLocalDate(dataInizio);
    const target = parseLocalDate(targetDateStr);
    if (!dt || !target) return false;
    dt.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    if (target < dt) return false;

    // Stessa logica di sameCalendarDay: gestisce mese corto e anni bisestili
    if (ricorrenza === "mensile") {
        const eff = Math.min(dt.getDate(), giorniNelMese(target.getFullYear(), target.getMonth()));
        return target.getDate() === eff;
    }
    if (ricorrenza === "annuale") {
        if (dt.getMonth() !== target.getMonth()) return false;
        const eff = Math.min(dt.getDate(), giorniNelMese(target.getFullYear(), target.getMonth()));
        return target.getDate() === eff;
    }
    if (ricorrenza === "settimanale") return Math.round((target - dt) / 86400000) % 7 === 0;
    return false;
}
