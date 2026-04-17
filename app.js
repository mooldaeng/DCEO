// --- 가상 데이터 통합 (CORS 문제 방지) ---
const LATEST_DRAW = {
    drawNo: 1115,
    drawDate: "2024-04-13",
    numbers: [7, 12, 23, 32, 34, 36],
    bonusNo: 8
};

const STATS_DATA = {
    hotNumbers: [1, 12, 23, 33, 45, 7, 36],
    coldNumbers: [2, 15, 28, 40, 41, 19, 5]
};

// --- 전역 상태 ---
let currentGeneratedNumbers = [];
let savedNumbers = JSON.parse(localStorage.getItem('lottoPick_saved')) || [];

// --- DOM 요소 ---
const tabs = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');
const btnGenerate = document.getElementById('btn-generate');
const btnSaveNumber = document.getElementById('btn-save-number');
const resultBallsContainer = document.getElementById('result-balls');
const afterGenerateActions = document.getElementById('after-generate');
const savedListContainer = document.getElementById('saved-list');
const latestResultInfo = document.getElementById('latest-result-info');

// --- 초기화 ---
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initLatestResult();
    renderSavedNumbers();

    btnGenerate.addEventListener('click', generateLottoNumbers);
    btnSaveNumber.addEventListener('click', saveCurrentNumbers);
});

// --- 네비게이션 로직 ---
function initNavigation() {
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            const targetContent = document.getElementById(target);
            if (targetContent) targetContent.classList.add('active');

            if (target === 'my-numbers') renderSavedNumbers();
            if (target === 'results') initLatestResult();
        });
    });
}

// --- 번호 생성 알고리즘 (보정됨) ---
function generateLottoNumbers() {
    const fixedInput = document.getElementById('include-numbers').value;
    const excludedInput = document.getElementById('exclude-numbers').value;
    const ratioInput = document.getElementById('odd-even-ratio').value;
    const strategy = document.getElementById('gen-strategy').value;

    const fixedNums = parseInput(fixedInput).slice(0, 5);
    const excludedNums = parseInput(excludedInput);

    // 기본 가용 숫자 풀 생성
    let basePool = [];
    for (let i = 1; i <= 45; i++) {
        if (!fixedNums.includes(i) && !excludedNums.includes(i)) {
            basePool.push(i);
        }
    }

    // 전략에 따른 가중치 부여
    let weightedPool = [...basePool];
    if (strategy === 'hot') {
        const hotInPool = STATS_DATA.hotNumbers.filter(n => basePool.includes(n));
        weightedPool = [...weightedPool, ...hotInPool, ...hotInPool]; // 핫넘버 확률 3배
    } else if (strategy === 'cold') {
        const coldInPool = STATS_DATA.coldNumbers.filter(n => basePool.includes(n));
        weightedPool = [...weightedPool, ...coldInPool, ...coldInPool];
    }

    let numbers = [];
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
        let tempNumbers = [...fixedNums];
        let currentPool = [...weightedPool];

        while (tempNumbers.length < 6 && currentPool.length > 0) {
            const randomIndex = Math.floor(Math.random() * currentPool.length);
            const selected = currentPool.splice(randomIndex, 1)[0];
            if (!tempNumbers.includes(selected)) {
                tempNumbers.push(selected);
            }
        }

        tempNumbers.sort((a, b) => a - b);

        // 홀짝 비율 체크
        if (ratioInput !== 'auto') {
            const [targetOdd, targetEven] = ratioInput.split(':').map(Number);
            const currentOdd = tempNumbers.filter(n => n % 2 !== 0).length;
            if (currentOdd === targetOdd) {
                numbers = tempNumbers;
                break;
            }
        } else {
            numbers = tempNumbers;
            break;
        }
        attempts++;
    }

    if (numbers.length < 6) {
        alert('조건에 맞는 번호를 생성할 수 없습니다. 필터를 조정해 주세요.');
        return;
    }

    currentGeneratedNumbers = numbers;
    renderBalls(numbers, resultBallsContainer);
    afterGenerateActions.classList.remove('hidden');

    if (navigator.vibrate) navigator.vibrate(50);
}

function parseInput(input) {
    if (!input) return [];
    return input.split(/[, ]+/).map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 45);
}

// --- UI 렌더링 ---
function renderBalls(numbers, container) {
    if (!container) return;
    container.innerHTML = '';
    numbers.forEach(num => {
        const ball = document.createElement('div');
        ball.className = `ball ${getBallRangeClass(num)}`;
        ball.textContent = num;
        container.appendChild(ball);
    });
}

function getBallRangeClass(num) {
    if (num <= 10) return 'range-1';
    if (num <= 20) return 'range-11';
    if (num <= 30) return 'range-21';
    if (num <= 40) return 'range-31';
    return 'range-41';
}

// --- 보관함 관리 ---
function saveCurrentNumbers() {
    if (currentGeneratedNumbers.length !== 6) return;

    const newRecord = {
        id: Date.now(),
        numbers: [...currentGeneratedNumbers],
        memo: "",
        isPurchased: false,
        createdAt: new Date().toLocaleDateString()
    };

    savedNumbers.unshift(newRecord);
    localStorage.setItem('lottoPick_saved', JSON.stringify(savedNumbers));
    
    alert('보관함에 저장되었습니다!');
    afterGenerateActions.classList.add('hidden');
}

function renderSavedNumbers() {
    if (!savedListContainer) return;
    if (savedNumbers.length === 0) {
        savedListContainer.innerHTML = '<p class="empty-msg">저장된 번호가 없습니다.</p>';
        return;
    }

    savedListContainer.innerHTML = '';
    savedNumbers.forEach(item => {
        const matchResult = checkWinning(item.numbers);
        const div = document.createElement('div');
        div.className = 'saved-item';
        div.innerHTML = `
            <div class="saved-item-header">
                <span>${item.createdAt}</span>
                <span class="match-status">${matchResult}</span>
            </div>
            <div class="saved-item-balls"></div>
            <textarea class="memo-area" placeholder="메모를 입력하세요...">${item.memo}</textarea>
            <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
                <label style="font-size:0.8rem">
                    <input type="checkbox" ${item.isPurchased ? 'checked' : ''} class="check-purchased"> 구매 완료
                </label>
                <button class="btn-delete" style="padding:4px 8px; font-size:0.7rem; background:#ffeded; color:#ff5252; border:none; border-radius:4px; cursor:pointer;">삭제</button>
            </div>
        `;

        const ballContainer = div.querySelector('.saved-item-balls');
        renderBalls(item.numbers, ballContainer);

        div.querySelector('.memo-area').addEventListener('change', (e) => {
            item.memo = e.target.value;
            updateLocalStorage();
        });

        div.querySelector('.check-purchased').addEventListener('change', (e) => {
            item.isPurchased = e.target.checked;
            updateLocalStorage();
        });

        div.querySelector('.btn-delete').addEventListener('click', () => {
            if(confirm('삭제하시겠습니까?')) {
                savedNumbers = savedNumbers.filter(n => n.id !== item.id);
                updateLocalStorage();
                renderSavedNumbers();
            }
        });

        savedListContainer.appendChild(div);
    });
}

function updateLocalStorage() {
    localStorage.setItem('lottoPick_saved', JSON.stringify(savedNumbers));
}

function initLatestResult() {
    if (!latestResultInfo) return;
    latestResultInfo.innerHTML = `
        <p><strong>제 ${LATEST_DRAW.drawNo}회</strong> (${LATEST_DRAW.drawDate})</p>
        <div class="balls-container" id="latest-balls"></div>
        <p style="font-size: 0.8rem; color: #666; margin-top: 5px;">보너스 번호: ${LATEST_DRAW.bonusNo}</p>
    `;
    const latestBallsContainer = document.getElementById('latest-balls');
    renderBalls(LATEST_DRAW.numbers, latestBallsContainer);
}

function checkWinning(numbers) {
    const matchCount = numbers.filter(n => LATEST_DRAW.numbers.includes(n)).length;
    const hasBonus = numbers.includes(LATEST_DRAW.bonusNo);

    if (matchCount === 6) return '1등! 🏆';
    if (matchCount === 5 && hasBonus) return '2등! 🥈';
    if (matchCount === 5) return '3등! 🥉';
    if (matchCount === 4) return '4등 (5만원)';
    if (matchCount === 3) return '5등 (5천원)';
    return '낙첨';
}

document.getElementById('btn-open-scanner').addEventListener('click', () => {
    alert('QR 스캔 데모: 실제 종이 로또 대신 가상의 결과를 확인합니다.');
    const results = ['1등 당첨!', '아쉽게 낙첨되었습니다.', '5등 당첨!'];
    alert(results[Math.floor(Math.random() * results.length)]);
});
