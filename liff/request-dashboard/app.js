// Dashboard specific functionality
let dashboardData = null;
let charts = {};
let currentFilters = {
    year: '',
    month: '',
    location: ''
};

// Called after LIFF initialization
window.onLiffInit = async function(liffData) {
    console.log('Dashboard initialized', liffData);
    
    // Check if user has admin access
    const userRole = await checkAdminAccess(liffData.profile.userId);
    if (userRole !== 'admin') {
        alert('ダッシュボードへのアクセス権限がありません');
        history.back();
        return;
    }
    
    // Initialize dashboard
    await loadDashboardData();
    setupFilters();
    
    // Hide loading
    document.getElementById('loading').style.display = 'none';
};

// Check admin access
async function checkAdminAccess(userId) {
    try {
        const response = await fetch(`${window.WAREHOUSE_API_URL}?action=getUserRole&lineUserId=${userId}`);
        const data = await response.json();
        return data.role || 'requester';
    } catch (error) {
        console.error('Error checking admin access:', error);
        return 'requester';
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const params = new URLSearchParams({
            action: 'getDashboardData',
            ...currentFilters
        });
        
        const response = await fetch(`${window.WAREHOUSE_API_URL}?${params}`);
        const data = await response.json();
        
        if (data.success) {
            dashboardData = data.data;
            updateSummaryCards();
            createCharts();
        } else {
            console.error('Failed to load dashboard data:', data.message);
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Setup filters
function setupFilters() {
    // Populate year filter
    const yearFilter = document.getElementById('yearFilter');
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= currentYear - 5; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `${year}年`;
        yearFilter.appendChild(option);
    }
    
    // Populate month filter
    const monthFilter = document.getElementById('monthFilter');
    const months = [
        '1月', '2月', '3月', '4月', '5月', '6月',
        '7月', '8月', '9月', '10月', '11月', '12月'
    ];
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = month;
        monthFilter.appendChild(option);
    });
    
    // Location filter will be populated from data
    // This would typically be loaded from the backend
}

// Apply filters
async function applyFilters() {
    currentFilters.year = document.getElementById('yearFilter').value;
    currentFilters.month = document.getElementById('monthFilter').value;
    currentFilters.location = document.getElementById('locationFilter').value;
    
    document.getElementById('loading').style.display = 'flex';
    await loadDashboardData();
    document.getElementById('loading').style.display = 'none';
}

// Update summary cards
function updateSummaryCards() {
    if (!dashboardData) return;
    
    document.getElementById('totalRequests').textContent = dashboardData.totalRequests || 0;
    document.getElementById('totalHouseholds').textContent = dashboardData.totalHouseholds || 0;
    document.getElementById('activeOrganizations').textContent = dashboardData.activeOrganizations || 0;
    
    updateValueEstimation();
}

// Update value estimation
function updateValueEstimation() {
    const householdValue = parseInt(document.getElementById('householdValue').value) || 1000;
    const totalHouseholds = parseInt(document.getElementById('totalHouseholds').textContent) || 0;
    const estimatedValue = totalHouseholds * householdValue;
    
    document.getElementById('estimatedValue').textContent = 
        '¥' + estimatedValue.toLocaleString();
}

// Create charts
function createCharts() {
    if (!dashboardData) return;
    
    // Destroy existing charts
    Object.values(charts).forEach(chart => {
        if (chart) chart.destroy();
    });
    
    createRequestTrendChart();
    createEventTypeChart();
    createTopOrganizationsChart();
    createHouseholdTrendChart();
}

// Create request trend chart
function createRequestTrendChart() {
    const ctx = document.getElementById('requestTrendChart').getContext('2d');
    
    const data = dashboardData.requestTrend || [];
    const labels = data.map(item => `${item.year}年${item.month}月`);
    const values = data.map(item => item.count);
    
    charts.requestTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'リクエスト数',
                data: values,
                borderColor: '#06c755',
                backgroundColor: 'rgba(6, 199, 85, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Create event type chart
function createEventTypeChart() {
    const ctx = document.getElementById('eventTypeChart').getContext('2d');
    
    const data = dashboardData.eventTypeDistribution || [];
    const labels = data.map(item => {
        const typeLabels = {
            kodomo: '子ども食堂',
            pantry: 'パントリー',
            both: '両方'
        };
        return typeLabels[item.eventType] || item.eventType;
    });
    const values = data.map(item => item.count);
    
    charts.eventType = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Create top organizations chart
function createTopOrganizationsChart() {
    const ctx = document.getElementById('topOrganizationsChart').getContext('2d');
    
    const data = dashboardData.topOrganizations || [];
    const labels = data.map(item => item.name.length > 15 ? 
        item.name.substring(0, 15) + '...' : item.name);
    const values = data.map(item => item.count);
    
    charts.topOrganizations = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'リクエスト数',
                data: values,
                backgroundColor: '#36A2EB'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Create household trend chart
function createHouseholdTrendChart() {
    const ctx = document.getElementById('householdTrendChart').getContext('2d');
    
    const data = dashboardData.householdTrend || [];
    const labels = data.map(item => `${item.year}年${item.month}月`);
    const kodomoValues = data.map(item => item.kodomoCount || 0);
    const pantryValues = data.map(item => item.pantryCount || 0);
    
    charts.householdTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '子ども食堂世帯数',
                data: kodomoValues,
                borderColor: '#FF6384',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                fill: false
            }, {
                label: 'パントリー世帯数',
                data: pantryValues,
                borderColor: '#36A2EB',
                backgroundColor: 'rgba(54, 162, 235, 0.1)',
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Export data
async function exportData(type) {
    try {
        const params = new URLSearchParams({
            action: 'exportData',
            type: type,
            ...currentFilters
        });
        
        const response = await fetch(`${window.WAREHOUSE_API_URL}?${params}`);
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `foodbank_${type}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
    } catch (error) {
        console.error('Error exporting data:', error);
        alert('データのエクスポートに失敗しました');
    }
}

// Export charts as PDF (placeholder)
function exportChartsPDF() {
    alert('PDF出力機能は実装中です');
    // This would require a library like jsPDF or html2canvas
    // to convert the charts to PDF format
}

// Auto-refresh every 5 minutes
setInterval(async () => {
    await loadDashboardData();
}, 5 * 60 * 1000);