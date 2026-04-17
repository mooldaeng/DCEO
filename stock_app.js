/**
 * StockBoard - 주식현황판 핵심 로직
 */

// --- 설정 및 상태 ---
const API_KEY = 'demo'; // 실제 사용 시 자신의 Alpha Vantage API Key로 교체 필요
const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/'; 

let currentTicker = 'AAPL';
let currentCategory = 'global';
let currentPeriod = '1M';
let chartInstance = null;

// 종목 데이터셋
const TICKERS = {
    domestic: [
        { name: '삼성전자', symbol: '005930.KS' },
        { name: 'SK하이닉스', symbol: '000660.KS' },
        { name: 'NAVER', symbol: '035420.KS' },
        { name: '카카오', symbol: '035720.KS' },
        { name: 'LG에너지솔루션', symbol: '373220.KS' }
    ],
    global: [
        { name: 'Apple', symbol: 'AAPL' },
        { name: 'Tesla', symbol: 'TSLA' },
        { name: 'Nvidia', symbol: 'NVDA' },
        { name: 'Microsoft', symbol: 'MSFT' },
        { name: 'Alphabet A', symbol: 'GOOGL' }
    ],
    etf: [
        { name: 'KODEX 200', symbol: '069500.KS' },
        { name: 'TIGER 200', symbol: '102110.KS' },
        { name: 'KODEX 레버리지', symbol: '122630.KS' },
        { name: 'TIGER 미국나스닥100', symbol: '133690.KS' }
    ]
};

// --- 초기화 ---
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initPeriodBtns();
    initSearch();
    loadTickerList('domestic');
    
    // market_data.js가 로드되면 전역 변수 MARKET_DATA를 사용함
    if (window.MARKET_DATA) {
        renderExchangeRates(window.MARKET_DATA.exchangeRates);
    }
    updateDashboard('005930.KS', '삼성전자'); // 초기 로드
});

function renderExchangeRates(rates) {
    if (!rates) return;
    const bar = document.getElementById('exchange-bar');
    bar.innerHTML = '';

    Object.keys(rates).forEach(id => {
        const item = rates[id];
        const isUp = item.percent.includes('+');
        const isDown = item.percent.includes('-');
        const cls = isUp ? 'up' : isDown ? 'down' : '';

        const div = document.createElement('div');
        div.className = `exchange-item ${cls}`;
        div.innerHTML = `
            <span>${id}</span>
            <span class="val">${item.formattedPrice.replace(/[^\d,.]/g, '')}</span>
            <span class="change">${item.percent}</span>
        `;
        bar.appendChild(div);
    });
}

// --- UI 제어 ---
function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCategory = tab.dataset.category;
            loadTickerList(currentCategory);
        });
    });
}

function initPeriodBtns() {
    const btns = document.querySelectorAll('.period-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPeriod = btn.dataset.period;
            fetchChartData(currentTicker);
        });
    });
}

function loadTickerList(category) {
    const list = document.getElementById('ticker-list');
    list.innerHTML = '';
    TICKERS[category].forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${item.name}</span>
            <span class="ticker-symbol">${item.symbol}</span>
        `;
        li.dataset.symbol = item.symbol;
        li.dataset.name = item.name;
        li.addEventListener('click', () => {
            document.querySelectorAll('#ticker-list li').forEach(el => el.classList.remove('active'));
            li.classList.add('active');
            updateDashboard(item.symbol, item.name);
        });
        list.appendChild(li);
    });
}

function initSearch() {
    const searchInput = document.getElementById('ticker-search');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const items = document.querySelectorAll('#ticker-list li');
        items.forEach(item => {
            const name = item.dataset.name.toLowerCase();
            const symbol = item.dataset.symbol.toLowerCase();
            if (name.includes(query) || symbol.includes(query)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });
}

// --- 데이터 페칭 및 업데이트 ---
async function updateDashboard(symbol, name) {
    currentTicker = symbol;
    document.getElementById('current-name').textContent = name;
    document.getElementById('current-ticker').textContent = symbol;
    
    // 로딩 상태 표시
    document.getElementById('news-list').innerHTML = '<li class="loading">뉴스를 불러오는 중...</li>';
    document.getElementById('financial-data').innerHTML = '<p class="loading">재무 정보를 불러오는 중...</p>';

    // 실제 데이터 우선 표시
    const mData = window.MARKET_DATA;
    if (mData && mData.stocks[symbol]) {
        updatePriceInfoFromMarketData(mData.stocks[symbol]);
    } else {
        // 데이터가 없을 경우 초기화
        document.getElementById('current-price').textContent = '--';
        document.getElementById('price-change').textContent = '--';
    }

    fetchChartData(symbol);
    fetchNews(name);
    fetchFinancials(symbol);
}

function updatePriceInfoFromMarketData(stock) {
    const priceEl = document.getElementById('current-price');
    const changeEl = document.getElementById('price-change');
    const displayEl = document.getElementById('price-display');
    
    // 구글 파이낸스에서 가져온 포맷 그대로 사용
    priceEl.textContent = stock.formattedPrice.replace(/[^\d,.]/g, ''); 
    changeEl.textContent = `${stock.change} (${stock.percent})`;
    
    const isUp = stock.percent.includes('+') || (!stock.percent.includes('-') && stock.change !== "0" && stock.change !== "0.00");
    const isDown = stock.percent.includes('-');
    
    displayEl.className = 'price-display ' + (isUp ? 'up' : isDown ? 'down' : 'stable');
}

async function fetchChartData(symbol) {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${API_KEY}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        let seriesData = [];
        if (data["Time Series (Daily)"]) {
            const timeSeries = data["Time Series (Daily)"];
            seriesData = Object.keys(timeSeries).map(date => {
                return {
                    x: new Date(date),
                    y: [
                        parseFloat(timeSeries[date]["1. open"]),
                        parseFloat(timeSeries[date]["2. high"]),
                        parseFloat(timeSeries[date]["3. low"]),
                        parseFloat(timeSeries[date]["4. close"])
                    ]
                };
            }).reverse();
        } else {
            seriesData = generateMockChartData();
        }

        renderChart(seriesData);
        
        // 실제 데이터(MARKET_DATA)가 없을 때만 차트 데이터에서 가격 추출
        if (!(window.MARKET_DATA && window.MARKET_DATA.stocks[symbol])) {
            updatePriceInfo(seriesData);
        }
    } catch (error) {
        console.error("Chart fetch error:", error);
        const mockData = generateMockChartData();
        renderChart(mockData);
        if (!(window.MARKET_DATA && window.MARKET_DATA.stocks[symbol])) {
            updatePriceInfo(mockData);
        }
    }
}

function updatePriceInfo(data) {
    if (!data || data.length < 2) return;
    const latest = data[data.length - 1].y[3];
    const prev = data[data.length - 2].y[3];
    const change = latest - prev;
    const changePercent = (change / prev * 100).toFixed(2);
    
    const priceEl = document.getElementById('current-price');
    const changeEl = document.getElementById('price-change');
    const displayEl = document.getElementById('price-display');
    
    priceEl.textContent = Number(latest).toLocaleString();
    const sign = change > 0 ? '+' : '';
    changeEl.textContent = `${sign}${Number(change).toLocaleString()} (${sign}${changePercent}%)`;
    displayEl.className = 'price-display ' + (change > 0 ? 'up' : change < 0 ? 'down' : 'stable');
}

function renderChart(data) {
    const options = {
        series: [{ data: data }],
        chart: { type: 'candlestick', height: 400, toolbar: { show: true } },
        xaxis: { type: 'datetime' },
        yaxis: { tooltip: { enabled: true } },
        plotOptions: {
            candlestick: {
                colors: { upward: '#e74c3c', downward: '#3498db' }
            }
        }
    };
    if (chartInstance) chartInstance.destroy();
    chartInstance = new ApexCharts(document.querySelector("#main-chart"), options);
    chartInstance.render();
}

async function fetchNews(keyword) {
    const newsList = document.getElementById('news-list');
    const mockNews = [
        { title: `${keyword} 관련 시장 전망 발표... 전략적 투자 확대`, date: '2024-04-17' },
        { title: `글로벌 증시 혼조세 속 ${keyword} 주가 변동성 주목`, date: '2024-04-16' },
        { title: `[분석] ${keyword} 분기 실적 예상치 상회하나?`, date: '2024-04-15' },
        { title: `경제 지표 발표에 따른 ${keyword} 향후 향방은`, date: '2024-04-14' }
    ];

    setTimeout(() => {
        newsList.innerHTML = '';
        mockNews.forEach(news => {
            const li = document.createElement('li');
            li.className = 'news-item';
            li.innerHTML = `<a href="#">${news.title}</a><span class="news-date">${news.date}</span>`;
            newsList.appendChild(li);
        });
    }, 500);
}

async function fetchFinancials(symbol) {
    const financialData = document.getElementById('financial-data');
    const mockFin = {
        marketCap: (Math.random() * 500 + 100).toFixed(1) + '조',
        per: (Math.random() * 20 + 5).toFixed(2),
        pbr: (Math.random() * 2 + 0.5).toFixed(2),
        roe: (Math.random() * 15 + 5).toFixed(1) + '%',
        revenue: (Math.random() * 200 + 50).toFixed(1) + '조',
        operatingProfit: (Math.random() * 50 + 10).toFixed(1) + '조'
    };

    setTimeout(() => {
        financialData.innerHTML = `
            <div class="financial-grid">
                <div class="fin-item"><span class="fin-label">시가총액</span><span class="fin-value">${mockFin.marketCap}</span></div>
                <div class="fin-item"><span class="fin-label">PER</span><span class="fin-value">${mockFin.per}배</span></div>
                <div class="fin-item"><span class="fin-label">PBR</span><span class="fin-value">${mockFin.pbr}배</span></div>
                <div class="fin-item"><span class="fin-label">ROE</span><span class="fin-value">${mockFin.roe}</span></div>
                <div class="fin-item"><span class="fin-label">매출액</span><span class="fin-value">${mockFin.revenue}</span></div>
                <div class="fin-item"><span class="fin-label">영업이익</span><span class="fin-value">${mockFin.operatingProfit}</span></div>
            </div>
        `;
    }, 800);
}

function generateMockChartData() {
    let data = [];
    let basePrice = 100000;
    for (let i = 0; i < 30; i++) {
        let open = basePrice + Math.random() * 2000 - 1000;
        let high = open + Math.random() * 1000;
        let low = open - Math.random() * 1000;
        let close = (high + low) / 2 + Math.random() * 1000 - 500;
        data.push({
            x: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
            y: [open.toFixed(0), high.toFixed(0), low.toFixed(0), close.toFixed(0)]
        });
        basePrice = close;
    }
    return data;
}
