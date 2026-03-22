// --- 1. Particle Net Background Animation ---
const canvas = document.getElementById('particleNet');
const ctx = canvas.getContext('2d');
let particles = [];
let mouse = { x: null, y: null };

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});
window.addEventListener('mouseout', () => {
    mouse.x = null;
    mouse.y = null;
});

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 0.8;
        this.radius = Math.random() * 1.5 + 0.5;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    }
    draw() {
        ctx.fillStyle = 'rgba(0, 255, 194, 0.6)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

for (let i = 0; i < 120; i++) {
    particles.push(new Particle());
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(0, 255, 194, ${0.2 - dist / 600})`;
                ctx.lineWidth = 0.5;
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }
    requestAnimationFrame(animateParticles);
}
animateParticles();

// --- 2. Digital Counter Animation ---
function animateCounter(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 4);
        const current = Math.floor(ease * (end - start) + start);
        obj.innerHTML = current.toLocaleString();
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = end.toLocaleString();
        }
    };
    window.requestAnimationFrame(step);
}

// --- 3. Main Communication Logic ---
async function handleSearch() {
    const cityName = document.getElementById('cityInput').value.trim();
    if (!cityName) return alert("Please enter a district name.");

    try {
        // IMPORTANT: This fetch only works if you run the Python app and visit http://127.0.0.1:5000
        const response = await fetch('/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ district: cityName })
        });

        if (!response.ok) throw new Error('Backend Offline');

        const data = await response.json();
        if (data.found) {
            displayResults(data);
        } else {
            alert("District not found in database. Try 'Chennai'.");
        }
    } catch (err) {
        console.warn("Backend connection failed. Running Mock UI Presentation Mode.");
        // Fallback for UI Demo if Flask isn't running
        displayResults({
            actual_risk: "High Risk",
            actual_total: 6204,
            top_issue: "DDoS Swarm",
            pred_labels: ["Phishing", "DDoS", "Malware", "Injection", "Identity Theft"],
            pred_values: [1200, 2400, 950, 1654, 800],
            defense_logs: [
                { timestamp: new Date().toLocaleTimeString(), ip: "103.25.12.1", requests: 1542, status: "Danger", action: "ACCESS RESTRICTED: IP Under Cooling-Off Period" },
                { timestamp: new Date().toLocaleTimeString(), ip: "192.168.1.45", requests: 12, status: "Safe", action: "ALLOWED: Normal Traffic" },
                { timestamp: new Date().toLocaleTimeString(), ip: "45.77.10.5", requests: 840, status: "Warning", action: "ALERT: Swarm Attack" }
            ]
        });
    }
}

// --- 4. UI Update Logic ---
function displayResults(data) {
    document.getElementById('resultsView').style.display = 'block';

    // Update Risk Text & Shield
    const riskTextEl = document.getElementById('riskText');
    const shield = document.getElementById('idsShield');
    riskTextEl.innerText = data.actual_risk;

    const isHighRisk = data.actual_risk.toLowerCase().includes('high') || data.actual_risk.toLowerCase().includes('danger');

    if (isHighRisk) {
        shield.className = "cyber-shield shield-high";
        riskTextEl.style.color = 'var(--danger)';
    } else {
        shield.className = "cyber-shield shield-low";
        riskTextEl.style.color = 'var(--mint)';
    }

    // Counter Animation
    const endCount = parseInt(data.actual_total);
    animateCounter('totalText', 0, isNaN(endCount) ? 0 : endCount, 2000);

    // Primary Threat Badge
    document.getElementById('issueText').innerText = data.top_issue;
    const badgeEl = document.getElementById('topCrimeBadge');
    if (isHighRisk) {
        badgeEl.classList.add('badge-severe');
    } else {
        badgeEl.classList.remove('badge-severe');
    }

    // Update Chart
    updateChart(data.pred_labels, data.pred_values);

    // Update Logs Table
    const logBody = document.getElementById('logBody');
    logBody.innerHTML = '';
    data.defense_logs.forEach((log, index) => {
        const tr = document.createElement('tr');
        tr.style.opacity = '0';
        tr.style.animation = `fadeIn 0.5s ease-out ${index * 0.1}s forwards`;
        tr.innerHTML = `
            <td>${log.timestamp}</td>
            <td style="font-family: monospace; color: var(--mint);">${log.ip}</td>
            <td>${log.requests}</td>
            <td class="status-${log.status}">${log.action}</td>
        `;
        logBody.appendChild(tr);
    });
}

// --- 5. Chart.js Visualization ---
function updateChart(labels, values) {
    const ctx = document.getElementById('crimeChart').getContext('2d');

    if (window.myCrimeChart) { window.myCrimeChart.destroy(); }

    const gradient = ctx.createLinearGradient(0, 0, 400, 0);
    gradient.addColorStop(0, 'rgba(0, 255, 194, 0.8)');
    gradient.addColorStop(1, 'rgba(112, 111, 211, 0.3)');

    window.myCrimeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Forecasted Attack Volume',
                data: values,
                backgroundColor: gradient,
                borderColor: '#00ffc2',
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            plugins: {
                legend: { labels: { color: '#8b9bb4' } }
            },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b9bb4' } },
                y: { grid: { display: false }, ticks: { color: '#e6edf8' } }
            }
        }
    });
}