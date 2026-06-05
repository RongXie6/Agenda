async function richiediPermessoNotifiche() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
        await Notification.requestPermission();
    }
}

function inviaNotifica(titolo, corpo) {
    if (Notification.permission !== "granted") return;
    new Notification(titolo, { body: corpo });
}

function controllaEventi() {
    if (Notification.permission !== "granted") return;

    const ora  = new Date();
    const oggi = formatYMD(ora);

    // ── Promemoria regolari ──────────────────────────────────────
    for (const p of promData) {
        if (!sameCalendarDay(p.dataInizio, ora.getFullYear(), ora.getMonth(), ora.getDate(), p.ricorrenza, p.id, p.dataFine)) continue;

        const key = `prom-${p.id}-${oggi}`;
        if (notificheInviate.has(key)) continue;

        if (p.ora) {
            const [h, m] = p.ora.split(':').map(Number);
            const oraProm = new Date(ora.getFullYear(), ora.getMonth(), ora.getDate(), h, m);
            const diffMin = (oraProm - ora) / 60000;
            if (diffMin < 0 || diffMin > ANTICIPO_MIN) continue;
            notificheInviate.add(key);
            inviaNotifica("⏰ Promemoria", `${p.descrizione} — alle ${p.ora.substring(0, 5)}`);
        } else {
            notificheInviate.add(key);
            inviaNotifica("📅 Promemoria oggi", p.descrizione);
        }
    }

    // ── Promemoria spostati (nuovaData = oggi) ───────────────────
    for (const e of eccezioniData) {
        if (e.nuovaData !== oggi || Number(e.cancellato) === 1) continue;
        const prom = promData.find(p => Number(p.id) === Number(e.idPromemoria));
        if (!prom) continue;

        const key     = `prom-moved-${e.id}-${oggi}`;
        if (notificheInviate.has(key)) continue;

        const oraEff  = e.nuovaOra   || prom.ora;
        const descEff = e.descrizione || prom.descrizione;

        if (oraEff) {
            const [h, m] = oraEff.split(':').map(Number);
            const oraProm = new Date(ora.getFullYear(), ora.getMonth(), ora.getDate(), h, m);
            const diffMin = (oraProm - ora) / 60000;
            if (diffMin < 0 || diffMin > ANTICIPO_MIN) continue;
            notificheInviate.add(key);
            inviaNotifica("⏰ Promemoria", `${descEff} — alle ${oraEff.substring(0, 5)}`);
        } else {
            notificheInviate.add(key);
            inviaNotifica("📅 Promemoria oggi", descEff);
        }
    }

    // ── Appuntamenti ─────────────────────────────────────────────
    for (const a of appData) {
        const key = `app-${a.id}`;
        if (notificheInviate.has(key)) continue;

        const inizio = parseLocalDate(a.dataInizio);
        if (!inizio) continue;

        const diffMin = (inizio - ora) / 60000;
        if (diffMin < 0 || diffMin > ANTICIPO_MIN) continue;

        notificheInviate.add(key);
        const hh = String(inizio.getHours()).padStart(2, '0');
        const mm = String(inizio.getMinutes()).padStart(2, '0');
        inviaNotifica("📌 Appuntamento", `${a.descrizione} — alle ${hh}:${mm}`);
    }
}
