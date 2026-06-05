window.onload = function () {
    initModalSystem();
    richiediPermessoNotifiche();
    setInterval(controllaEventi, 60000);
    loadData();
};
