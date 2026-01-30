const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const energyFill = document.getElementById('energy-fill');
const energyValue = document.getElementById('energy-value');
const stateValue = document.getElementById('state-value');
const scoreValue = document.getElementById('score-value');
const statusValue = document.getElementById('status-value');

const keys = new Set();
const presses = new Set();

const audioManager = (() => {
  const trackUrls = {
    low: 'assets/audio/low_energy/Fever Dreams_lower energy.mp3',
    high: 'assets/audio/high_energy/Fever Dreams_higher energy.mp3',
  };
  const crossfadeSeconds = 1.4;
  const state = {
    context: null,
    buffers: null,
    gains: null,
    sources: null,
    isReady: false,
    isPlaying: false,
    targetState: 'low',
  };

  const createSource = (buffer) => {
    const source = state.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  };

  const initAudio = async () => {
    if (state.isReady) return;
    state.context = new AudioContext();
    const [lowBuffer, highBuffer] = await Promise.all(
      Object.values(trackUrls).map(async (url) => {
        const response = await fetch(encodeURI(url));
        if (!response.ok) {
          throw new Error(`Failed to load audio track: ${url}`);
        }
        const data = await response.arrayBuffer();
        return state.context.decodeAudioData(data);
      }),
    );

    state.buffers = { low: lowBuffer, high: highBuffer };
    state.gains = {
      low: state.context.createGain(),
      high: state.context.createGain(),
    };
    state.sources = {
      low: createSource(lowBuffer),
      high: createSource(highBuffer),
    };

    state.gains.low.gain.value = 1;
    state.gains.high.gain.value = 0;

    state.sources.low.connect(state.gains.low).connect(state.context.destination);
    state.sources.high.connect(state.gains.high).connect(state.context.destination);

    const startTime = state.context.currentTime + 0.05;
    state.sources.low.start(startTime);
    state.sources.high.start(startTime);

    state.isReady = true;
    state.isPlaying = true;
  };

  const start = async () => {
    if (state.isPlaying) {
      if (state.context?.state === 'suspended') {
        await state.context.resume();
      }
      return;
    }
    await initAudio();
    if (state.context.state === 'suspended') {
      await state.context.resume();
    }
    crossfadeTo(state.targetState);
  };

  const crossfadeTo = (energy) => {
    state.targetState = energy;
    if (!state.isReady) return;
    const now = state.context.currentTime;
    const fadeIn = state.gains[energy];
    const fadeOut = state.gains[energy === 'low' ? 'high' : 'low'];

    fadeIn.gain.cancelScheduledValues(now);
    fadeOut.gain.cancelScheduledValues(now);
    fadeIn.gain.setValueAtTime(fadeIn.gain.value, now);
    fadeOut.gain.setValueAtTime(fadeOut.gain.value, now);
    fadeIn.gain.linearRampToValueAtTime(1, now + crossfadeSeconds);
    fadeOut.gain.linearRampToValueAtTime(0, now + crossfadeSeconds);
  };

  return { start, crossfadeTo };
})();

const palettes = {
  low: {
    background: '#0b1f2a',
    glow: '#2bbbad',
    orb: '#e0f7fa',
    platform: '#133141',
    hazard: '#2b4a5a',
  },
  high: {
    background: '#2d0922',
    glow: '#ff4d6d',
    orb: '#ffe66d',
    platform: '#4b1632',
    hazard: '#6b1f3f',
  },
};

const layouts = {
  low: {
    platforms: [
      { x: 80, y: 280, w: 200, h: 16 },
      { x: 360, y: 220, w: 160, h: 16 },
      { x: 580, y: 300, w: 160, h: 16 },
    ],
    hazards: [{ x: 300, y: 368, w: 120, h: 18 }],
    orbs: [
      { x: 180, y: 240, r: 12 },
      { x: 440, y: 180, r: 12 },
      { x: 640, y: 260, r: 12 },
    ],
  },
  high: {
    platforms: [
      { x: 120, y: 250, w: 170, h: 16 },
      { x: 330, y: 190, w: 140, h: 16 },
      { x: 520, y: 260, w: 200, h: 16 },
    ],
    hazards: [
      { x: 160, y: 368, w: 100, h: 18 },
      { x: 470, y: 368, w: 130, h: 18 },
    ],
    orbs: [
      { x: 210, y: 210, r: 12 },
      { x: 400, y: 150, r: 12 },
      { x: 610, y: 220, r: 12 },
    ],
  },
};

const game = {
  energyState: 'low',
  energy: 100,
  maxEnergy: 100,
  score: 0,
  combo: 1,
  shiftTimer: 0,
  shiftInterval: 12,
  isGameOver: false,
  failReason: '',
  player: {
    x: 120,
    y: 120,
    prevY: 120,
    w: 32,
    h: 46,
    vx: 0,
    vy: 0,
    speed: 220,
    jump: 520,
    dashSpeed: 600,
    dashDuration: 0.18,
    dashTime: 0,
    dashCooldown: 0,
    dashDir: 1,
    facing: 1,
    onGround: false,
  },
  enemies: [
    { x: 240, y: 355, r: 14, vx: 80, range: [180, 300] },
    { x: 540, y: 335, r: 16, vx: -90, range: [520, 680] },
  ],
  orbs: [],
};

const resize = () => {
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = Math.round(width * window.devicePixelRatio);
  canvas.height = Math.round(height * window.devicePixelRatio);
  ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
};

const setEnergyState = (energy) => {
  game.energyState = energy;
  stateValue.textContent = energy === 'low' ? 'Low energy' : 'High energy';
  game.shiftTimer = 0;
  game.orbs = layouts[energy].orbs.map((orb) => ({ ...orb, collected: false }));
  audioManager.crossfadeTo(energy);
};

window.setEnergyState = setEnergyState;

const resetGame = () => {
  game.energy = game.maxEnergy;
  game.score = 0;
  game.combo = 1;
  game.shiftTimer = 0;
  game.isGameOver = false;
  game.failReason = '';
  game.player.x = 120;
  game.player.y = 120;
  game.player.vx = 0;
  game.player.vy = 0;
  game.player.dashTime = 0;
  game.player.dashCooldown = 0;
  setEnergyState('low');
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const rectsOverlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const circleRectCollision = (circle, rect) => {
  const closestX = clamp(circle.x, rect.x, rect.x + rect.w);
  const closestY = clamp(circle.y, rect.y, rect.y + rect.h);
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy <= circle.r * circle.r;
};

const consumePress = (code) => {
  if (presses.has(code)) {
    presses.delete(code);
    return true;
  }
  return false;
};

const updateEnergyMeter = () => {
  const percent = clamp(game.energy / game.maxEnergy, 0, 1);
  energyFill.style.width = `${Math.round(percent * 100)}%`;
  energyValue.textContent = `${Math.round(game.energy)}%`;
};

const updateScore = () => {
  scoreValue.textContent = Math.floor(game.score).toString();
};

const updateStatus = () => {
  statusValue.textContent = game.isGameOver
    ? `Run failed: ${game.failReason} — press R to retry.`
    : `Shift in ${Math.ceil(game.shiftInterval - game.shiftTimer)}s`;
};

const updatePlayer = (dt) => {
  const player = game.player;
  const moveRight = keys.has('ArrowRight') || keys.has('KeyD');
  const moveLeft = keys.has('ArrowLeft') || keys.has('KeyA');
  const inputX = (moveRight ? 1 : 0) - (moveLeft ? 1 : 0);

  const gravity = game.energyState === 'high' ? 1700 : 1050;
  const moveSpeed = game.energyState === 'high' ? player.speed * 1.1 : player.speed;

  player.prevY = player.y;
  const wasOnGround = player.onGround;
  player.onGround = false;

  if (player.dashTime > 0) {
    player.dashTime -= dt;
    player.vx = player.dashDir * player.dashSpeed;
    player.vy = 0;
  } else {
    player.vx = inputX * moveSpeed;
    player.vy += gravity * dt;
  }

  if (consumePress('Space') && wasOnGround && player.dashTime <= 0) {
    player.vy = -player.jump;
  }

  if (consumePress('ShiftLeft') || consumePress('ShiftRight')) {
    const canDash = game.energy >= 18 && player.dashCooldown <= 0;
    if (canDash) {
      player.dashTime = player.dashDuration;
      player.dashCooldown = 0.4;
      player.dashDir = inputX !== 0 ? Math.sign(inputX) : player.facing;
      game.energy = clamp(game.energy - 18, 0, game.maxEnergy);
    }
  }

  if (inputX !== 0) {
    player.facing = Math.sign(inputX);
  }

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  player.x = clamp(player.x, 8, canvas.clientWidth - player.w - 8);

  const ground = { x: 0, y: canvas.clientHeight - 40, w: canvas.clientWidth, h: 40 };
  const platformRects = [ground, ...layouts[game.energyState].platforms];

  for (const platform of platformRects) {
    const landed =
      player.prevY + player.h <= platform.y &&
      player.y + player.h >= platform.y &&
      player.x + player.w > platform.x &&
      player.x < platform.x + platform.w &&
      player.vy >= 0;

    if (landed) {
      player.y = platform.y - player.h;
      player.vy = 0;
      player.onGround = true;
    }
  }

  if (player.dashCooldown > 0) {
    player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  }

  const moving = Math.abs(inputX) > 0.1 && player.dashTime <= 0;
  const regenRate = game.energyState === 'high' ? 4 : 7;
  const drainRate = game.energyState === 'high' ? 7 : 5;

  if (moving) {
    game.energy = clamp(game.energy - drainRate * dt, 0, game.maxEnergy);
  } else if (!game.isGameOver && player.dashTime <= 0) {
    game.energy = clamp(game.energy + regenRate * dt, 0, game.maxEnergy);
  }

  if (player.y > canvas.clientHeight + 80) {
    triggerFail('lost in the drift');
  }
};

const updateEnemies = (dt) => {
  const speedMultiplier = game.energyState === 'high' ? 1.6 : 1;
  game.enemies.forEach((enemy) => {
    enemy.x += enemy.vx * speedMultiplier * dt;
    if (enemy.x < enemy.range[0] || enemy.x > enemy.range[1]) {
      enemy.vx *= -1;
    }
  });
};

const updateOrbs = () => {
  const playerRect = {
    x: game.player.x,
    y: game.player.y,
    w: game.player.w,
    h: game.player.h,
  };

  game.orbs.forEach((orb) => {
    if (!orb.collected && circleRectCollision(orb, playerRect)) {
      orb.collected = true;
      game.energy = clamp(game.energy + 20, 0, game.maxEnergy);
      game.score += 120;
    }
  });
};

const checkHazards = () => {
  const playerRect = {
    x: game.player.x,
    y: game.player.y,
    w: game.player.w,
    h: game.player.h,
  };

  const hazards = layouts[game.energyState].hazards;
  for (const hazard of hazards) {
    if (rectsOverlap(playerRect, hazard)) {
      triggerFail('collided with a rift');
    }
  }

  for (const enemy of game.enemies) {
    if (circleRectCollision(enemy, playerRect)) {
      triggerFail('caught by a wraith');
    }
  }

  if (game.energy <= 0) {
    triggerFail('lucidity drained');
  }
};

const triggerFail = (reason) => {
  if (!game.isGameOver) {
    game.isGameOver = true;
    game.failReason = reason;
  }
};

const updateShift = (dt) => {
  game.shiftTimer += dt;
  if (game.shiftTimer >= game.shiftInterval) {
    const nextState = game.energyState === 'low' ? 'high' : 'low';
    setEnergyState(nextState);
  }
};

const update = (dt) => {
  if (game.isGameOver) {
    if (consumePress('KeyR')) {
      resetGame();
    }
    updateStatus();
    return;
  }

  updateShift(dt);
  updatePlayer(dt);
  updateEnemies(dt);
  updateOrbs();
  checkHazards();

  const scoreRate = game.energyState === 'high' ? 18 : 12;
  game.score += scoreRate * dt;

  updateEnergyMeter();
  updateScore();
  updateStatus();
};

const drawBackground = () => {
  const { background } = palettes[game.energyState];
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  const glow = palettes[game.energyState].glow;
  ctx.fillStyle = `${glow}22`;
  ctx.fillRect(0, canvas.clientHeight - 40, canvas.clientWidth, 40);
};

const drawPlatforms = () => {
  const { platform } = palettes[game.energyState];
  ctx.fillStyle = platform;
  layouts[game.energyState].platforms.forEach((platform) => {
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
  });
  ctx.fillRect(0, canvas.clientHeight - 40, canvas.clientWidth, 40);
};

const drawHazards = () => {
  const { hazard } = palettes[game.energyState];
  ctx.fillStyle = hazard;
  layouts[game.energyState].hazards.forEach((hazardRect) => {
    ctx.fillRect(hazardRect.x, hazardRect.y, hazardRect.w, hazardRect.h);
  });
};

const drawOrbs = () => {
  const { orb, glow } = palettes[game.energyState];
  game.orbs.forEach((orbData) => {
    if (orbData.collected) return;
    ctx.beginPath();
    ctx.arc(orbData.x, orbData.y, orbData.r, 0, Math.PI * 2);
    ctx.fillStyle = orb;
    ctx.shadowColor = glow;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
  });
};

const drawEnemies = () => {
  const { glow } = palettes[game.energyState];
  game.enemies.forEach((enemy) => {
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.r, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff55';
    ctx.stroke();
  });
};

const drawPlayer = () => {
  const { orb } = palettes[game.energyState];
  const player = game.player;
  ctx.fillStyle = orb;
  ctx.fillRect(player.x, player.y, player.w, player.h);

  if (player.dashTime > 0) {
    ctx.strokeStyle = palettes[game.energyState].glow;
    ctx.lineWidth = 3;
    ctx.strokeRect(player.x - 4, player.y - 4, player.w + 8, player.h + 8);
  }
};

const drawOverlay = () => {
  if (!game.isGameOver) return;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  ctx.fillStyle = '#f8f6f1';
  ctx.font = '600 26px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Run failed', canvas.clientWidth / 2, canvas.clientHeight / 2 - 10);
  ctx.font = '16px Inter, sans-serif';
  ctx.fillText('Press R to restart', canvas.clientWidth / 2, canvas.clientHeight / 2 + 20);
};

const draw = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  drawBackground();
  drawPlatforms();
  drawHazards();
  drawOrbs();
  drawEnemies();
  drawPlayer();
  drawOverlay();
  ctx.restore();
};

let lastTime = performance.now();
const loop = (now) => {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
};

window.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  audioManager.start().catch((error) => {
    console.warn('Audio playback unavailable:', error);
  });
  keys.add(event.code);
  presses.add(event.code);
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.code);
});

window.addEventListener(
  'pointerdown',
  () => {
    audioManager.start().catch((error) => {
      console.warn('Audio playback unavailable:', error);
    });
  },
  { once: true },
);

window.addEventListener('resize', resize);
resize();
resetGame();
updateEnergyMeter();
updateScore();
updateStatus();
requestAnimationFrame(loop);
