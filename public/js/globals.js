let currentYear  = new Date().getFullYear();
let currentMonth = new Date().getMonth();

let promData      = [];
let appData       = [];
let personeData   = [];
let eccezioniData = [];
let listUtenti    = null;

let topZIndex     = 9000;
let currentEditId = null;

let currentEditPromId               = null;
let currentEditPromDate             = null;
let currentEditPromIsRecurring      = false;
let currentEditPromData             = null;
let currentEditPromExistingNuovaData = null;

const url              = "http://127.0.0.1/agendaX/api";
const notificheInviate = new Set();
const ANTICIPO_MIN     = 15;
