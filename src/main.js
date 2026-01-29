const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const toggleButton = document.getElementById('toggle');
const energyLabel = document.getElementById('energy');

const state = {
  energy: 'low',
  t: 0,
};

const palettes = {
  low: {
    background: '#0b1f2a',
    glow: '#2bbbad',
    orb: '#e0f7fa',
  },
  high: {
    background: '#2d0922',
    glow: '#ff4d6d',
    orb: '#ffe66d',
  },
};

const resize = () => {
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = Math.round(width * window.devicePixelRatio);
  canvas.height = Math.round(height * window.devicePixelRatio);
  ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
};

const draw = () => {
  const { background, glow, orb } = palettes[state.energy];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  const centerX = canvas.clientWidth / 2;
  const centerY = canvas.clientHeight / 2;
  const orbitRadius = 120 + Math.sin(state.t / 30) * 15;
  const orbX = centerX + Math.cos(state.t / 45) * orbitRadius;
  const orbY = centerY + Math.sin(state.t / 45) * orbitRadius;

  ctx.beginPath();
  ctx.arc(centerX, centerY, 180, 0, Math.PI * 2);
  ctx.strokeStyle = glow;
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 8]);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(orbX, orbY, 28, 0, Math.PI * 2);
  ctx.fillStyle = orb;
  ctx.shadowColor = glow;
  ctx.shadowBlur = 20;
  ctx.fill();

  ctx.restore();
  state.t += 1;
  requestAnimationFrame(draw);
};

const setEnergy = (energy) => {
  state.energy = energy;
  energyLabel.textContent = `Energy: ${energy}`;
};

toggleButton.addEventListener('click', () => {
  setEnergy(state.energy === 'low' ? 'high' : 'low');
});

window.addEventListener('resize', resize);
resize();
requestAnimationFrame(draw);
