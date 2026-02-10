/**
 * gameEngine.js
 * Catch the Fruit 게임 로직
 */

class GameEngine {
    constructor() {
        this.score = 0;
        this.level = 1;
        this.timeLimit = 60;
        this.isGameActive = false;
        this.gameTimer = null;
        this.gameLoopId = null;

        // 게임 요소
        this.items = []; // 하늘에서 떨어지는 아이템들
        this.basketPosition = "CENTER"; // 현재 바구니 위치 (LEFT, CENTER, RIGHT)
        this.lanes = {
            "LEFT": 100, // 캔버스 좌표 (가정)
            "CENTER": 200,
            "RIGHT": 300
        };

        // 설정
        this.canvas = null;
        this.ctx = null;
        this.lastFrameTime = 0;
        this.spawnRate = 2000; // 아이템 생성 주기 (ms)
        this.lastSpawnTime = 0;
        this.itemSpeed = 2; // 기본 낙하 속도

        // 콜백
        this.onScoreChange = null;
        this.onTimeChange = null;
        this.onGameEnd = null;

        // 이미지 리소스 (실제 구현 시 이미지 로딩 필요, 여기선 도형으로 대체)
        this.itemTypes = [
            { type: "WORM", score: 100, emoji: "🪱", prob: 0.5 },
            { type: "FLY", score: 200, emoji: "🪰", prob: 0.3 },
            { type: "BOMB", score: -500, emoji: "💣", prob: 0.2 } // 폭탄은 점수 차감 또는 게임오버
        ];
    }

    /**
     * 게임 엔진 초기화
     * @param {HTMLCanvasElement} canvas 
     */
    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        // 캔버스 크기 설정 (화면 크기에 맞게)
        this.canvas.width = 400;
        this.canvas.height = 400;

        // 레인 좌표 계산
        const laneWidth = this.canvas.width / 3;
        this.lanes = {
            "LEFT": laneWidth / 2,
            "CENTER": laneWidth + laneWidth / 2,
            "RIGHT": laneWidth * 2 + laneWidth / 2
        };
    }

    /**
     * 게임 시작
     */
    start() {
        if (!this.canvas) {
            console.error("GameEngine not initialized. Call init(canvas) first.");
            return;
        }

        this.isGameActive = true;
        this.score = 0;
        this.level = 1;
        this.timeLimit = 60;
        this.items = [];
        this.itemSpeed = 2;
        this.spawnRate = 1500;
        this.lastFrameTime = performance.now();

        this.startTimer();
        this.loop();

        this.updateUI();
    }

    /**
     * 게임 중지
     */
    stop() {
        this.isGameActive = false;
        this.clearTimer();
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }

        if (this.onGameEnd) {
            this.onGameEnd(this.score, this.level);
        }
    }

    /**
     * 메인 게임 루프
     */
    loop(timestamp) {
        if (!this.isGameActive) return;

        const deltaTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;

        this.update(deltaTime, timestamp);
        this.draw();

        this.gameLoopId = requestAnimationFrame((t) => this.loop(t));
    }

    /**
     * 상태 업데이트
     */
    update(deltaTime, timestamp) {
        // 1. 아이템 생성
        if (timestamp - this.lastSpawnTime > this.spawnRate) {
            this.spawnItem();
            this.lastSpawnTime = timestamp;
        }

        // 2. 아이템 이동 및 충돌 처리
        for (let i = this.items.length - 1; i >= 0; i--) {
            let item = this.items[i];
            item.y += this.itemSpeed;

            // 바구니와 충돌 체크 (간단한 거리 기반)
            // 바구니 Y위치는 바닥 부근
            const basketY = this.canvas.height - 50;

            // 같은 레인에 있고, Y좌표가 바구니 위치 근처라면
            if (Math.abs(item.y - basketY) < 30 && this.isLaneMatch(item.lane, this.basketPosition)) {
                this.handleCollision(item);
                this.items.splice(i, 1); // 아이템 제거
                continue;
            }

            // 화면 밖으로 나감
            if (item.y > this.canvas.height) {
                this.items.splice(i, 1);
            }
        }
    }

    isLaneMatch(itemLane, basketLane) {
        // 한글/영어 매핑 처리도 고려해야 하지만, 여기선 내부적으로 통일된 값 사용 가정
        // 인식된 포즈: "왼쪽", "가운데", "오른쪽" -> 내부 상태: "LEFT", "CENTER", "RIGHT"
        // 생성된 아이템 레인: "LEFT", "CENTER", "RIGHT"
        return itemLane === basketLane;
    }

    /**
     * 아이템 생성
     */
    spawnItem() {
        const keys = ["LEFT", "CENTER", "RIGHT"];
        const randomLane = keys[Math.floor(Math.random() * keys.length)];

        // 확률 기반 아이템 타입 선택
        const rand = Math.random();
        let selectedType = this.itemTypes[0];
        let cumProb = 0;
        for (let type of this.itemTypes) {
            cumProb += type.prob;
            if (rand <= cumProb) {
                selectedType = type;
                break;
            }
        }

        this.items.push({
            x: this.lanes[randomLane],
            y: -30,
            lane: randomLane,
            ...selectedType
        });
    }

    /**
     * 충돌 처리
     */
    handleCollision(item) {
        if (item.type === "BOMB") {
            // 폭탄: 게임 오버
            this.stop();
            alert("폭탄을 받았습니다! 게임 오버!");
        } else {
            // 점수 획득
            this.addScore(item.score);
        }
    }

    /**
     * 화면 그리기
     */
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. 레인 구분선 그리기 (선택)
        this.ctx.strokeStyle = "#eee";
        this.ctx.beginPath();
        const laneWidth = this.canvas.width / 3;
        this.ctx.moveTo(laneWidth, 0);
        this.ctx.lineTo(laneWidth, this.canvas.height);
        this.ctx.moveTo(laneWidth * 2, 0);
        this.ctx.lineTo(laneWidth * 2, this.canvas.height);
        this.ctx.stroke();

        // 2. 바구니 그리기
        this.drawBasket();

        // 3. 아이템 그리기
        for (let item of this.items) {
            this.drawItem(item);
        }
    }

    drawBasket() {
        const x = this.lanes[this.basketPosition];
        const y = this.canvas.height - 50;

        this.ctx.font = "40px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText("🐸", x, y + 15);

        // 텍스트
        this.ctx.fillStyle = "white";
        this.ctx.font = "12px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText("Frog", x, y + 25);
    }

    drawItem(item) {
        this.ctx.font = "30px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText(item.emoji, item.x, item.y + 10);
    }

    /**
     * 포즈 업데이트 (외부에서 호출)
     */
    // PoseEngine의 예측 결과(class name)를 받아서 바구니 위치 업데이트
    updatePose(predictionDetails) {
        // predictionDetails 구조: { className: "왼쪽", probability: 0.99 }
        if (!this.isGameActive) return;

        const label = predictionDetails; // stabilizer에서 className 문자열만 넘어온다고 가정

        if (label === "왼쪽" || label === "LEFT") this.basketPosition = "LEFT";
        else if (label === "가운데" || label === "CENTER") this.basketPosition = "CENTER";
        else if (label === "오른쪽" || label === "RIGHT") this.basketPosition = "RIGHT";
    }

    /**
     * 타이머 및 점수 관리
     */
    startTimer() {
        this.gameTimer = setInterval(() => {
            this.timeLimit--;

            // 레벨업 체크 (시간 흐름에 따라 난이도 상승 or 점수 기반)
            // 여기선 점수 기반으로 addScore에서 처리

            if (this.onTimeChange) this.onTimeChange(this.timeLimit);

            if (this.timeLimit <= 0) {
                this.stop();
                alert("시간 종료! 게임 오버!");
            }
        }, 1000);
    }

    clearTimer() {
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
    }

    addScore(points) {
        this.score += points;

        // 레벨업: 500점 마다
        const newLevel = Math.floor(this.score / 500) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.spawnRate = Math.max(500, 2000 - (this.level - 1) * 200); // 200ms씩 감소
            this.itemSpeed += 0.5; // 속도 증가
        }

        this.updateUI();
    }

    updateUI() {
        if (this.onScoreChange) this.onScoreChange(this.score, this.level);
        if (this.onTimeChange) this.onTimeChange(this.timeLimit);
    }

    setCallbacks({ onScoreChange, onTimeChange, onGameEnd }) {
        this.onScoreChange = onScoreChange;
        this.onTimeChange = onTimeChange;
        this.onGameEnd = onGameEnd;
    }
}

// 전역으로 내보내기
window.GameEngine = GameEngine;
