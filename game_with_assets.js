// 🎨 에셋을 사용하는 버전의 게임 (참고용)
// 이 파일을 사용하려면: game.html에서 <script src="game_with_assets.js"></script>로 변경

// ===== 이미지 로딩 =====
const IMAGES = {
    player: new Image(),
    enemy: new Image(),
    projectile: new Image(),
    expOrb: new Image(),
};

// 에셋 경로 설정 (assets 폴더에 이미지 넣으면 자동 로딩)
IMAGES.player.src = 'assets/player.png';
IMAGES.enemy.src = 'assets/enemy.png';
IMAGES.projectile.src = 'assets/projectile.png';
IMAGES.expOrb.src = 'assets/exp_orb.png';

// 이미지 로딩 상태 확인
let imagesLoaded = 0;
const totalImages = Object.keys(IMAGES).length;

Object.values(IMAGES).forEach(img => {
    img.onload = () => {
        imagesLoaded++;
        console.log(`에셋 로딩: ${imagesLoaded}/${totalImages}`);
    };
    img.onerror = () => {
        console.log('에셋 로드 실패 (기본 도형 사용):', img.src);
    };
});

// 이미지 사용 가능 여부 체크 헬퍼 함수
function isImageReady(img) {
    return img.complete && img.naturalHeight !== 0;
}

// ===== 게임 코드에 적용하는 예시 =====

// 플레이어 그리기 (에셋 버전)
function drawPlayerWithAsset() {
    if (isImageReady(IMAGES.player)) {
        // 이미지 그리기
        game.ctx.drawImage(
            IMAGES.player,
            game.player.x - CONFIG.PLAYER_SIZE / 2,
            game.player.y - CONFIG.PLAYER_SIZE / 2,
            CONFIG.PLAYER_SIZE,
            CONFIG.PLAYER_SIZE
        );
    } else {
        // 폴백: 기본 도형
        game.ctx.fillStyle = '#4ecdc4';
        game.ctx.beginPath();
        game.ctx.arc(game.player.x, game.player.y, CONFIG.PLAYER_SIZE / 2, 0, Math.PI * 2);
        game.ctx.fill();
        game.ctx.strokeStyle = '#fff';
        game.ctx.lineWidth = 3;
        game.ctx.stroke();
    }
}

// 적 그리기 (에셋 버전)
function drawEnemiesWithAsset() {
    game.enemies.forEach(enemy => {
        if (isImageReady(IMAGES.enemy)) {
            game.ctx.drawImage(
                IMAGES.enemy,
                enemy.x - enemy.size / 2,
                enemy.y - enemy.size / 2,
                enemy.size,
                enemy.size
            );
        } else {
            // 폴백: 기본 도형
            game.ctx.fillStyle = '#ff6b6b';
            game.ctx.beginPath();
            game.ctx.arc(enemy.x, enemy.y, enemy.size / 2, 0, Math.PI * 2);
            game.ctx.fill();
            game.ctx.strokeStyle = '#c92a2a';
            game.ctx.lineWidth = 2;
            game.ctx.stroke();
        }
    });
}

// 발사체 그리기 (에셋 버전)
function drawProjectilesWithAsset() {
    game.projectiles.forEach(proj => {
        if (isImageReady(IMAGES.projectile)) {
            game.ctx.drawImage(
                IMAGES.projectile,
                proj.x - CONFIG.PROJECTILE_SIZE,
                proj.y - CONFIG.PROJECTILE_SIZE,
                CONFIG.PROJECTILE_SIZE * 2,
                CONFIG.PROJECTILE_SIZE * 2
            );
        } else {
            // 폴백: 기본 도형
            game.ctx.fillStyle = '#ffd700';
            game.ctx.beginPath();
            game.ctx.arc(proj.x, proj.y, CONFIG.PROJECTILE_SIZE, 0, Math.PI * 2);
            game.ctx.fill();
            game.ctx.strokeStyle = '#ffed4e';
            game.ctx.lineWidth = 2;
            game.ctx.stroke();
        }
    });
}

// 경험치 구슬 그리기 (에셋 버전)
function drawExpOrbsWithAsset() {
    game.expOrbs.forEach(orb => {
        if (isImageReady(IMAGES.expOrb)) {
            game.ctx.drawImage(
                IMAGES.expOrb,
                orb.x - 8,
                orb.y - 8,
                16,
                16
            );
        } else {
            // 폴백: 기본 도형
            game.ctx.fillStyle = '#4ecdc4';
            game.ctx.beginPath();
            game.ctx.arc(orb.x, orb.y, 6, 0, Math.PI * 2);
            game.ctx.fill();
            game.ctx.strokeStyle = '#44a08d';
            game.ctx.lineWidth = 2;
            game.ctx.stroke();
        }
    });
}

// ===== 사용법 =====
// 1. 프로젝트에 assets 폴더 생성
// 2. assets 폴더에 이미지 추가 (player.png, enemy.png, projectile.png, exp_orb.png)
// 3. game.js의 draw 함수들을 위의 함수로 교체
// 4. 또는 game.html에서 이 파일을 사용하도록 변경

console.log('✅ 에셋 시스템 준비 완료! assets 폴더에 이미지를 추가하세요.');
