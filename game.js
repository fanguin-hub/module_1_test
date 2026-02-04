// Game Configuration
const CONFIG = {
    CANVAS_WIDTH: window.innerWidth,
    CANVAS_HEIGHT: window.innerHeight,
    PLAYER_SPEED: 4,
    PLAYER_SIZE: 30,
    ENEMY_BASE_SPEED: 0.75, // 2배 느리게 (기존 1.5 → 0.75)
    ENEMY_SIZE: 25,
    ENEMY_SEPARATION: 35, // 적들 간 최소 거리
    PROJECTILE_SPEED: 8,
    PROJECTILE_SIZE: 8,
    BASE_ATTACK_COOLDOWN: 1000, // ms
    EXP_SCALE: 1.5, // 레벨업 경험치 증가율
};

// Enemy Types
const ENEMY_TYPES = {
    NORMAL: 'normal',
    FAST: 'fast',      // 엘리트 1: 빠른 몹
    TANK: 'tank',      // 엘리트 2: 탱커 몹
    SHOOTER: 'shooter' // 엘리트 3: 원거리 공격 몹
};

// Game State
const game = {
    canvas: null,
    ctx: null,
    gameLoop: null,
    isRunning: false,
    isPaused: false,
    startTime: 0,
    currentTime: 0,
    pausedTime: 0, // 일시정지된 시간 추적

    player: {
        x: 0,
        y: 0,
        hp: 100,
        maxHp: 100,
        exp: 0,
        level: 1,
        expToNext: 100,
        speed: CONFIG.PLAYER_SPEED,
        damage: 10,
        baseDamage: 10, // 기본 대미지 (추가탄 계산용)
        attackCooldown: CONFIG.BASE_ATTACK_COOLDOWN,
        projectileCount: 1,
        additionalProjectileCount: 0, // 추가탄 개수 (최대 4개)
        additionalProjectileDamage: 0, // 추가탄 대미지 (기본의 0.4배)
        range: 300,
        pickupRange: 50,
    },

    enemies: [],
    projectiles: [],
    enemyProjectiles: [], // 적 발사체
    expOrbs: [],
    items: [], // 엘리트 몹 드롭 아이템
    killCount: 0,
    keys: {},
    lastAttackTime: 0,

    skills: [],
};

// Skill Definitions (Hades-style)
const SKILL_POOL = [
    {
        id: 'damage',
        name: '강력한 타격',
        description: '공격력이 20% 증가합니다',
        icon: '⚔️',
        rarity: 'common',
        apply: () => {
            game.player.damage *= 1.2;
            game.player.baseDamage *= 1.2;
        }
    },
    {
        id: 'attackSpeed',
        name: '신속한 공격',
        description: '공격 속도가 15% 증가합니다',
        icon: '⚡',
        rarity: 'common',
        apply: () => { game.player.attackCooldown *= 0.85; }
    },
    {
        id: 'maxHp',
        name: '생명력 증가',
        description: '최대 HP가 30 증가하고 HP가 회복됩니다',
        icon: '❤️',
        rarity: 'common',
        apply: () => {
            game.player.maxHp += 30;
            game.player.hp = Math.min(game.player.hp + 30, game.player.maxHp);
        }
    },
    {
        id: 'speed',
        name: '질주',
        description: '이동 속도가 20% 증가합니다',
        icon: '👟',
        rarity: 'common',
        apply: () => { game.player.speed *= 1.2; }
    },
    {
        id: 'projectileCount',
        name: '다중 발사',
        description: '발사체가 1개 추가됩니다',
        icon: '🔱',
        rarity: 'rare',
        apply: () => { game.player.projectileCount += 1; }
    },
    {
        id: 'range',
        name: '사거리 증가',
        description: '공격 사거리가 30% 증가합니다',
        icon: '🎯',
        rarity: 'rare',
        apply: () => { game.player.range *= 1.3; }
    },
    {
        id: 'pickupRange',
        name: '자석',
        description: '경험치 획득 범위가 50% 증가합니다',
        icon: '🧲',
        rarity: 'rare',
        apply: () => { game.player.pickupRange *= 1.5; }
    },
    {
        id: 'criticalStrike',
        name: '치명타',
        description: '공격력이 50% 증가합니다',
        icon: '💥',
        rarity: 'epic',
        apply: () => {
            game.player.damage *= 1.5;
            game.player.baseDamage *= 1.5;
        }
    },
    {
        id: 'rapidFire',
        name: '연사',
        description: '공격 속도가 40% 증가합니다',
        icon: '🔥',
        rarity: 'epic',
        apply: () => { game.player.attackCooldown *= 0.6; }
    },
    {
        id: 'vampiric',
        name: '흡혈',
        description: 'HP가 50 회복됩니다',
        icon: '🧛',
        rarity: 'legendary',
        apply: () => {
            game.player.hp = Math.min(game.player.hp + 50, game.player.maxHp);
        }
    },
];

// Initialize
function init() {
    game.canvas = document.getElementById('gameCanvas');
    game.ctx = game.canvas.getContext('2d');

    // Set canvas size
    game.canvas.width = CONFIG.CANVAS_WIDTH;
    game.canvas.height = CONFIG.CANVAS_HEIGHT;

    // Event listeners
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', restartGame);

    window.addEventListener('keydown', (e) => {
        game.keys[e.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (e) => {
        game.keys[e.key.toLowerCase()] = false;
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        game.canvas.width = window.innerWidth;
        game.canvas.height = window.innerHeight;
        CONFIG.CANVAS_WIDTH = window.innerWidth;
        CONFIG.CANVAS_HEIGHT = window.innerHeight;
    });
}

// Start Game
function startGame() {
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');

    resetGame();
    game.isRunning = true;
    game.isPaused = false;
    game.startTime = Date.now();
    game.pausedTime = 0;
    game.gameLoop = requestAnimationFrame(update);
}

// Reset Game
function resetGame() {
    game.player.x = CONFIG.CANVAS_WIDTH / 2;
    game.player.y = CONFIG.CANVAS_HEIGHT / 2;
    game.player.hp = 100;
    game.player.maxHp = 100;
    game.player.exp = 0;
    game.player.level = 1;
    game.player.expToNext = 100;
    game.player.speed = CONFIG.PLAYER_SPEED;
    game.player.damage = 10;
    game.player.baseDamage = 10;
    game.player.attackCooldown = CONFIG.BASE_ATTACK_COOLDOWN;
    game.player.projectileCount = 1;
    game.player.additionalProjectileCount = 0;
    game.player.additionalProjectileDamage = 0;
    game.player.range = 300;
    game.player.pickupRange = 50;

    game.enemies = [];
    game.projectiles = [];
    game.enemyProjectiles = [];
    game.expOrbs = [];
    game.items = [];
    game.killCount = 0;
    game.lastAttackTime = 0;
    game.skills = [];

    updateUI();
}

// Restart Game
function restartGame() {
    document.getElementById('gameOverModal').classList.add('hidden');
    startGame();
}

// Main Update Loop
function update() {
    if (!game.isRunning) return;

    // 게임이 일시정지되면 루프만 계속하고 업데이트는 스킵
    if (game.isPaused) {
        game.gameLoop = requestAnimationFrame(update);
        return;
    }

    game.currentTime = Date.now() - game.startTime - game.pausedTime;

    // Clear canvas
    game.ctx.fillStyle = '#1a1a2e';
    game.ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // Update
    updatePlayer();
    updateEnemies();
    updateProjectiles();
    updateEnemyProjectiles();
    updateExpOrbs();
    updateItems();
    spawnEnemies();
    autoAttack();
    enemyAutoAttack();
    checkCollisions();

    // Draw
    drawExpOrbs();
    drawItems();
    drawPlayer();
    drawEnemies();
    drawProjectiles();
    drawEnemyProjectiles();

    // Update UI
    updateUI();

    // Continue loop
    game.gameLoop = requestAnimationFrame(update);
}

// Update Player
function updatePlayer() {
    let dx = 0;
    let dy = 0;

    // WASD or Arrow keys
    if (game.keys['w'] || game.keys['arrowup']) dy -= 1;
    if (game.keys['s'] || game.keys['arrowdown']) dy += 1;
    if (game.keys['a'] || game.keys['arrowleft']) dx -= 1;
    if (game.keys['d'] || game.keys['arrowright']) dx += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
    }

    // Move player
    game.player.x += dx * game.player.speed;
    game.player.y += dy * game.player.speed;

    // Keep player in bounds
    game.player.x = Math.max(CONFIG.PLAYER_SIZE, Math.min(CONFIG.CANVAS_WIDTH - CONFIG.PLAYER_SIZE, game.player.x));
    game.player.y = Math.max(CONFIG.PLAYER_SIZE, Math.min(CONFIG.CANVAS_HEIGHT - CONFIG.PLAYER_SIZE, game.player.y));
}

// Draw Player
function drawPlayer() {
    game.ctx.fillStyle = '#4ecdc4';
    game.ctx.beginPath();
    game.ctx.arc(game.player.x, game.player.y, CONFIG.PLAYER_SIZE / 2, 0, Math.PI * 2);
    game.ctx.fill();

    // Draw outline
    game.ctx.strokeStyle = '#fff';
    game.ctx.lineWidth = 3;
    game.ctx.stroke();
}

// Spawn Enemies (개선된 버전 - 엘리트 몹 포함)
function spawnEnemies() {
    const timeInSeconds = game.currentTime / 1000;
    const difficultyMultiplier = 1 + (timeInSeconds / 120);

    // 스폰 확률 1.5배 증가 (0.008 → 0.012)
    const baseSpawnChance = 0.012;
    const spawnChance = baseSpawnChance * difficultyMultiplier;

    if (Math.random() < spawnChance) {
        const side = Math.floor(Math.random() * 4);
        let x, y;

        switch(side) {
            case 0: // Top
                x = Math.random() * CONFIG.CANVAS_WIDTH;
                y = -CONFIG.ENEMY_SIZE * 2;
                break;
            case 1: // Right
                x = CONFIG.CANVAS_WIDTH + CONFIG.ENEMY_SIZE * 2;
                y = Math.random() * CONFIG.CANVAS_HEIGHT;
                break;
            case 2: // Bottom
                x = Math.random() * CONFIG.CANVAS_WIDTH;
                y = CONFIG.CANVAS_HEIGHT + CONFIG.ENEMY_SIZE * 2;
                break;
            case 3: // Left
                x = -CONFIG.ENEMY_SIZE * 2;
                y = Math.random() * CONFIG.CANVAS_HEIGHT;
                break;
        }

        // 엘리트 몹 스폰 확률 결정
        const eliteChance = Math.min(0.2, timeInSeconds / 300); // 최대 20%, 5분에 도달
        const rand = Math.random();

        let enemyType = ENEMY_TYPES.NORMAL;
        if (rand < eliteChance) {
            // 엘리트 몹 타입 랜덤 선택
            const eliteTypes = [ENEMY_TYPES.FAST, ENEMY_TYPES.TANK, ENEMY_TYPES.SHOOTER];
            enemyType = eliteTypes[Math.floor(Math.random() * eliteTypes.length)];
        }

        createEnemy(x, y, enemyType, timeInSeconds);
    }
}

// Create Enemy (타입별 적 생성)
function createEnemy(x, y, type, timeInSeconds) {
    const hitsToKill = Math.max(1, Math.ceil(game.player.projectileCount / 2));
    const enemyBaseHP = game.player.damage * hitsToKill;
    const hpScaling = 1 + (timeInSeconds / 180);

    let enemy = {
        x,
        y,
        type,
        lastShootTime: 0,
    };

    switch(type) {
        case ENEMY_TYPES.NORMAL:
            enemy.hp = enemyBaseHP * hpScaling;
            enemy.maxHp = enemy.hp;
            enemy.speed = CONFIG.ENEMY_BASE_SPEED * (1 + timeInSeconds / 180);
            enemy.damage = 8 + (timeInSeconds / 20);
            enemy.size = CONFIG.ENEMY_SIZE;
            enemy.color = '#ff6b6b';
            enemy.strokeColor = '#c92a2a';
            enemy.expValue = 20;
            break;

        case ENEMY_TYPES.FAST:
            // 엘리트 1: 빠른 몹 (2배 속도, 플레이어 속도의 0.9배 이하)
            enemy.hp = enemyBaseHP * hpScaling * 0.7; // HP 약간 낮음
            enemy.maxHp = enemy.hp;
            enemy.speed = Math.min(CONFIG.ENEMY_BASE_SPEED * 2, game.player.speed * 0.9);
            enemy.damage = 10 + (timeInSeconds / 15);
            enemy.size = CONFIG.ENEMY_SIZE * 0.8;
            enemy.color = '#ffa500'; // 주황색
            enemy.strokeColor = '#ff8c00';
            enemy.expValue = 35;
            break;

        case ENEMY_TYPES.TANK:
            // 엘리트 2: 탱커 몹 (3배 크기, 2.5배 HP)
            enemy.hp = enemyBaseHP * hpScaling * 2.5;
            enemy.maxHp = enemy.hp;
            enemy.speed = CONFIG.ENEMY_BASE_SPEED * (0.9 + Math.random() * 0.2); // 0.9~1.1배
            enemy.damage = 15 + (timeInSeconds / 10);
            enemy.size = CONFIG.ENEMY_SIZE * 3;
            enemy.color = '#8b4513'; // 갈색
            enemy.strokeColor = '#654321';
            enemy.expValue = 100;
            break;

        case ENEMY_TYPES.SHOOTER:
            // 엘리트 3: 원거리 공격 몹
            enemy.hp = enemyBaseHP * hpScaling * 1.2;
            enemy.maxHp = enemy.hp;
            enemy.speed = CONFIG.ENEMY_BASE_SPEED * (0.4 + Math.random() * 0.2); // 0.4~0.6배
            enemy.damage = 5 + (timeInSeconds / 25);
            enemy.size = CONFIG.ENEMY_SIZE * 1.2;
            enemy.color = '#9370db'; // 보라색
            enemy.strokeColor = '#8a2be2';
            enemy.expValue = 50;
            enemy.shootCooldown = 2000; // 2초마다 발사
            enemy.projectileSpeed = CONFIG.ENEMY_BASE_SPEED * 1.5; // 기본 속도의 1.5배
            enemy.shootRange = 400;
            break;
    }

    game.enemies.push(enemy);
}

// Update Enemies (밀집도 개선 포함)
function updateEnemies() {
    game.enemies.forEach((enemy, index) => {
        // 플레이어 방향으로 이동
        const dx = game.player.x - enemy.x;
        const dy = game.player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let moveX = 0;
        let moveY = 0;

        if (distance > 0) {
            moveX = (dx / distance) * enemy.speed;
            moveY = (dy / distance) * enemy.speed;
        }

        // 적들 간 충돌 회피 (밀집도 제한)
        game.enemies.forEach((otherEnemy, otherIndex) => {
            if (index === otherIndex) return;

            const edx = enemy.x - otherEnemy.x;
            const edy = enemy.y - otherEnemy.y;
            const edist = Math.sqrt(edx * edx + edy * edy);

            const minDist = CONFIG.ENEMY_SEPARATION + (enemy.size + otherEnemy.size) / 2;

            if (edist < minDist && edist > 0) {
                // 서로 밀어내기
                const pushForce = (minDist - edist) / minDist * 0.5;
                moveX += (edx / edist) * pushForce * enemy.speed;
                moveY += (edy / edist) * pushForce * enemy.speed;
            }
        });

        // Shooter는 일정 거리 유지
        if (enemy.type === ENEMY_TYPES.SHOOTER && distance < 250) {
            moveX = -moveX * 0.5; // 플레이어에게서 멀어짐
            moveY = -moveY * 0.5;
        }

        enemy.x += moveX;
        enemy.y += moveY;

        // Remove if dead
        if (enemy.hp <= 0) {
            spawnExpOrb(enemy.x, enemy.y, enemy.expValue);

            // 엘리트 몹은 아이템 드롭
            if (enemy.type !== ENEMY_TYPES.NORMAL) {
                spawnItem(enemy.x, enemy.y);
            }

            game.enemies.splice(index, 1);
            game.killCount++;
        }
    });
}

// Draw Enemies (타입별 다른 색상)
function drawEnemies() {
    game.enemies.forEach(enemy => {
        game.ctx.fillStyle = enemy.color;
        game.ctx.beginPath();
        game.ctx.arc(enemy.x, enemy.y, enemy.size / 2, 0, Math.PI * 2);
        game.ctx.fill();

        game.ctx.strokeStyle = enemy.strokeColor;
        game.ctx.lineWidth = 2;
        game.ctx.stroke();

        // 탱커 몹은 HP 바 표시
        if (enemy.type === ENEMY_TYPES.TANK) {
            const barWidth = enemy.size;
            const barHeight = 6;
            const hpPercent = enemy.hp / enemy.maxHp;

            game.ctx.fillStyle = '#000';
            game.ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.size / 2 - 12, barWidth, barHeight);

            game.ctx.fillStyle = '#ff6b6b';
            game.ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.size / 2 - 12, barWidth * hpPercent, barHeight);
        }
    });
}

// Enemy Auto Attack (Shooter 몹 전용)
function enemyAutoAttack() {
    const now = Date.now();

    game.enemies.forEach(enemy => {
        if (enemy.type !== ENEMY_TYPES.SHOOTER) return;

        // 쿨다운 체크
        if (now - enemy.lastShootTime < enemy.shootCooldown) return;

        // 사거리 체크
        const dx = game.player.x - enemy.x;
        const dy = game.player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > enemy.shootRange) return;

        // 플레이어 방향으로 발사
        const angle = Math.atan2(dy, dx);

        game.enemyProjectiles.push({
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(angle) * enemy.projectileSpeed,
            vy: Math.sin(angle) * enemy.projectileSpeed,
            damage: enemy.damage,
            size: 6,
        });

        enemy.lastShootTime = now;
    });
}

// Update Enemy Projectiles
function updateEnemyProjectiles() {
    game.enemyProjectiles.forEach((proj, index) => {
        proj.x += proj.vx;
        proj.y += proj.vy;

        // Remove if out of bounds
        if (proj.x < 0 || proj.x > CONFIG.CANVAS_WIDTH ||
            proj.y < 0 || proj.y > CONFIG.CANVAS_HEIGHT) {
            game.enemyProjectiles.splice(index, 1);
        }
    });
}

// Draw Enemy Projectiles
function drawEnemyProjectiles() {
    game.enemyProjectiles.forEach(proj => {
        game.ctx.fillStyle = '#9370db';
        game.ctx.beginPath();
        game.ctx.arc(proj.x, proj.y, proj.size, 0, Math.PI * 2);
        game.ctx.fill();

        game.ctx.strokeStyle = '#8a2be2';
        game.ctx.lineWidth = 2;
        game.ctx.stroke();
    });
}

// Auto Attack
function autoAttack() {
    const now = Date.now();
    if (now - game.lastAttackTime < game.player.attackCooldown) return;

    // Find nearest enemy
    let nearestEnemy = null;
    let nearestDistance = game.player.range;

    game.enemies.forEach(enemy => {
        const dx = enemy.x - game.player.x;
        const dy = enemy.y - game.player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestEnemy = enemy;
        }
    });

    // Shoot projectiles
    if (nearestEnemy) {
        const angle = Math.atan2(nearestEnemy.y - game.player.y, nearestEnemy.x - game.player.x);

        // 기본 발사체
        for (let i = 0; i < game.player.projectileCount; i++) {
            const spread = (i - (game.player.projectileCount - 1) / 2) * 0.2;

            game.projectiles.push({
                x: game.player.x,
                y: game.player.y,
                vx: Math.cos(angle + spread) * CONFIG.PROJECTILE_SPEED,
                vy: Math.sin(angle + spread) * CONFIG.PROJECTILE_SPEED,
                damage: game.player.damage,
                isAdditional: false,
            });
        }

        // 추가 발사체 (엘리트 아이템으로 획득)
        if (game.player.additionalProjectileCount > 0) {
            for (let i = 0; i < game.player.additionalProjectileCount; i++) {
                const additionalSpread = (i - (game.player.additionalProjectileCount - 1) / 2) * 0.3 + 0.5;

                game.projectiles.push({
                    x: game.player.x,
                    y: game.player.y,
                    vx: Math.cos(angle + additionalSpread) * CONFIG.PROJECTILE_SPEED,
                    vy: Math.sin(angle + additionalSpread) * CONFIG.PROJECTILE_SPEED,
                    damage: game.player.additionalProjectileDamage,
                    isAdditional: true,
                });
            }
        }

        game.lastAttackTime = now;
    }
}

// Update Projectiles
function updateProjectiles() {
    game.projectiles.forEach((proj, index) => {
        proj.x += proj.vx;
        proj.y += proj.vy;

        // Remove if out of bounds
        if (proj.x < 0 || proj.x > CONFIG.CANVAS_WIDTH ||
            proj.y < 0 || proj.y > CONFIG.CANVAS_HEIGHT) {
            game.projectiles.splice(index, 1);
        }
    });
}

// Draw Projectiles
function drawProjectiles() {
    game.projectiles.forEach(proj => {
        // 추가탄은 다른 색상
        if (proj.isAdditional) {
            game.ctx.fillStyle = '#ff00ff'; // 마젠타
            game.ctx.strokeStyle = '#ff69b4'; // 핑크
        } else {
            game.ctx.fillStyle = '#ffd700'; // 금색
            game.ctx.strokeStyle = '#ffed4e'; // 밝은 금색
        }

        const size = proj.isAdditional ? CONFIG.PROJECTILE_SIZE * 0.7 : CONFIG.PROJECTILE_SIZE;

        game.ctx.beginPath();
        game.ctx.arc(proj.x, proj.y, size, 0, Math.PI * 2);
        game.ctx.fill();

        game.ctx.lineWidth = 2;
        game.ctx.stroke();
    });
}

// Spawn Exp Orb
function spawnExpOrb(x, y, value = 20) {
    game.expOrbs.push({ x, y, value });
}

// Update Exp Orbs
function updateExpOrbs() {
    game.expOrbs.forEach((orb, index) => {
        // Check if player is in pickup range
        const dx = game.player.x - orb.x;
        const dy = game.player.y - orb.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < game.player.pickupRange) {
            game.player.exp += orb.value;
            game.expOrbs.splice(index, 1);

            // Level up check
            if (game.player.exp >= game.player.expToNext) {
                levelUp();
            }
        }
    });
}

// Draw Exp Orbs
function drawExpOrbs() {
    game.expOrbs.forEach(orb => {
        const size = orb.value > 30 ? 8 : 6; // 엘리트 경험치는 더 크게

        game.ctx.fillStyle = orb.value > 30 ? '#ffd700' : '#4ecdc4';
        game.ctx.beginPath();
        game.ctx.arc(orb.x, orb.y, size, 0, Math.PI * 2);
        game.ctx.fill();

        game.ctx.strokeStyle = orb.value > 30 ? '#ffed4e' : '#44a08d';
        game.ctx.lineWidth = 2;
        game.ctx.stroke();
    });
}

// Spawn Item (엘리트 몹 드롭)
function spawnItem(x, y) {
    game.items.push({
        x,
        y,
        type: 'projectile_boost' // 추가탄 아이템
    });
}

// Update Items
function updateItems() {
    game.items.forEach((item, index) => {
        // Check if player is in pickup range
        const dx = game.player.x - item.x;
        const dy = game.player.y - item.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < game.player.pickupRange) {
            pickupItem(item);
            game.items.splice(index, 1);
        }
    });
}

// Pickup Item
function pickupItem(item) {
    if (item.type === 'projectile_boost') {
        // 추가탄 시스템
        if (game.player.additionalProjectileCount === 0) {
            // 첫 추가탄: 기본 대미지의 0.4배
            game.player.additionalProjectileCount = 1;
            game.player.additionalProjectileDamage = game.player.baseDamage * 0.4;
        } else if (game.player.additionalProjectileCount < 4) {
            // 추가탄 대미지를 2배로 증가 시도
            const newDamage = game.player.additionalProjectileDamage * 2;
            const maxDamage = game.player.baseDamage * 0.8;

            if (newDamage <= maxDamage) {
                // 제한 내면 대미지 2배
                game.player.additionalProjectileDamage = newDamage;
            } else {
                // 제한 초과하면 추가탄 개수 증가 (최대 4개)
                if (game.player.additionalProjectileCount < 4) {
                    game.player.additionalProjectileCount++;
                    // 대미지는 기본 0.4배로 리셋
                    game.player.additionalProjectileDamage = game.player.baseDamage * 0.4;
                }
            }
        }
        // 최대 4개 도달 시 아이템 효과 없음 (그냥 사라짐)
    }
}

// Draw Items
function drawItems() {
    game.items.forEach(item => {
        // 별 모양으로 표시
        const size = 10;
        game.ctx.fillStyle = '#ff00ff'; // 마젠타색
        game.ctx.strokeStyle = '#fff';
        game.ctx.lineWidth = 2;

        // 별 그리기
        game.ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const x = item.x + Math.cos(angle) * size;
            const y = item.y + Math.sin(angle) * size;
            if (i === 0) {
                game.ctx.moveTo(x, y);
            } else {
                game.ctx.lineTo(x, y);
            }
        }
        game.ctx.closePath();
        game.ctx.fill();
        game.ctx.stroke();

        // 반짝임 효과
        game.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        game.ctx.beginPath();
        game.ctx.arc(item.x, item.y, size * 0.4, 0, Math.PI * 2);
        game.ctx.fill();
    });
}

// Level Up
function levelUp() {
    game.player.level++;
    game.player.exp = game.player.exp - game.player.expToNext;
    game.player.expToNext = Math.floor(game.player.expToNext * CONFIG.EXP_SCALE);

    // 게임 일시정지
    const pauseStartTime = Date.now();
    game.isPaused = true;

    // 스킬 선택 완료 시 호출될 콜백
    showSkillChoices(() => {
        game.isPaused = false;
        game.pausedTime += Date.now() - pauseStartTime;
    });
}

// Show Skill Choices (개선된 버전 - 콜백 추가)
function showSkillChoices(onComplete) {
    const modal = document.getElementById('levelUpModal');
    const choicesContainer = document.getElementById('skillChoices');
    choicesContainer.innerHTML = '';

    // Get 3 random skills
    const availableSkills = [...SKILL_POOL];
    const choices = [];

    for (let i = 0; i < 3; i++) {
        if (availableSkills.length === 0) break;
        const randomIndex = Math.floor(Math.random() * availableSkills.length);
        choices.push(availableSkills[randomIndex]);
        availableSkills.splice(randomIndex, 1);
    }

    // Create skill cards
    choices.forEach(skill => {
        const card = document.createElement('div');
        card.className = `skill-card ${skill.rarity}`;
        card.innerHTML = `
            <div class="skill-rarity ${skill.rarity}">${skill.rarity}</div>
            <div class="skill-icon">${skill.icon}</div>
            <div class="skill-name">${skill.name}</div>
            <div class="skill-description">${skill.description}</div>
        `;

        card.addEventListener('click', () => {
            selectSkill(skill);
            modal.classList.add('hidden');
            if (onComplete) onComplete();
        });

        choicesContainer.appendChild(card);
    });

    modal.classList.remove('hidden');
}

// Select Skill
function selectSkill(skill) {
    skill.apply();
    game.skills.push(skill);
}

// Check Collisions
function checkCollisions() {
    // Player Projectile vs Enemy
    game.projectiles.forEach((proj, pIndex) => {
        game.enemies.forEach((enemy) => {
            const dx = proj.x - enemy.x;
            const dy = proj.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < enemy.size / 2 + CONFIG.PROJECTILE_SIZE) {
                enemy.hp -= proj.damage;
                game.projectiles.splice(pIndex, 1);
            }
        });
    });

    // Enemy Projectile vs Player
    game.enemyProjectiles.forEach((proj, pIndex) => {
        const dx = proj.x - game.player.x;
        const dy = proj.y - game.player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < CONFIG.PLAYER_SIZE / 2 + proj.size) {
            game.player.hp -= proj.damage;
            game.enemyProjectiles.splice(pIndex, 1);

            if (game.player.hp <= 0) {
                gameOver();
            }
        }
    });

    // Player vs Enemy
    game.enemies.forEach(enemy => {
        const dx = game.player.x - enemy.x;
        const dy = game.player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < CONFIG.PLAYER_SIZE / 2 + enemy.size / 2) {
            game.player.hp -= enemy.damage * 0.016; // 60fps에서 초당 데미지

            if (game.player.hp <= 0) {
                gameOver();
            }
        }
    });
}

// Game Over
function gameOver() {
    game.isRunning = false;
    cancelAnimationFrame(game.gameLoop);

    // Show game over screen
    document.getElementById('finalTime').textContent = formatTime(game.currentTime / 1000);
    document.getElementById('finalLevel').textContent = game.player.level;
    document.getElementById('finalKills').textContent = game.killCount;
    document.getElementById('gameOverModal').classList.remove('hidden');
}

// Update UI
function updateUI() {
    document.getElementById('playerLevel').textContent = game.player.level;
    document.getElementById('gameTime').textContent = formatTime(game.currentTime / 1000);
    document.getElementById('killCount').textContent = game.killCount;

    const hpPercent = (game.player.hp / game.player.maxHp) * 100;
    document.getElementById('hpFill').style.width = hpPercent + '%';
    document.getElementById('hpText').textContent = `${Math.ceil(game.player.hp)}/${game.player.maxHp}`;

    const expPercent = (game.player.exp / game.player.expToNext) * 100;
    document.getElementById('expFill').style.width = expPercent + '%';
    document.getElementById('expText').textContent = `${game.player.exp}/${game.player.expToNext}`;
}

// Format Time
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Start when page loads
window.addEventListener('load', init);
