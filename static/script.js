/**
 * Flappy Bird: Premium Edition Engine
 * Architected using pure HTML5 Canvas Vector Generation
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI DOM Elements
const scoreBadge = document.getElementById('score-badge');
const currentScoreElement = document.getElementById('current-score');
const startMenu = document.getElementById('start-menu');
const gameOverMenu = document.getElementById('game-over-menu');
const menuHighScoreElement = document.getElementById('menu-high-score');
const finalScoreElement = document.getElementById('final-score');
const bestScoreElement = document.getElementById('best-score');
const newHighBadge = document.getElementById('new-high-badge');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// System Context Configurations
let gameState = 'MENU'; // Possible: 'MENU', 'PLAYING', 'GAMEOVER'
let score = 0;
let highScore = 0;
let animationFrameId = null;

// Hardware Scaling Multipliers
let scaleX = 1;
let scaleY = 1;

// Physics Parameters
const physics = {
    gravity: 0.28,
    jumpStrength: -6.2,
    maxFallSpeed: 9.0,
    pipeSpeed: 2.5,
    pipeSpawnInterval: 100, // Frames between pipe generations
    gapHeight: 160 // Opening space for bird
};

// Vector Assets Configurations
const bird = {
    x: 90,
    y: 300,
    radius: 16,
    velocity: 0,
    targetRotation: 0,
    currentRotation: 0,
    wingWave: 0,
    
    reset() {
        this.y = 300;
        this.velocity = 0;
        this.targetRotation = 0;
        this.currentRotation = 0;
    },
    
    jump() {
        this.velocity = physics.jumpStrength;
        this.targetRotation = -0.4; // Tilt upward
    },
    
    update() {
        this.velocity += physics.gravity;
        if (this.velocity > physics.maxFallSpeed) {
            this.velocity = physics.maxFallSpeed;
        }
        this.y += this.velocity;
        
        // Dynamically compute rotation based on kinematics
        if (this.velocity > 3) {
            this.targetRotation = Math.min(Math.PI / 3, this.targetRotation + 0.05);
        } else if (this.velocity < 0) {
            this.targetRotation = Math.max(-0.4, this.targetRotation - 0.02);
        }
        
        // Linear Interpolation for buttery-smooth rotation physics
        this.currentRotation += (this.targetRotation - this.currentRotation) * 0.14;
        
        // Oscillate wing displacement value over frames
        this.wingWave = Math.sin(Date.now() * 0.012);
    },
    
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.currentRotation);
        
        // Body Base Silhouette (Matte Yellow-Gold Palette)
        ctx.fillStyle = '#E6C15C';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Belly Highlights
        ctx.fillStyle = '#FFF2CC';
        ctx.beginPath();
        ctx.arc(-2, 3, this.radius * 0.75, 0.2, Math.PI * 0.9);
        ctx.fill();

        // Architectural Wing Elements
        ctx.fillStyle = '#C99E32';
        ctx.save();
        ctx.translate(-6, -1);
        ctx.rotate(this.wingWave * 0.4);
        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Eye Configuration
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(6, -5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2D3748';
        ctx.beginPath();
        ctx.arc(7, -5, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Matte Peach/Coral Beak Structure
        ctx.fillStyle = '#E08E79';
        ctx.beginPath();
        ctx.moveTo(12, -2);
        ctx.lineTo(22, 1);
        ctx.lineTo(12, 5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
};

// Procedural Environment Pipe Pools
let pipes = [];
let frameCounter = 0;

class Pipe {
    constructor() {
        this.x = canvas.width;
        // Keep gaps inside predictable viewport safe zones
        const minHeight = 80;
        const maxHeight = canvas.height - physics.gapHeight - 140;
        this.topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
        this.bottomY = this.topHeight + physics.gapHeight;
        this.width = 68;
        this.passed = false;
        
        // Soft Elegant Linear Gradient Stylings
        this.gradient = ctx.createLinearGradient(0, 0, this.width, 0);
        this.gradient.addColorStop(0, '#A3C1AD'); // Sage-Olive Matte Base
        this.gradient.addColorStop(0.3, '#C2D6C9');
        this.gradient.addColorStop(1, '#8FA899');
    }
    
    update() {
        this.x -= physics.pipeSpeed;
    }
    
    draw() {
        ctx.fillStyle = this.gradient;
        
        // Top Pipe Segment
        ctx.fillRect(this.x, 0, this.width, this.topHeight);
        // Top Lip Structure
        ctx.fillStyle = '#8FA899';
        ctx.fillRect(this.x - 3, this.topHeight - 24, this.width + 6, 24);
        
        // Bottom Pipe Segment
        ctx.fillStyle = this.gradient;
        ctx.fillRect(this.x, this.bottomY, this.width, canvas.height - this.bottomY - 80);
        // Bottom Lip Structure
        ctx.fillStyle = '#8FA899';
        ctx.fillRect(this.x - 3, this.bottomY, this.width + 6, 24);
    }
}

// Scenery Ground Entity
const ground = {
    height: 80,
    draw() {
        const yCoord = canvas.height - this.height;
        // Warm Terracotta / Sand Bedding Gradient
        let grad = ctx.createLinearGradient(0, yCoord, 0, canvas.height);
        grad.addColorStop(0, '#D9C5B2');
        grad.addColorStop(1, '#BFA893');
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, yCoord, canvas.width, this.height);
        
        // Decorative Surface Rim Alignment Accent Line
        ctx.fillStyle = '#A68F7B';
        ctx.fillRect(0, yCoord, canvas.width, 4);
    }
};

// Score Persistence Integration via Flask Server JSON Middleware
async function fetchHighScore() {
    try {
        const response = await fetch('/api/highscore');
        const data = await response.json();
        highScore = data.high_score;
        menuHighScoreElement.textContent = highScore;
    } catch (e) {
        console.warn("Server unreachable. Defaulting to state memory fallback.", e);
    }
}

async function transmitScore(currentScore) {
    try {
        const response = await fetch('/api/highscore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: currentScore })
        });
        const data = await response.json();
        highScore = data.high_score;
        return data.updated;
    } catch (e) {
        console.warn("Local transmission failed.", e);
        if (currentScore > highScore) {
            highScore = currentScore;
            return true;
        }
        return false;
    }
}

// Runtime Resolution Adapter Layer
function resizeViewport() {
    const container = document.getElementById('game-container');
    const bounds = container.getBoundingClientRect();
    scaleX = bounds.width / canvas.width;
    scaleY = bounds.height / canvas.height;
}

// Runtime Game Loop Core Execution Engine
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (gameState === 'PLAYING') {
        frameCounter++;
        
        // Generate Pipes Procedurally
        if (frameCounter % physics.pipeSpawnInterval === 0) {
            pipes.push(new Pipe());
        }
        
        bird.update();
    }
    
    // Cycle and evaluate Pipe arrays
    for (let i = pipes.length - 1; i >= 0; i--) {
        if (gameState === 'PLAYING') {
            pipes[i].update();
        }
        pipes[i].draw();
        
        // Evaluate Scoring Boundaries
        if (!pipes[i].passed && pipes[i].x + pipes[i].width < bird.x) {
            pipes[i].passed = true;
            score++;
            currentScoreElement.textContent = score;
            
            // Pop Animation on Score Increase
            scoreBadge.classList.add('score-pop');
            setTimeout(() => scoreBadge.classList.remove('score-pop'), 100);
        }
        
        // Comprehensive Narrow Intersection Matrix Collision Detect
        if (
            bird.x + bird.radius - 2 > pipes[i].x && 
            bird.x - bird.radius + 2 < pipes[i].x + pipes[i].width
        ) {
            if (bird.y - bird.radius + 2 < pipes[i].topHeight || bird.y + bird.radius - 2 > pipes[i].bottomY) {
                triggerGameOver();
            }
        }
        
        // Garbage collection for out of bounds pipes
        if (pipes[i].x + pipes[i].width < 0) {
            pipes.splice(i, 1);
        }
    }
    
    bird.draw();
    ground.draw();
    
    // Bottom Boundary Ceiling check bounds execution
    if (bird.y + bird.radius >= canvas.height - ground.height) {
        triggerGameOver();
    }
    if (bird.y - bird.radius <= 0) {
        bird.y = bird.radius;
        bird.velocity = 0;
    }
    
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Action Handlers
function handleAction(e) {
    if (e.type === 'keydown' && e.code !== 'Space') return;
    e.preventDefault();
    
    if (gameState === 'PLAYING') {
        bird.jump();
    }
}

function launchGame() {
    startMenu.classList.remove('active');
    gameOverMenu.classList.remove('active');
    score = 0;
    currentScoreElement.textContent = "0";
    frameCounter = 0;
    pipes = [];
    bird.reset();
    gameState = 'PLAYING';
    bird.jump();
}

async function triggerGameOver() {
    if (gameState === 'GAMEOVER') return;
    gameState = 'GAMEOVER';
    
    finalScoreElement.textContent = score;
    bestScoreElement.textContent = highScore;
    
    const isNewRecord = await transmitScore(score);
    bestScoreElement.textContent = highScore;
    
    if (isNewRecord && score > 0) {
        newHighBadge.classList.add('show');
    } else {
        newHighBadge.classList.remove('show');
    }
    
    gameOverMenu.classList.add('active');
}

// Bind Input Control Context Interceptors
window.addEventListener('keydown', handleAction, { passive: false });
canvas.addEventListener('touchstart', handleAction, { passive: false });
canvas.addEventListener('mousedown', handleAction);

startBtn.addEventListener('click', (e) => { e.stopPropagation(); launchGame(); });
restartBtn.addEventListener('click', (e) => { e.stopPropagation(); launchGame(); });

window.addEventListener('resize', resizeViewport);

// System Boot Routine Entrypoint
fetchHighScore();
resizeViewport();
gameLoop();