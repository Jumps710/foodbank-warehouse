/**
 * Request Dashboard View (Admin Only)
 */

class RequestDashboardView extends BaseView {
    constructor() {
        super();
        this.dashboardData = null;
        this.charts = {};
    }

    async init() {
        this.render(this.getHTML());
        await this.loadDashboardData();
        this.setupEventListeners();
    }

    getHTML() {
        return `
        <div class="container-fluid mt-3">
            <!-- Header -->
            <div class="card mb-3">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0">
                        <i class="fas fa-chart-line"></i> フードバンク ダッシュボード
                    </h5>
                </div>
                <div class="card-body">
                    <div class="row g-2">
                        <div class="col-md-8">
                            <p class="mb-0">管理者向けダッシュボード - システム全体の統計情報を表示</p>
                        </div>
                        <div class="col-md-4">
                            <button class="btn btn-outline-primary w-100" onclick="navigateTo('/table')">
                                <i class="fas fa-list"></i> リクエスト一覧に戻る
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Summary cards -->
            <div class="row mb-4">
                <div class="col-md-3 mb-3">
                    <div class="card bg-primary text-white">
                        <div class="card-body text-center">
                            <i class="fas fa-clipboard-list fa-2x mb-2"></i>
                            <h3 id="totalRequests">0</h3>
                            <small>総リクエスト数</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="card bg-success text-white">
                        <div class="card-body text-center">
                            <i class="fas fa-home fa-2x mb-2"></i>
                            <h3 id="totalHouseholds">0</h3>
                            <small>総利用世帯数</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="card bg-info text-white">
                        <div class="card-body text-center">
                            <i class="fas fa-yen-sign fa-2x mb-2"></i>
                            <h3 id="estimatedValue">¥0</h3>
                            <small>推定寄付額</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="card bg-warning text-dark">
                        <div class="card-body text-center">
                            <i class="fas fa-building fa-2x mb-2"></i>
                            <h3 id="activeOrganizations">0</h3>
                            <small>活動団体数</small>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts placeholder -->
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0">
                                <i class="fas fa-chart-line"></i> 月別リクエスト数推移
                            </h6>
                        </div>
                        <div class="card-body">
                            <div class="chart-container">
                                <canvas id="requestTrendChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0">
                                <i class="fas fa-chart-pie"></i> イベントタイプ別割合
                            </h6>
                        </div>
                        <div class="card-body">
                            <div class="chart-container">
                                <canvas id="eventTypeChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recent requests -->
            <div class="row mb-4">
                <div class="col-md-12">
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0">
                                <i class="fas fa-clock"></i> 最近のリクエスト
                            </h6>
                        </div>
                        <div class="card-body">
                            <div id="recentRequests">
                                <!-- Recent requests will be populated here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Value estimation settings -->
            <div class="row mb-4">
                <div class="col-md-12">
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0">
                                <i class="fas fa-calculator"></i> 寄付額推定設定
                            </h6>
                        </div>
                        <div class="card-body">
                            <div class="row align-items-center">
                                <div class="col-md-4">
                                    <div class="input-group">
                                        <span class="input-group-text">1世帯あたり</span>
                                        <input type="number" class="form-control" id="householdValue" value="1000" min="0">
                                        <span class="input-group-text">円</span>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <button class="btn btn-primary" onclick="this.updateValueEstimation()">
                                        <i class="fas fa-sync"></i> 再計算
                                    </button>
                                </div>
                                <div class="col-md-4">
                                    <div class="alert alert-info mb-0">
                                        <small>
                                            設定した単価に基づいて、これまでの総寄付額相当を算出します
                                        </small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    async loadDashboardData() {
        try {
            const response = await fetch(`${window.WAREHOUSE_API_URL}?action=getDashboardData`);
            const data = await response.json();

            if (data.success) {
                this.dashboardData = data.data;
                this.updateSummaryCards();
                this.updateRecentRequests();
                this.createBasicCharts();
            } else {
                console.error('Failed to load dashboard data:', data.message);
                showAlert('ダッシュボードデータの読み込みに失敗しました。', 'danger');
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            showAlert('データの読み込み中にエラーが発生しました。', 'danger');
        }
    }

    updateSummaryCards() {
        if (!this.dashboardData) return;

        document.getElementById('totalRequests').textContent = this.dashboardData.totalRequests || 0;
        document.getElementById('totalHouseholds').textContent = this.dashboardData.totalHouseholds || 0;
        document.getElementById('activeOrganizations').textContent = this.dashboardData.activeOrganizations || 0;

        this.updateValueEstimation();
    }

    updateValueEstimation() {
        const householdValue = parseInt(document.getElementById('householdValue').value) || 1000;
        const totalHouseholds = parseInt(document.getElementById('totalHouseholds').textContent) || 0;
        const estimatedValue = totalHouseholds * householdValue;

        document.getElementById('estimatedValue').textContent = 
            '¥' + estimatedValue.toLocaleString();
    }

    updateRecentRequests() {
        const recentRequestsContainer = document.getElementById('recentRequests');
        
        // Mock recent requests data
        const recentRequests = [
            {
                requestId: '250821001',
                requesterName: 'テスト子ども食堂A',
                pickupDate: '2025-08-25',
                status: 'active'
            },
            {
                requestId: '250820003',
                requesterName: 'テストパントリーB',
                pickupDate: '2025-08-24',
                status: 'completed'
            }
        ];

        if (recentRequests.length === 0) {
            recentRequestsContainer.innerHTML = '<p class="text-muted text-center">最近のリクエストがありません</p>';
            return;
        }

        recentRequestsContainer.innerHTML = recentRequests.map(request => `
            <div class="d-flex justify-content-between align-items-center p-2 border-bottom">
                <div>
                    <strong>${request.requestId}</strong> - ${request.requesterName}
                    <br>
                    <small class="text-muted">ピックアップ予定: ${this.formatDate(request.pickupDate)}</small>
                </div>
                <div>
                    ${this.getStatusBadge(request.status)}
                    <button class="btn btn-sm btn-outline-primary ms-2" onclick="navigateTo('/details', {id: '${request.requestId}'})">
                        詳細
                    </button>
                </div>
            </div>
        `).join('');
    }

    createBasicCharts() {
        // Simple chart creation (mock data for now)
        this.createRequestTrendChart();
        this.createEventTypeChart();
    }

    createRequestTrendChart() {
        const ctx = document.getElementById('requestTrendChart').getContext('2d');

        // Mock data
        const data = {
            labels: ['7月', '8月', '9月', '10月', '11月', '12月'],
            datasets: [{
                label: 'リクエスト数',
                data: [12, 19, 15, 25, 22, 18],
                borderColor: '#06c755',
                backgroundColor: 'rgba(6, 199, 85, 0.1)',
                fill: true,
                tension: 0.4
            }]
        };

        this.charts.requestTrend = new Chart(ctx, {
            type: 'line',
            data: data,
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

    createEventTypeChart() {
        const ctx = document.getElementById('eventTypeChart').getContext('2d');

        // Mock data
        const data = {
            labels: ['子ども食堂', 'パントリー', '両方'],
            datasets: [{
                data: [45, 35, 20],
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB', 
                    '#FFCE56'
                ]
            }]
        };

        this.charts.eventType = new Chart(ctx, {
            type: 'doughnut',
            data: data,
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

    getStatusBadge(status) {
        const badges = {
            active: '<span class="badge badge-status-active">処理中</span>',
            completed: '<span class="badge badge-status-completed">完了</span>',
            cancelled: '<span class="badge badge-status-cancelled">キャンセル</span>'
        };
        return badges[status] || '<span class="badge bg-secondary">不明</span>';
    }

    formatDate(dateString) {
        if (!dateString) return '日付未設定';
        try {
            const date = new Date(dateString);
            const month = date.getMonth() + 1;
            const day = date.getDate();
            return `${month}月${day}日`;
        } catch (error) {
            return '日付エラー';
        }
    }

    setupEventListeners() {
        // Bind methods to window for onclick handlers
        window.dashboardView = this;
        
        // Value estimation input
        const householdValueInput = document.getElementById('householdValue');
        if (householdValueInput) {
            householdValueInput.addEventListener('input', () => {
                this.updateValueEstimation();
            });
        }
    }

    cleanup() {
        // Destroy charts
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });

        // Clean up global references
        if (window.dashboardView === this) {
            delete window.dashboardView;
        }
    }
}