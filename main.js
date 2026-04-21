// 1. YOUR CREDENTIALS - Paste your keys here!
const SUPABASE_URL = 'https://iuxsnrdtmbjlcygeigqc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1eHNucmR0bWJqbGN5Z2VpZ3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjI5NjksImV4cCI6MjA5MjMzODk2OX0.SNwTsNOJgX1fLsXcdEbjyQu21eehzifgm0Ldq1bN2UU';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let trades = [];
let currentAccount = localStorage.getItem('currentAccount') || "Default";
let equityChart;

// 2. Load Data from Supabase
async function loadDataFromCloud() {
    console.log("Fetching from cloud...");
    const { data, error } = await supabaseClient
        .from('trades')
        .select('*')
        .order('date', { ascending: true });

    if (error) {
        console.error('Database Error:', error);
        return;
    }

    trades = data;
    renderTrades();
}

function getCurrencySymbol(code) {
    const symbols = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'ZAR': 'R', 'RSA': 'R', 'JPY': '¥' };
    return symbols[code] || code || '$';
}

function renderTrades() {
    const accountFilter = document.getElementById('account-filter');
    const periodFilter = document.getElementById('period-filter');
    const tradeLog = document.getElementById('trade-log');

    // Update Account Dropdown
    const uniqueAccounts = [...new Set(trades.map(t => t.account || "Default"))];
    if (uniqueAccounts.length === 0) uniqueAccounts.push("Default");
    
    accountFilter.innerHTML = uniqueAccounts.map(acc => 
        `<option value="${acc}" ${acc === currentAccount ? 'selected' : ''}>${acc}</option>`
    ).join('');

    let filtered = trades.filter(t => (t.account || "Default") === currentAccount);
    
    // Period Filter
    const period = periodFilter.value;
    if (period !== 'all') {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - parseInt(period));
        filtered = filtered.filter(t => new Date(t.date) >= cutoff);
    }

    const activeCurrency = filtered.length > 0 ? (filtered[0].currency || 'USD') : 'USD';
    const symbol = getCurrencySymbol(activeCurrency);

    tradeLog.innerHTML = '';
    filtered.forEach((trade) => {
        const pnlNum = parseFloat(trade.pnl);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${trade.date}</td>
            <td style="font-weight:600">${trade.asset}</td>
            <td>${trade.type}</td>
            <td class="${pnlNum >= 0 ? 'win-text' : 'loss-text'}">
                ${pnlNum >= 0 ? '+' : '-'}${symbol}${Math.abs(pnlNum).toFixed(2)}
            </td>
            <td><span style="cursor:pointer" onclick="deleteTrade('${trade.id}')">🗑</span></td>
        `;
        tradeLog.appendChild(row);
    });

    updateDashboard(filtered, symbol);
}

// ... Keep updateDashboard and updateChart from our previous code ...

// 3. Delete from Cloud
async function deleteTrade(id) {
    if (!confirm("Delete this trade from the cloud?")) return;
    const { error } = await supabaseClient.from('trades').delete().eq('id', id);
    if (!error) loadDataFromCloud();
}

function switchAccount() {
    currentAccount = document.getElementById('account-filter').value;
    localStorage.setItem('currentAccount', currentAccount);
    renderTrades();
}

// INITIALIZE
loadDataFromCloud();
