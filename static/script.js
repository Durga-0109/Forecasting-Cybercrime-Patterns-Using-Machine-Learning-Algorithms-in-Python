async function handleSearch() {
    const cityName = document.getElementById('cityInput').value;
    if (!cityName) return alert("Please enter a district name.");

    const response = await fetch('/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ district: cityName })
    });

    const data = await response.json();

    if (data.found) {
        document.getElementById('resultsView').style.display = 'block';
        
        // 1. Update Stats Cards
        document.getElementById('riskText').innerText = data.actual_risk;
        document.getElementById('totalText').innerText = data.actual_total;
        document.getElementById('issueText').innerText = data.top_issue;

        // 2. Update the Chart
        updateChart(data.pred_labels, data.pred_values);

        // 3. Update the HOD's Detection Log Table
        const logBody = document.getElementById('logBody');
        logBody.innerHTML = ''; // Clear previous logs

        data.defense_logs.forEach(log => {
            const row = `
                <tr>
                    <td>${log.timestamp}</td>
                    <td>${log.ip}</td>
                    <td>${log.requests}</td>
                    <td class="status-${log.status}">${log.action}</td>
                </tr>
            `;
            logBody.innerHTML += row;
        });

    } else {
        alert("District not found. Try 'Chennai'.");
    }
}

function updateChart(labels, values) {
    const ctx = document.getElementById('crimeChart').getContext('2d');
    if (window.myCrimeChart) { window.myCrimeChart.destroy(); }

    window.myCrimeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Forecasted Attack Patterns',
                data: values,
                backgroundColor: 'rgba(0, 212, 255, 0.4)',
                borderColor: '#00d4ff',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            scales: {
                x: { beginAtZero: true, grid: { color: '#233554' }, ticks: { color: '#ccd6f6' } },
                y: { grid: { display: false }, ticks: { color: '#ccd6f6' } }
            },
            plugins: {
                legend: { labels: { color: '#ccd6f6' } }
            }
        }
    });
}