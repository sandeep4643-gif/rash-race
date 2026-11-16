/* =====================================
   RASH-RACE - RACING ENGINE
===================================== */

let selectedCar = "volt";

const carNames = {
    volt: "VOLT GT",
    venom: "VENOM X",
    pulse: "PULSE R"
};

const carSettings = {
    volt:  { maxSpeed: 6.0, acceleration: 0.10, handling: 0.052, color: "#19f5ff" },
    venom: { maxSpeed: 6.0, acceleration: 0.095, handling: 0.045, color: "#ff2bd6" },
    pulse: { maxSpeed: 6.0, acceleration: 0.12, handling: 0.068, color: "#b6ff39" }
};

// Screen navigation
function showScreen(screenId) {
    document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.remove("active");
    });

    document.getElementById(screenId).classList.add("active");
}

function openGarage() {
    showScreen("garageScreen");
}

function goHome() {
    showScreen("homeScreen");
}

// Car selection
function selectCar(car) {
    selectedCar = car;

    document.querySelectorAll(".car-card").forEach(card => {
        card.classList.remove("selected");
    });

    document.getElementById(car + "Card").classList.add("selected");

    document.getElementById("selectedCarText").textContent =
        "Selected: " + carNames[car];
}


/* =====================================
   GAME VARIABLES
===================================== */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const miniMap = document.getElementById("miniMap");
const mapCtx = miniMap.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const CENTER_X = 500;
const CENTER_Y = 350;

const TRACK_RX = 330;
const TRACK_RY = 220;

let gameRunning = false;
let animationId = null;
let raceFinished = false;

// Countdown & Celebration variables
let countdownActive = true;
let countdownValue = 3;
let celebrationParticles = [];
let isFirstPlace = false;

let player;
let bots = [];
let raceFrame = 0;

const keys = {
    up: false,
    down: false,
    left: false,
    right: false
};


/* =====================================
   PLAYER AND AI SETUP (START GRID)
===================================== */

function createPlayer() {
    const settings = carSettings[selectedCar];

    return {
        x: CENTER_X - 30,
        y: CENTER_Y - TRACK_RY + 10,
        angle: 0,
        speed: 0,
        maxSpeed: settings.maxSpeed,
        acceleration: settings.acceleration,
        handling: settings.handling,
        color: settings.color,
        progress: 0,
        lastAngle: -Math.PI / 2,
        lap: 1
    };
}

function createBots() {
    return [
        {
            name: "AI-01",
            x: CENTER_X + 30,
            y: CENTER_Y - TRACK_RY + 10,
            angle: 0,
            speed: 0.0102,
            progress: 0,
            targetSpeed: 0.0102,
            color: "#ff4b55"
        },
        {
            name: "AI-02",
            x: CENTER_X - 30,
            y: CENTER_Y - TRACK_RY + 35,
            angle: 0,
            speed: 0.0097,
            progress: 0,
            targetSpeed: 0.0097,
            color: "#ffd447"
        },
        {
            name: "AI-03",
            x: CENTER_X + 30,
            y: CENTER_Y - TRACK_RY + 35,
            angle: 0,
            speed: 0.0105,
            progress: 0,
            targetSpeed: 0.0105,
            color: "#9a72ff"
        }
    ];
}


/* =====================================
   START AND RESTART
===================================== */

function startGame() {
   releaseMobileTouches();
    player = createPlayer();
    bots = createBots();

    raceFrame = 0;
    raceFinished = false;
    countdownActive = true;
    countdownValue = 3;
    isFirstPlace = false;
    celebrationParticles = [];

    Object.keys(keys).forEach(key => {
        keys[key] = false;
    });

    document.getElementById("raceMessage").classList.add("hidden");

    showScreen("raceScreen");

    gameRunning = true;

    if (animationId) {
        cancelAnimationFrame(animationId);
    }

    gameLoop();
}

function restartRace() {
    startGame();
}

function exitRace() {
   releaseMobileTouches();
    gameRunning = false;

    if (animationId) {
        cancelAnimationFrame(animationId);
    }

    Object.keys(keys).forEach(key => {
        keys[key] = false;
    });

    showScreen("garageScreen");
}


/* =====================================
   KEYBOARD CONTROLS
===================================== */

document.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();

    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
        event.preventDefault();
    }

    if (key === "arrowup" || key === "w") keys.up = true;
    if (key === "arrowdown" || key === "s") keys.down = true;
    if (key === "arrowleft" || key === "a") keys.left = true;
    if (key === "arrowright" || key === "d") keys.right = true;
});

document.addEventListener("keyup", event => {
    const key = event.key.toLowerCase();

    if (key === "arrowup" || key === "w") keys.up = false;
    if (key === "arrowdown" || key === "s") keys.down = false;
    if (key === "arrowleft" || key === "a") keys.left = false;
    if (key === "arrowright" || key === "d") keys.right = false;
});


/* =====================================
   MOBILE TOUCH CONTROLS
===================================== */

const activeTouches = new Map();

function getControlName(button) {
    const control = button.dataset.control.toLowerCase();

    if (control === "accelerate") return "up";
    if (control === "reverse" || control === "brake") return "down";

    return control;
}

function updateTouchKeys(control) {
    keys[control] = [...activeTouches.values()].includes(control);
}

function releaseMobileTouches() {
    const controls = [...activeTouches.values()];

    activeTouches.clear();

    controls.forEach(control => {
        keys[control] = false;
    });

    document.querySelectorAll(".control-btn").forEach(button => {
        button.classList.remove("pressed");
    });
}

function releasePointer(event) {
    const control = activeTouches.get(event.pointerId);

    if (!control) return;

    activeTouches.delete(event.pointerId);
    updateTouchKeys(control);

    document.querySelectorAll(".control-btn").forEach(button => {
        if (getControlName(button) === control) {
            const stillPressed = [...activeTouches.values()]
                .includes(control);

            if (!stillPressed) {
                button.classList.remove("pressed");
            }
        }
    });
}

document.querySelectorAll("[data-control]").forEach(button => {

    button.addEventListener("pointerdown", event => {
        event.preventDefault();

        if (!gameRunning || countdownActive) return;

        const control = getControlName(button);

        if (!["up", "down", "left", "right"].includes(control)) {
            return;
        }

        activeTouches.set(event.pointerId, control);
        keys[control] = true;

        button.classList.add("pressed");

        try {
            button.setPointerCapture(event.pointerId);
        } catch (error) {}
    });

    button.addEventListener("pointerup", releasePointer);
    button.addEventListener("pointercancel", releasePointer);
    button.addEventListener("lostpointercapture", releasePointer);
});

window.addEventListener("pointerup", releasePointer);
window.addEventListener("pointercancel", releasePointer);
window.addEventListener("blur", releaseMobileTouches);

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        releaseMobileTouches();
    }
});

/* =====================================
   PLAYER PHYSICS
===================================== */

function updatePlayer() {
    if (countdownActive) return;

    if (keys.up) {
        player.speed += player.acceleration;
    }

    if (keys.down) {
        player.speed -= player.acceleration * 1.5;
    }

    // Natural friction
    if (!keys.up && !keys.down) {
        player.speed *= 0.985;
    }

    // Speed limits (Max speed 150 mapped cleanly)
    player.speed = Math.max(
        -player.maxSpeed * 0.35,
        Math.min(player.maxSpeed, player.speed)
    );

    // Steering
    if (Math.abs(player.speed) > 0.08) {

        const direction = player.speed >= 0 ? 1 : -1;
        const steeringStrength =
            player.handling * Math.min(Math.abs(player.speed) / 3, 1);

        if (keys.left) {
            player.angle -= steeringStrength * direction;
        }

        if (keys.right) {
            player.angle += steeringStrength * direction;
        }
    }

    // Move car
    player.x += Math.cos(player.angle) * player.speed;
    player.y += Math.sin(player.angle) * player.speed;

    // Keep player inside the track
    const dx = player.x - CENTER_X;
    const dy = player.y - CENTER_Y;

    const trackDistance = Math.sqrt(
        (dx * dx) / (TRACK_RX * TRACK_RX) +
        (dy * dy) / (TRACK_RY * TRACK_RY)
    );

    if (trackDistance < 0.82 || trackDistance > 1.18) {
        player.speed *= 0.94;
    }

    // Keep car within the playable area
    player.x = Math.max(25, Math.min(WIDTH - 25, player.x));
    player.y = Math.max(25, Math.min(HEIGHT - 25, player.y));

    updateProgress();
}


/* =====================================
   LAP AND RACE PROGRESS
===================================== */

function updateProgress() {

    const angle = Math.atan2(
        (player.y - CENTER_Y) / TRACK_RY,
        (player.x - CENTER_X) / TRACK_RX
    );

    let difference = angle - player.lastAngle;

    // Correct angle wraparound
    if (difference > Math.PI) difference -= Math.PI * 2;
    if (difference < -Math.PI) difference += Math.PI * 2;

    // Only count forward movement
    if (Math.abs(player.speed) > 0.1) {
        player.progress += difference;
    }

    player.lastAngle = angle;

    player.lap = Math.max(
        1,
        Math.floor(Math.max(0, player.progress) / (Math.PI * 2)) + 1
    );

    if (player.progress >= Math.PI * 2 * 3) {
        finishRace();
    }
}


/* =====================================
   AI OPPONENTS
===================================== */

function updateBots() {
    if (countdownActive) return;

    bots.forEach(bot => {
        bot.angle += bot.speed;
        bot.progress += bot.speed;

        bot.x = CENTER_X + TRACK_RX * Math.cos(bot.angle);
        bot.y = CENTER_Y + TRACK_RY * Math.sin(bot.angle);
    });
}


/* =====================================
   DRAW RACE TRACK
===================================== */

function drawTrack() {

    ctx.fillStyle = "#080e1b";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Background grid
    ctx.strokeStyle = "#12233a";
    ctx.lineWidth = 1;

    for (let x = 0; x < WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, HEIGHT);
        ctx.stroke();
    }

    for (let y = 0; y < HEIGHT; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WIDTH, y);
        ctx.stroke();
    }

    // Outer track
    ctx.beginPath();
    ctx.ellipse(CENTER_X, CENTER_Y, 390, 270, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#26364c";
    ctx.fill();

    // Neon outer border
    ctx.strokeStyle = "#19f5ff";
    ctx.lineWidth = 4;
    ctx.shadowColor = "#19f5ff";
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Inner grass / infield
    ctx.beginPath();
    ctx.ellipse(CENTER_X, CENTER_Y, 270, 150, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#102b2b";
    ctx.fill();

    ctx.strokeStyle = "#b6ff39";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#b6ff39";
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Center racing lane
    ctx.beginPath();
    ctx.ellipse(CENTER_X, CENTER_Y, TRACK_RX, TRACK_RY, 0, 0, Math.PI * 2);
    ctx.setLineDash([18, 15]);
    ctx.strokeStyle = "#b7c4d8";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    // Start / finish line at top of track
    ctx.save();
    ctx.translate(CENTER_X, CENTER_Y - TRACK_RY);

    for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 === 0 ? "#ffffff" : "#111827";
        ctx.fillRect(-35 + i * 9, -22, 9, 44);
    }

    ctx.restore();

    // Track label
    ctx.fillStyle = "#b6ff39";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText("NEON CIRCUIT", CENTER_X, CENTER_Y);
}


/* =====================================
   DRAW CARS
===================================== */

function drawCar(x, y, angle, color, isPlayer = false) {

    ctx.save();

    ctx.translate(x, y);
    ctx.rotate(angle);

    // Car glow
    ctx.shadowColor = color;
    ctx.shadowBlur = isPlayer ? 22 : 12;

    // Wheels
    ctx.fillStyle = "#02050b";
    ctx.fillRect(-13, -13, 10, 8);
    ctx.fillRect(5, -13, 10, 8);
    ctx.fillRect(-13, 5, 10, 8);
    ctx.fillRect(5, 5, 10, 8);

    // Car body
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(10, -12);
    ctx.lineTo(-11, -10);
    ctx.lineTo(-17, -5);
    ctx.lineTo(-17, 5);
    ctx.lineTo(-11, 10);
    ctx.lineTo(10, 12);
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    // Windshield
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#071425";
    ctx.fillRect(-5, -7, 10, 14);

    // Headlights
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(14, -8, 4, 4);
    ctx.fillRect(14, 4, 4, 4);

    ctx.restore();
}


/* =====================================
   DRAW PLAYER AND AI
===================================== */

function drawCars() {

    bots.forEach(bot => {
        drawCar(bot.x, bot.y, bot.angle + Math.PI / 2, bot.color);
    });

    drawCar(
        player.x,
        player.y,
        player.angle,
        player.color,
        true
    );
}


/* =====================================
   MINI MAP
===================================== */

function drawMiniMap() {

    mapCtx.fillStyle = "#080e1b";
    mapCtx.fillRect(0, 0, miniMap.width, miniMap.height);

    mapCtx.beginPath();
    mapCtx.ellipse(110, 90, 91, 68, 0, 0, Math.PI * 2);
    mapCtx.strokeStyle = "#19f5ff";
    mapCtx.lineWidth = 13;
    mapCtx.stroke();

    mapCtx.beginPath();
    mapCtx.ellipse(110, 90, 57, 34, 0, 0, Math.PI * 2);
    mapCtx.strokeStyle = "#b6ff39";
    mapCtx.lineWidth = 2;
    mapCtx.stroke();

    function mapPoint(x, y, color, radius) {
        const mapX = 110 + (x - CENTER_X) * 0.24;
        const mapY = 90 + (y - CENTER_Y) * 0.24;

        mapCtx.beginPath();
        mapCtx.arc(mapX, mapY, radius, 0, Math.PI * 2);
        mapCtx.fillStyle = color;
        mapCtx.fill();
    }

    bots.forEach(bot => {
        mapPoint(bot.x, bot.y, bot.color, 4);
    });

    mapPoint(player.x, player.y, player.color, 5);
}


/* =====================================
   HUD UPDATE (MAX SPEED 150)
===================================== */

function updateHUD() {

    const racers = [
        { progress: player.progress, isPlayer: true },
        ...bots.map(bot => ({ progress: bot.progress, isPlayer: false }))
    ];

    racers.sort((a, b) => b.progress - a.progress);

    const position = racers.findIndex(racer => racer.isPlayer) + 1;

    document.getElementById("position").textContent =
        position + " / 4";

    document.getElementById("lap").textContent =
        Math.min(player.lap, 3) + " / 3";

    // Scaled so max speed equals 150
    document.getElementById("speed").textContent =
        Math.round((Math.abs(player.speed) / player.maxSpeed) * 150);
}


/* =====================================
   FINISH RACE & CELEBRATIONS
===================================== */

function finishRace() {

    if (raceFinished) return;

    raceFinished = true;
    gameRunning = false;

    const racers = [
        { progress: player.progress, isPlayer: true },
        ...bots.map(bot => ({ progress: bot.progress, isPlayer: false }))
    ];

    racers.sort((a, b) => b.progress - a.progress);

    const position = racers.findIndex(racer => racer.isPlayer) + 1;
    isFirstPlace = (position === 1);

    if (isFirstPlace) {
        // Create celebration confetti particles
        for (let i = 0; i < 100; i++) {
            celebrationParticles.push({
                x: WIDTH / 2,
                y: HEIGHT / 2,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12 - 4,
                color: ["#19f5ff", "#b6ff39", "#ff2bd6", "#ffd447"][Math.floor(Math.random() * 4)],
                size: Math.random() * 6 + 4,
                life: 100
            });
        }
    }

    document.getElementById("raceMessageTitle").textContent =
        isFirstPlace ? "VICTORY! 🏆 1ST PLACE!" : "RACE FINISHED!";

    document.getElementById("raceMessageText").textContent =
        isFirstPlace ? "Amazing drive! You claimed the championship trophy!" : "You finished in position " + position + " out of 4.";

    document.getElementById("raceMessage").classList.remove("hidden");
}

function updateCelebration() {
    if (!isFirstPlace) return;

    celebrationParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // gravity
        p.life--;

        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });

    celebrationParticles = celebrationParticles.filter(p => p.life > 0);
}


/* =====================================
   MAIN GAME LOOP
===================================== */

function gameLoop() {

    if (!gameRunning) return;

    raceFrame++;

    // Handle Countdown Phase
    if (countdownActive) {
        drawTrack();
        drawCars();
        drawMiniMap();

        // Every ~60 frames (1 second) decrement countdown
        if (raceFrame % 60 === 0) {
            countdownValue--;
            if (countdownValue < 0) {
                countdownActive = false;
            }
        }

        // Draw Countdown Overlay on Screen
        ctx.save();
        ctx.fillStyle = "rgba(8, 14, 27, 0.75)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        ctx.fillStyle = countdownValue === 0 ? "#b6ff39" : "#19f5ff";
        ctx.font = "bold 90px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 30;

        const displayText = countdownValue > 0 ? countdownValue : "GO!";
        ctx.fillText(displayText, CENTER_X, CENTER_Y);
        ctx.restore();

        animationId = requestAnimationFrame(gameLoop);
        return;
    }

    updatePlayer();
    updateBots();

    drawTrack();
    drawCars();
    drawMiniMap();
    updateHUD();

    if (raceFinished && isFirstPlace) {
        updateCelebration();
    }

    animationId = requestAnimationFrame(gameLoop);
}
