// "HH:MM" da un orario "HH:MM[:SS]" oppure da un Date
function formatHM(value) {
    if (!value) return "";
    if (value instanceof Date) {
        return String(value.getHours()).padStart(2, "0") + ":" +
               String(value.getMinutes()).padStart(2, "0");
    }
    return String(value).substring(0, 5);
}

// Riga oraria leggibile: "🕐 10:00 (60 min)" / "🕐 10:00 – 11:00" / "Tutto il giorno"
function descrizioneOrario(hm, durataMin) {
    if (!hm) return "Tutto il giorno";
    let testo = "🕐 " + hm;
    const dur = parseInt(durataMin || 0, 10);
    if (dur > 0) {
        const [h, m] = hm.split(":").map(Number);
        const fine = new Date(2000, 0, 1, h, m + dur);
        testo += " – " + formatHM(fine);
    }
    return testo;
}

function showPromemorie(events, day, list) {
    events.forEach(ev => {
        const div  = document.createElement("div");
        div.classList.add("event-item");

        const info = document.createElement("div");
        info.className = "event-info";

        const text = document.createElement("span");
        text.textContent = ev.descrizione;
        info.appendChild(text);

        const orario = document.createElement("small");
        orario.className   = "event-orario";
        orario.textContent = descrizioneOrario(formatHM(ev.ora), ev.durataMin);
        info.appendChild(orario);

        const actions = document.createElement("div");
        const current = new Date(currentYear, currentMonth, day);
        const occDate = ev._originalDate || formatYMD(current);

        const edit = document.createElement("span");
        edit.textContent = "🖊️";
        edit.className   = "edit";
        edit.onclick = () => showEditPromemoria(ev.id, formatYMD(current), ev._originalDate || null);

        const del = document.createElement("span");
        del.textContent = "X";
        del.className   = "del";
        del.onclick = () => deletePromemoria(ev.id, occDate, ev.ora, ev.durataMin);

        actions.appendChild(edit);
        actions.appendChild(del);
        div.appendChild(info);
        div.appendChild(actions);
        list.appendChild(div);
    });
}

function showAppuntamenti(events, list) {
    events.forEach(ev => {
        const event = document.createElement("div");
        event.classList.add("event-item");

        const info = document.createElement("div");
        info.className = "event-info";

        const text = document.createElement("span");
        text.textContent = ev.descrizione;
        info.appendChild(text);

        if (ev.mioStato === "invitato") {
            const stato = document.createElement("small");
            stato.className   = "event-stato";
            stato.textContent = "⏳ Da confermare";
            info.appendChild(stato);
        }

        const orario = document.createElement("small");
        orario.className   = "event-orario";
        orario.textContent = descrizioneOrario(formatHM(parseLocalDate(ev.dataInizio)), ev.durataMin);
        info.appendChild(orario);

        if (ev.partecipanti) {
            const part = document.createElement("small");
            part.className   = "event-partecipanti";
            part.textContent = "👥 " + ev.partecipanti;
            info.appendChild(part);
        }

        const actions = document.createElement("div");

        const edit = document.createElement("span");
        edit.textContent = "🖊️";
        edit.className   = "edit";
        edit.onclick = () => showEdit(ev.id);

        const del = document.createElement("span");
        del.textContent = "X";
        del.className   = "del";
        del.onclick = () => deleteAppuntamento(ev.id);

        actions.appendChild(edit);
        actions.appendChild(del);
        event.appendChild(info);
        event.appendChild(actions);
        list.appendChild(event);
    });
}

function openDayEvents(day, dayProms, dayApps) {
    resetEventsModal();

    document.getElementById("modalDate").textContent = `${day} ${getMonthName(currentMonth)} ${currentYear}`;

    showPromemorie(dayProms, day, document.getElementById("promemorieList"));
    showAppuntamenti(dayApps, document.getElementById("appuntamentiList"));

    if (dayProms.length === 0 && dayApps.length === 0) {
        document.getElementById("nessuna").innerHTML = "<p>Nessun evento</p>";
    } else {
        if (dayProms.length > 0) document.getElementById("promemorieSection").style.display = "";
        if (dayApps.length > 0)  document.getElementById("appuntamentiSection").style.display = "";
    }

    openModal("eventsModal");
}

function renderCalendarData() {
    const calendar = document.querySelector("#calendar");
    calendar.innerHTML = "";

    document.getElementById("monthYear").textContent = `${getMonthName(currentMonth)} ${currentYear}`;

    const firstDay  = new Date(currentYear, currentMonth, 1);
    const startDay  = firstDay.getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let i = 0; i < startDay; i++) {
        const empty = document.createElement("div");
        empty.classList.add("day", "empty-day");
        calendar.appendChild(empty);
    }

    for (let d = 1; d <= totalDays; d++) {
        const dayDiv = document.createElement("div");
        dayDiv.classList.add("day", "active-day");

        const today = new Date();
        if (d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
            dayDiv.classList.add("today");
        }

        const dayNumber = document.createElement("div");
        dayNumber.classList.add("day-number");
        dayNumber.textContent = d;
        dayDiv.appendChild(dayNumber);

        const dayProms = promData.filter(p =>
            sameCalendarDay(p.dataInizio, currentYear, currentMonth, d, p.ricorrenza, p.id, p.dataFine)
        ).map(p => {
            const ecc = eccezioniData.find(e =>
                Number(e.idPromemoria) === Number(p.id) &&
                e.data === formatYMD(new Date(currentYear, currentMonth, d)) &&
                Number(e.cancellato) === 0
            );
            if (ecc) return { ...p, descrizione: ecc.descrizione || p.descrizione, ora: ecc.nuovaOra || p.ora, durataMin: ecc.nuovaDurataMin || p.durataMin };
            return p;
        });

        const todayYMD = formatYMD(new Date(currentYear, currentMonth, d));
        eccezioniData
            .filter(e => e.nuovaData === todayYMD && Number(e.cancellato) === 0)
            .forEach(e => {
                const prom = promData.find(p => Number(p.id) === Number(e.idPromemoria));
                if (prom && !dayProms.some(dp => Number(dp.id) === Number(prom.id))) {
                    dayProms.push({
                        ...prom,
                        descrizione:   e.descrizione    || prom.descrizione,
                        ora:           e.nuovaOra       || prom.ora,
                        durataMin:     e.nuovaDurataMin || prom.durataMin,
                        _originalDate: e.data
                    });
                }
            });

        const dayApps = appData.filter(a => sameCalendarDay(a.dataInizio, currentYear, currentMonth, d));

        dayProms.forEach(p => {
            const mark = document.createElement("div");
            mark.className   = "eventP";
            mark.textContent = p.descrizione;
            dayDiv.appendChild(mark);
        });

        dayApps.forEach(a => {
            const mark = document.createElement("div");
            mark.className   = "eventA";
            if (a.mioStato === "invitato") {
                mark.classList.add("daConfermare");
                mark.textContent = "? " + a.descrizione;
            } else {
                mark.textContent = a.descrizione;
            }
            dayDiv.appendChild(mark);
        });

        dayDiv.addEventListener("click", () => openDayEvents(d, dayProms, dayApps));
        calendar.appendChild(dayDiv);
    }
}

function prevMonth() {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendarData();
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendarData();
}

function profilo() {
    window.location.href = "profilo.html";
}
