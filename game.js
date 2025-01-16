const maxPlayers = 14;

class Player {
    constructor(name, x, y, angle) {
        this.name = name;
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.isAlive = true;
        this.size = 30;
        this.isShooting = false;
        this.deathAngle = 0;
        this.muzzleFlash = 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        if (!this.isAlive) {
            ctx.rotate(this.deathAngle);
        } else {
            ctx.rotate(this.angle);
        }

        if (!this.isAlive && this.deathAngle < Math.PI / 2) {
            this.deathAngle += 0.1;
        }

        // Draw stick figure
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 3;

        // Body
        ctx.beginPath();
        ctx.moveTo(0, -this.size / 2);
        ctx.lineTo(0, this.size / 2);
        ctx.stroke();

        // Head
        ctx.beginPath();
        ctx.arc(0, -this.size / 2, maxPlayers, 0, Math.PI * 2);
        ctx.stroke();

        if (this.isAlive) {
            // Arms
            ctx.beginPath();
            ctx.moveTo(-this.size / 2, 0);
            ctx.lineTo(this.size / 2, 0);
            ctx.stroke();

            // Legs
            ctx.beginPath();
            ctx.moveTo(0, this.size / 2);
            ctx.lineTo(-this.size / 3, this.size);
            ctx.moveTo(0, this.size / 2);
            ctx.lineTo(this.size / 3, this.size);
            ctx.stroke();

            // Gun
            ctx.beginPath();
            ctx.moveTo(this.size / 2, 0);
            ctx.lineTo(this.size, 0);
            ctx.strokeStyle = '#2c3e50';
            ctx.stroke();

            // Muzzle flash
            if (this.isShooting && this.muzzleFlash > 0) {
                ctx.beginPath();
                ctx.arc(this.size, 0, 10, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 200, 0, ${this.muzzleFlash})`;
                ctx.fill();
                this.muzzleFlash -= 0.1;
            }
        }

        // Draw name
        ctx.rotate(-this.angle);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, 0, -this.size - 10);

        ctx.restore();
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.players = [];
        this.winner = null;
        this.isGameRunning = false;
        this.shootingInterval = null;
        this.shootSound = new Audio();
        this.shootSound.src = 'Assets/single-pistol-gunshot.mp3';
        this.loadSavedPlayerNames();

        // Western theme music (looped)
        this.themeMusic = new Audio();
        this.themeMusic.src = 'Assets/western-duel.mp3';
        this.themeMusic.loop = true;
        this.themeMusic.volume = 0.5;
        this.isSoundEnabled = false;

        // Setup music toggle
        const musicIcon = document.getElementById('music-icon');
        musicIcon.addEventListener('click', () => {
            this.isSoundEnabled = !this.isSoundEnabled;
            if (this.isSoundEnabled) {
                this.themeMusic.play().catch(() => {
                    console.log('Theme music playback failed');
                });
                musicIcon.src = 'Assets/sound-on.png';
                musicIcon.alt = 'Music On';
            } else {
                this.themeMusic.pause();
                musicIcon.src = 'Assets/sound-off.png';
                musicIcon.alt = 'Music Off';
            }
        });

        this.setupCanvas();
        this.setupEventListeners();
        this.updateRemoveButtons();
    }

    setupCanvas() {
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.ctx.font = '16px Arial';
    }

    addPlayerInput(value) {
        const inputs = document.getElementById('player-inputs');
        let newIndex = inputs.children.length - 2;
        if (newIndex < maxPlayers) {
            newIndex += 1;
            const div = document.createElement('div');
            div.className = 'input-group';
            div.innerHTML = `
                <input type="text" id="player${newIndex}" placeholder="Player ${newIndex} name" value="${value || ''}" />
                <button class="remove-player">✕</button>
            `;
            inputs.insertBefore(div, document.getElementById('add-player'));
            this.updateRemoveButtons();
        }
        if (newIndex >= maxPlayers) {
            document.getElementById('add-player').style.display = 'none';
        }
    }

    setupEventListeners() {
        // Setup remove player functionality
        document.getElementById('player-inputs').addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-player')) {
                const playerInputs = document.querySelectorAll('.input-group');
                if (playerInputs.length <= 3) {
                    alert('At least 3 players are required!');
                    return;
                }
                e.target.parentElement.remove();
                this.updateRemoveButtons();
                // Show add player button if we're below max players
                if (document.querySelectorAll('.input-group').length < maxPlayers) {
                    document.getElementById('add-player').style.display = '';
                }
            }
        });

        document.getElementById('add-player').addEventListener('click', () => this.addPlayerInput());

        document.getElementById('start-game').addEventListener('click', () => this.startGame());
        document.getElementById('play-again').addEventListener('click', () => this.resetGame());
    }

    updateRemoveButtons() {
        const removeButtons = document.querySelectorAll('.remove-player');
        const playerCount = document.querySelectorAll('.input-group').length;
        removeButtons.forEach(button => {
            button.style.visibility = playerCount <= 3 ? 'hidden' : 'visible';
        });
    }

    loadSavedPlayerNames() {
        const savedNames = this.getCookie('playerNames');
        if (savedNames) {
            const names = JSON.parse(savedNames);
            const inputs = document.querySelectorAll('#player-inputs input[type="text"]');
            names.forEach((name, index) => {
                if (inputs[index]) {
                    inputs[index].value = name;
                } else {
                    this.addPlayerInput(name);
                }
            });
        }
    }

    savePlayerNames(names) {
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1); // Cookie expires in 1 month
        document.cookie = `playerNames=${JSON.stringify(names)};expires=${expiryDate.toUTCString()};path=/`;
    }

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    startGame() {
        console.log('Starting game...');

        if (this.isSoundEnabled) {
            this.themeMusic.play();
        }

        const inputs = document.querySelectorAll('#player-inputs input[type="text"]');
        const validPlayers = Array.from(inputs).filter(input => input.value.trim() !== '');

        if (validPlayers.length < 3) {
            alert('Please enter at least 3 player names!');
            return;
        }

        // Save player names to cookie
        const playerNames = validPlayers.map(input => input.value.trim());
        this.savePlayerNames(playerNames);

        if (this.isSoundEnabled) {
            // Fade out and stop theme music
            const fadeOut = setInterval(() => {
                if (this.themeMusic.volume > 0.1) {
                    this.themeMusic.volume -= 0.1;
                } else {
                    clearInterval(fadeOut);
                    this.themeMusic.pause();
                    this.themeMusic.volume = 0.5;
                }
            }, 100);
        }

        this.players = [];
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) * 0.6;

        validPlayers.forEach((input, index) => {
            const angle = (index / validPlayers.length) * Math.PI * 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            const playerAngle = angle + Math.PI / 2;
            this.players.push(new Player(input.value.trim(), x, y, playerAngle));
        });

        document.getElementById('menu').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        this.isGameRunning = true;
        this.startShooting();
        this.animate();
    }

    startShooting() {
        const shootingDuration = 3000 + Math.random() * 2000;
        this.shootingInterval = setInterval(() => {
            const alivePlayers = this.players.filter(p => p.isAlive);
            if (alivePlayers.length <= 1) {
                clearInterval(this.shootingInterval);
                this.endGame();
                return;
            }

            // Play shooting sound
            if (this.isSoundEnabled) {
                this.shootSound.currentTime = 0;
                this.shootSound.play().catch(() => { });
            }

            // Trigger shooting animation
            alivePlayers.forEach(player => {
                player.isShooting = true;
                player.muzzleFlash = 1;
            });

            // After a brief delay, determine who dies
            setTimeout(() => {
                const randomIndex = Math.floor(Math.random() * alivePlayers.length);
                alivePlayers.forEach((player, index) => {
                    if (index !== randomIndex) {
                        player.isAlive = false;
                    }
                });
            }, 500);
        }, shootingDuration);
    }

    endGame() {
        this.isGameRunning = false;
        this.winner = this.players.find(p => p.isAlive);
        document.getElementById('winner-name').textContent = this.winner ? this.winner.name : 'No one';
        document.getElementById('winner-announcement').classList.remove('hidden');
    }

    resetGame() {
        clearInterval(this.shootingInterval);
        this.players = [];
        this.winner = null;
        this.isGameRunning = false;
        document.getElementById('winner-announcement').classList.add('hidden');
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('menu').classList.remove('hidden');
        // Load saved player names
        this.loadSavedPlayerNames();

        // Resume theme music if enabled
        if (this.isSoundEnabled) {
            this.themeMusic.currentTime = 0;
            this.themeMusic.play().catch(() => { });
        }
    }

    animate() {
        if (!this.isGameRunning) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.players.forEach(player => player.draw(this.ctx));
        requestAnimationFrame(() => this.animate());
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
});
