let trades = JSON.parse(localStorage.getItem('trades')) || [];
let currentAccount = localStorage.getItem('currentAccount') || "Default";
let equityChart;

function getCurrencySymbol(currencyCode) {
    const symbols = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'ZAR': 'R', 'JPY': '¥' };
    return symbols[currencyCode] || currencyCode || '$';
}

function renderTrades() {
    const accountFilter = document.getElementById('account-filter');
    const periodFilter = document.getElementById('period-filter');
    
    const uniqueAccounts = [...new Set(trades.map(t => t.account || "Default"))];
    accountFilter.innerHTML = uniqueAccounts.map(acc => 
        `<option value="${acc}" ${acc === currentAccount ? 'selected' : ''}>${acc}</option>`
    ).join('');

    let filtered = trades.filter(t => (t.account || "Default") === currentAccount);
    
    const period = periodFilter.value;
    if (period !== 'all') {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - parseInt(period));
        filtered = filtered.filter(t => new Date(t.date) >= cutoff);
    }

    const activeCurrency = filtered.length > 0 ? (filtered[0].currency || 'USD') : 'USD';
    const symbol = getCurrencySymbol(activeCurrency);

    const tradeLog = document.getElementById('trade-log');
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
            <td><span style="cursor:pointer" onclick="deleteTrade(${trades.indexOf(trade)})">🗑</span></td>
        `;
        tradeLog.appendChild(row);
    });

    updateDashboard(filtered, symbol);
}

function updateDashboard(filtered, symbol) {
    const totalPnl = filtered.reduce((sum, t) => sum + parseFloat(t.pnl), 0);
    const wins = filtered.filter(t => parseFloat(t.pnl) > 0).length;
    const winRate = filtered.length > 0 ? ((wins / filtered.length) * 100).toFixed(1) : 0;

    document.getElementById('total-pnl').innerText = `${symbol}${totalPnl.toLocaleString()}`;
    document.getElementById('total-pnl').className = totalPnl >= 0 ? 'win-text' : 'loss-text';
    document.getElementById('win-rate').innerText = `${winRate}%`;
    document.getElementById('trade-count').innerText = filtered.length;

    const assetMap = {};
    const dayMap = { 'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0 };
    const dirStats = { Long: { w: 0, t: 0 }, Short: { w: 0, t: 0 } };

    filtered.forEach(t => {
        const val = parseFloat(t.pnl);
        assetMap[t.asset] = (assetMap[t.asset] || 0) + val;
        const day = new Date(t.date).toLocaleDateString('en-US', { weekday: 'short' });
        if(dayMap[day] !== undefined) dayMap[day] += val;
        dirStats[t.type].t++;
        if(val > 0) dirStats[t.type].w++;
    });

    document.getElementById('asset-pnl-list').innerHTML = Object.entries(assetMap)
        .sort((a,b) => b[1] - a[1])
        .map(([name, pnl]) => `<div style="display:flex; justify-content:space-between;"><span>${name}</span><span class="${pnl>=0?'win-text':'loss-text'}">${symbol}${pnl.toFixed(2)}</span></div>`)
        .join('');

    document.getElementById('day-performance').innerHTML = Object.entries(dayMap)
        .map(([day, pnl]) => `<div style="display:flex; justify-content:space-between;"><span>${day}</span><span class="${pnl>=0?'win-text':'loss-text'}">${symbol}${pnl.toFixed(2)}</span></div>`)
        .join('');

    const lWR = dirStats.Long.t > 0 ? (dirStats.Long.w / dirStats.Long.t * 100).toFixed(1) : 0;
    const sWR = dirStats.Short.t > 0 ? (dirStats.Short.w / dirStats.Short.t * 100).toFixed(1) : 0;
    document.getElementById('direction-stats').innerHTML = `<div>Long WR: ${lWR}%</div><div>Short WR: ${sWR}%</div>`;

    updateChart(filtered);
}

function updateChart(filtered) {
    const ctx = document.getElementById('equityChart').getContext('2d');
    let bal = 0;
    const points = filtered.map(t => bal += parseFloat(t.pnl));
    if (equityChart) equityChart.destroy();
    equityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: filtered.map((_, i) => i + 1),
            datasets: [{ label: 'Equity', data: points, borderColor: '#38bdf8', tension: 0.2, fill: true, backgroundColor: 'rgba(56, 189, 248, 0.1)' }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { display: false }, y: { grid: { color: '#334155' } } } }
    });
}

function switchAccount() {
    currentAccount = document.getElementById('account-filter').value;
    localStorage.setItem('currentAccount', currentAccount);
    renderTrades();
}

function deleteTrade(index) {
    trades.splice(index, 1);
    localStorage.setItem('trades', JSON.stringify(trades));
    renderTrades();
}

document.getElementById('import-json').addEventListener('change', function(e) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const data = JSON.parse(event.target.result);
        trades = [...trades, ...data].filter((v,i,a) => a.findIndex(t => JSON.stringify(t) === JSON.stringify(v)) === i);
        localStorage.setItem('trades', JSON.stringify(trades));
        renderTrades();
    };
    reader.readAsText(e.target.files[0]);
});

document.getElementById('trade-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const newTrade = {
        date: document.getElementById('date').value,
        asset: document.getElementById('asset').value.toUpperCase(),
        type: document.getElementById('type').value,
        pnl: document.getElementById('pnl').value,
        account: document.getElementById('account-name').value,
        currency: 'USD'
    };
    trades.push(newTrade);
    localStorage.setItem('trades', JSON.stringify(trades));
    renderTrades();
    this.reset();
});

renderTrades();