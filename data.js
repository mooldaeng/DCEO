/**
 * 로또픽(LottoPick) 가상 데이터
 */
const LATEST_DRAW = {
    drawNo: 1115,
    drawDate: "2024-04-13",
    numbers: [7, 12, 23, 32, 34, 36],
    bonusNo: 8
};

// 최근 50회 기준 가상 통계 데이터 (핫앤콜드)
const STATS_DATA = {
    hotNumbers: [1, 12, 23, 33, 45, 7, 36], // 자주 나온 번호
    coldNumbers: [2, 15, 28, 40, 41, 19, 5], // 잘 안 나온 번호
    oddEvenHistory: { odd: 3, even: 3 } // 최근 평균 비율
};

export { LATEST_DRAW, STATS_DATA };
