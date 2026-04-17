const fs = require('fs');

/**
 * Google Finance 데이터를 수집하여 검증 후 market_data.js로 저장하는 스크립트
 * 주식 가격 및 환율 정보 포함
 */

const TICKERS = [
    { id: '005930.KS', quote: '005930:KRX' },
    { id: '000660.KS', quote: '000660:KRX' },
    { id: '035420.KS', quote: '035420:KRX' },
    { id: '035720.KS', quote: '035720:KRX' },
    { id: '373220.KS', quote: '373220:KRX' },
    { id: 'AAPL', quote: 'AAPL:NASDAQ' },
    { id: 'TSLA', quote: 'TSLA:NASDAQ' },
    { id: 'NVDA', quote: 'NVDA:NASDAQ' },
    { id: 'MSFT', quote: 'MSFT:NASDAQ' },
    { id: 'GOOGL', quote: 'GOOGL:NASDAQ' },
    { id: '069500.KS', quote: '069500:KRX' },
    { id: '102110.KS', quote: '102110:KRX' },
    { id: '122630.KS', quote: '122630:KRX' },
    { id: '133690.KS', quote: '133690:KRX' }
];

const CURRENCIES = [
    { id: 'USD', quote: 'USD-KRW' },
    { id: 'JPY', quote: 'JPY-KRW' },
    { id: 'EUR', quote: 'EUR-KRW' }
];

async function fetchData(item, isCurrency = false) {
    const url = `https://www.google.com/finance/quote/${item.quote}`;
    console.log(`수집 중: ${item.quote}...`);

    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const html = await response.text();

        const priceMatch = html.match(/class="YMlKec fxKbKc">([^<]+)<\/div>/);
        const rawPrice = priceMatch ? priceMatch[1] : null;

        const changeMatch = html.match(/class="[^"]*(?:P639gc|NUnV6c)[^"]*">([^<]+)<\/div>/);
        const rawChange = changeMatch ? changeMatch[1] : "0";

        const percentMatch = html.match(/class="[^"]*JXPhv[^"]*">([^<]+)<\/div>/);
        const rawPercent = percentMatch ? percentMatch[1] : "0%";

        if (!rawPrice) return null;

        const price = parseFloat(rawPrice.replace(/[^0-9.]/g, ''));
        if (isNaN(price)) return null;

        return {
            id: item.id,
            price: price,
            formattedPrice: rawPrice,
            change: rawChange,
            percent: rawPercent,
            isCurrency: isCurrency,
            updatedAt: new Date().toISOString()
        };

    } catch (error) {
        console.error(`실패: ${item.quote} - ${error.message}`);
        return null;
    }
}

async function main() {
    console.log('--- 구글 파이낸스 데이터 수집 시작 (주식 & 환율) ---');
    const stocks = {};
    const exchangeRates = {};

    for (const item of TICKERS) {
        const data = await fetchData(item);
        if (data) stocks[item.id] = data;
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    for (const item of CURRENCIES) {
        const data = await fetchData(item, true);
        if (data) exchangeRates[item.id] = data;
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    const output = {
        lastUpdate: new Date().toISOString(),
        stocks: stocks,
        exchangeRates: exchangeRates
    };

    const jsContent = `window.MARKET_DATA = ${JSON.stringify(output, null, 2)};`;
    fs.writeFileSync('market_data.js', jsContent);
    console.log('\n--- 완료: market_data.js (주식+환율) 저장됨 ---');
}

main();
