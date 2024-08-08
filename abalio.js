const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const scoreElement = document.getElementById('score');
const timerElement = document.getElementById('timer');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 20,
    color: 'blue',
    speed: 3,
    shadowEffect: '0px 0px 10px rgba(0, 0, 0, 0.5)'
};

const enemies = [];
const numEnemies = 10;
const enemyRadius = 15;
const enemySpeed = 0.1; // Ajustada para uma velocidade mais lenta

const points = [];
const numPoints = 100;
const pointRadius = 5;
const pointSpeed = 0.1; // Ajustada para uma velocidade mais lenta

let score = 0;
let startTime;
let elapsedTime = 0;
let gameInterval;
let gameRunning = false;

// Funções de inicialização
function createEnemies() {
    enemies.length = 0;
    for (let i = 0; i < numEnemies; i++) {
        enemies.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: enemyRadius,
            color: 'green',
            dx: Math.random() * enemySpeed * 2 - enemySpeed,
            dy: Math.random() * enemySpeed * 2 - enemySpeed,
            state: 'searching',
            target: null
        });
    }
}

function createPoints() {
    points.length = 0;
    for (let i = 0; i < numPoints; i++) {
        points.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: pointRadius,
            dx: Math.random() * pointSpeed * 2 - pointSpeed,
            dy: Math.random() * pointSpeed * 2 - pointSpeed
        });
    }
}

// Atualiza a posição do jogador com teclado
const keys = {};
document.addEventListener('keydown', (event) => {
    keys[event.key] = true;
});
document.addEventListener('keyup', (event) => {
    keys[event.key] = false;
});

function updatePlayerPosition() {
    if (keys['ArrowUp']) player.y -= player.speed;
    if (keys['ArrowDown']) player.y += player.speed;
    if (keys['ArrowLeft']) player.x -= player.speed;
    if (keys['ArrowRight']) player.x += player.speed;

    // Mapeia o jogador para o outro lado do canvas
    if (player.x < 0) player.x = canvas.width;
    if (player.x > canvas.width) player.x = 0;
    if (player.y < 0) player.y = canvas.height;
    if (player.y > canvas.height) player.y = 0;
}

// Atualiza a posição do jogador com o mouse
function updatePlayerPositionMouse(mouseX, mouseY) {
    const dx = mouseX - player.x;
    const dy = mouseY - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    player.x += (dx / distance) * player.speed;
    player.y += (dy / distance) * player.speed;

    // Mapeia o jogador para o outro lado do canvas
    if (player.x < 0) player.x = canvas.width;
    if (player.x > canvas.width) player.x = 0;
    if (player.y < 0) player.y = canvas.height;
    if (player.y > canvas.height) player.y = 0;
}

// Atualiza a posição das bolinhas inimigas
function updateEnemies() {
    enemies.forEach(enemy => {
        const dxToPlayer = player.x - enemy.x;
        const dyToPlayer = player.y - enemy.y;
        const distanceToPlayer = Math.sqrt(dxToPlayer * dxToPlayer + dyToPlayer * dyToPlayer);

        if (enemy.state === 'searching') {
            let closestPoint = null;
            let minDistance = Infinity;
            
            points.forEach(point => {
                const dxToPoint = point.x - enemy.x;
                const dyToPoint = point.y - enemy.y;
                const distanceToPoint = Math.sqrt(dxToPoint * dxToPoint + dyToPoint * dyToPoint);
                
                if (distanceToPoint < minDistance) {
                    minDistance = distanceToPoint;
                    closestPoint = point;
                }
            });

            if (closestPoint) {
                enemy.target = closestPoint;
                const dxToTarget = closestPoint.x - enemy.x;
                const dyToTarget = closestPoint.y - enemy.y;
                const distanceToTarget = Math.sqrt(dxToTarget * dxToTarget + dyToTarget * dyToTarget);

                enemy.x += (dxToTarget / distanceToTarget) * enemySpeed;
                enemy.y += (dyToTarget / distanceToTarget) * enemySpeed;

                closestPoint.x += closestPoint.dx;
                closestPoint.y += closestPoint.dy;

                if (closestPoint.x < 0 || closestPoint.x > canvas.width) closestPoint.dx *= -1;
                if (closestPoint.y < 0 || closestPoint.y > canvas.height) closestPoint.dy *= -1;

                if (distanceToTarget < enemy.radius + pointRadius) {
                    points.splice(points.indexOf(closestPoint), 1);
                    enemy.radius += 1;
                    closestPoint.dx *= 1.1;
                    closestPoint.dy *= 1.1;
                    score++;
                    updateScore();
                    applyShadowEffect(closestPoint.x, closestPoint.y, pointRadius);
                }

                if (enemy.radius > player.radius && distanceToPlayer < 200) {
                    enemy.state = 'chasing';
                }
            }
        } else if (enemy.state === 'chasing') {
            const dxToPlayer = player.x - enemy.x;
            const dyToPlayer = player.y - enemy.y;
            const distanceToPlayer = Math.sqrt(dxToPlayer * dxToPlayer + dyToPlayer * dyToPlayer);

            enemy.x += (dxToPlayer / distanceToPlayer) * enemySpeed;
            enemy.y += (dyToPlayer / distanceToPlayer) * enemySpeed;

            if (distanceToPlayer < player.radius + enemy.radius) {
                if (enemy.radius > player.radius) {
                    endGame(false);
                }
            }

            if (enemy.radius < player.radius) {
                enemy.state = 'searching';
                enemy.target = null;
            }
        }

        if (enemy.x < 0) enemy.x = canvas.width;
        if (enemy.x > canvas.width) enemy.x = 0;
        if (enemy.y < 0) enemy.y = canvas.height;
        if (enemy.y > canvas.height) enemy.y = 0;
    });
}

// Atualiza a tela do jogo
function update() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    updateEnemies();
    checkCollisions();
    drawPlayer();
    drawEnemies();
    drawPoints();
    updateTimer();

    requestAnimationFrame(update);
}

// Desenha o jogador
function drawPlayer() {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.closePath();
}

// Desenha as bolinhas inimigas
function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fillStyle = enemy.color;
        ctx.fill();
        ctx.closePath();
    });
}

// Desenha as bolinhas comestíveis
function drawPoints() {
    points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.closePath();
    });
}

// Aplica o efeito de sombra
function applyShadowEffect(x, y, radius) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'yellow';
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0;
}

// Verifica colisões com bolinhas
function checkCollisions() {
    points.forEach((point, index) => {
        const dx = player.x - point.x;
        const dy = player.y - point.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.radius + point.radius) {
            points.splice(index, 1);
            player.radius += 1;
            score++;
            updateScore();
            applyShadowEffect(point.x, point.y, point.radius);
        }
    });

    enemies.forEach(enemy => {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.radius + enemy.radius) {
            if (player.radius < enemy.radius) {
                endGame(false);
            } else {
                enemies.splice(enemies.indexOf(enemy), 1);
                score += 10;
                updateScore();
                applyShadowEffect(player.x, player.y, player.radius);
            }
        }
    });
}

// Atualiza a posição das bolinhas vermelhas
function updatePoints() {
    points.forEach(point => {
        point.x += point.dx;
        point.y += point.dy;

        // Verifica bordas e ajusta a direção
        if (point.x < 0 || point.x > canvas.width) point.dx *= -1;
        if (point.y < 0 || point.y > canvas.height) point.dy *= -1;
    });
}

// Atualiza a pontuação
function updateScore() {
    scoreElement.textContent = `Bolinhas comidas: ${score}`;
}

// Atualiza o tempo
function updateTimer() {
    if (gameRunning) {
        const now = new Date();
        elapsedTime = Math.floor((now - startTime) / 1000);
        const minutes = Math.floor(elapsedTime / 60);
        const seconds = elapsedTime % 60;
        timerElement.textContent = `Tempo: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Inicia o jogo
function startGame() {
    gameRunning = true;
    startTime = new Date();
    createEnemies();
    createPoints();
    score = 0;
    updateScore();
    gameInterval = setInterval(update, 1000 / 60);
    startButton.style.display = 'none';
    restartButton.style.display = 'none';
}

// Reinicia o jogo
function restartGame() {
    gameRunning = true;
    createEnemies();
    createPoints();
    score = 0;
    updateScore();
    startTime = new Date();
    gameInterval = setInterval(update, 1000 / 60);
    restartButton.style.display = 'none';
}

// Encerra o jogo
function endGame(success) {
    gameRunning = false;
    clearInterval(gameInterval);
    if (success) {
        alert('Você venceu!');
    } else {
        alert('Você perdeu!');
    }
    restartButton.style.display = 'block';
}

// Adiciona eventos aos botões
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', restartGame);

// Atualiza a posição do jogador com o mouse
canvas.addEventListener('mousemove', (event) => {
    if (gameRunning) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        updatePlayerPositionMouse(mouseX, mouseY);
    }
});

// Atualiza a posição do jogador com teclado
document.addEventListener('keydown', (event) => {
    keys[event.key] = true;
});
document.addEventListener('keyup', (event) => {
    keys[event.key] = false;
});