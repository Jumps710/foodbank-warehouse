/**
 * Request Table View
 */

class RequestTableView extends BaseView {
    constructor() {
        super();
        this.allRequests = [];
        this.userRole = null;
        this.refreshInterval = null;
    }

    async init() {
        this.userRole = await this.getUserRole();
        this.render(this.getHTML());
        await this.loadRequests();
        this.setupEventListeners();
        this.setupAutoRefresh();
    }

    getHTML() {
        const showSummary = this.userRole !== 'requester' && this.userRole !== 'driver';
        const showFilters = this.userRole !== 'driver';

        return `
        <div class="container-fluid mt-3">
            <!-- Summary section -->
            ${showSummary ? `
            <div class="card mb-3" id="summarySection">
                <div class="card-body">
                    <h5 class="card-title mb-3">
                        <i class="fas fa-chart-bar"></i> 今月のサマリー
                    </h5>
                    <div class="row text-center">
                        <div class="col-4">
                            <div class="text-warning">
                                <h3 id="activeCount">0</h3>
                                <small>処理中</small>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="text-success">
                                <h3 id="completedCount">0</h3>
                                <small>完了</small>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="text-primary">
                                <h3 id="totalCount">0</h3>
                                <small>全件数</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            ` : ''}

            <!-- Filters and actions -->
            ${showFilters ? `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row g-2">
                        <div class="col-md-3">
                            <select class="form-select" id="statusFilter">
                                <option value="">全てのステータス</option>
                                <option value="active">処理中</option>
                                <option value="completed">完了</option>
                                <option value="cancelled">キャンセル</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <select class="form-select" id="monthFilter">
                                <option value="">全ての月</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <button class="btn btn-outline-primary w-100" onclick="window.location.reload()">
                                <i class="fas fa-sync"></i> 更新
                            </button>
                        </div>
                        <div class="col-md-3">
                            <button class="btn btn-primary w-100" onclick="navigateTo('/form')">
                                <i class="fas fa-plus"></i> 新規リクエスト
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            ` : `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row g-2">
                        <div class="col-6">
                            <button class="btn btn-outline-primary w-100" onclick="window.location.reload()">
                                <i class="fas fa-sync"></i> 更新
                            </button>
                        </div>
                        <div class="col-6">
                            <button class="btn btn-primary w-100" onclick="navigateTo('/form')">
                                <i class="fas fa-plus"></i> 新規リクエスト
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            `}

            <!-- Navigation -->
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row g-2">
                        ${this.userRole === 'admin' ? `
                        <div class="col-md-3">
                            <button class="btn btn-info w-100" onclick="navigateTo('/dashboard')">
                                <i class="fas fa-chart-line"></i> ダッシュボード
                            </button>
                        </div>
                        ` : ''}
                        <div class="col-md-3">
                            <button class="btn btn-outline-secondary w-100" onclick="navigateTo('/form')">
                                <i class="fas fa-edit"></i> フォーム
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Request list -->
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0">
                        <i class="fas fa-list"></i> リクエスト一覧
                    </h5>
                </div>
                <div class="card-body p-0">
                    <div id="requestList" class="list-group list-group-flush">
                        <!-- Request items will be populated here -->
                    </div>
                    
                    <!-- No data message -->
                    <div id="noDataMessage" class="text-center p-5 d-none">
                        <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                        <p class="text-muted">リクエストがありません</p>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    async loadRequests() {
        try {
            const params = new URLSearchParams({
                action: 'getRequests',
                userRole: this.userRole,
                userId: window.appState.userProfile.userId
            });

            const response = await fetch(`${window.WAREHOUSE_API_URL}?${params}`);
            const data = await response.json();

            if (data.success) {
                this.allRequests = data.requests || [];
                this.updateSummary();
                this.populateMonthFilter();
                this.applyFilters();
            } else {
                console.error('Failed to load requests:', data.message);
                showAlert('リクエストの読み込みに失敗しました。', 'danger');
            }
        } catch (error) {
            console.error('Error loading requests:', error);
            showAlert('データの読み込み中にエラーが発生しました。', 'danger');
        }
    }

    updateSummary() {
        if (this.userRole === 'requester' || this.userRole === 'driver') return;

        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthRequests = this.allRequests.filter(r => r.pickupDate?.startsWith(currentMonth));

        const activeCount = monthRequests.filter(r => r.status === 'active').length;
        const completedCount = monthRequests.filter(r => r.status === 'completed').length;
        const totalCount = monthRequests.length;

        document.getElementById('activeCount').textContent = activeCount;
        document.getElementById('completedCount').textContent = completedCount;
        document.getElementById('totalCount').textContent = totalCount;
    }

    populateMonthFilter() {
        const monthFilter = document.getElementById('monthFilter');
        if (!monthFilter) return;

        const months = new Set();
        const currentDate = new Date();
        months.add(currentDate.toISOString().slice(0, 7));

        this.allRequests.forEach(request => {
            if (request.pickupDate) {
                const month = request.pickupDate.slice(0, 7);
                months.add(month);
            }
        });

        // Clear existing options except first
        monthFilter.innerHTML = '<option value="">全ての月</option>';

        Array.from(months).sort().reverse().forEach(month => {
            const option = document.createElement('option');
            option.value = month;
            const [year, monthNum] = month.split('-');
            option.textContent = `${year}年${parseInt(monthNum)}月`;
            monthFilter.appendChild(option);
        });

        monthFilter.value = currentDate.toISOString().slice(0, 7);
    }

    setupEventListeners() {
        const statusFilter = document.getElementById('statusFilter');
        const monthFilter = document.getElementById('monthFilter');

        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.applyFilters());
        }
        if (monthFilter) {
            monthFilter.addEventListener('change', () => this.applyFilters());
        }
    }

    applyFilters() {
        const statusFilter = document.getElementById('statusFilter');
        const monthFilter = document.getElementById('monthFilter');

        const statusValue = statusFilter?.value || '';
        const monthValue = monthFilter?.value || '';

        let filteredRequests = [...this.allRequests];

        // Apply status filter
        if (statusValue) {
            filteredRequests = filteredRequests.filter(r => r.status === statusValue);
        }

        // Apply month filter
        if (monthValue && this.userRole !== 'requester') {
            filteredRequests = filteredRequests.filter(r => r.pickupDate?.startsWith(monthValue));
        }

        // For requesters, show only current and future requests by default
        if (this.userRole === 'requester' && !monthValue) {
            const today = new Date().toISOString().split('T')[0];
            filteredRequests = filteredRequests.filter(r => r.pickupDate >= today);
        }

        // Sort by pickup date
        filteredRequests.sort((a, b) => {
            if (!a.pickupDate) return 1;
            if (!b.pickupDate) return -1;
            return a.pickupDate.localeCompare(b.pickupDate);
        });

        this.displayRequests(filteredRequests);
    }

    displayRequests(requests) {
        const requestList = document.getElementById('requestList');
        const noDataMessage = document.getElementById('noDataMessage');

        requestList.innerHTML = '';

        if (requests.length === 0) {
            noDataMessage.classList.remove('d-none');
            return;
        }

        noDataMessage.classList.add('d-none');

        requests.forEach(request => {
            const item = this.createRequestItem(request);
            requestList.appendChild(item);
        });
    }

    createRequestItem(request) {
        const item = document.createElement('div');
        item.className = 'list-group-item list-group-item-action request-item';

        const statusBadge = this.getStatusBadge(request.status);
        const pickupIcon = request.pickupType === 'delivery' ? 
            '<i class="fas fa-truck text-info"></i>' : 
            '<i class="fas fa-hand-holding text-secondary"></i>';

        let content = '';

        if (this.userRole === 'driver') {
            // Driver view - minimal info
            content = `
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">${request.requesterName || '名称未設定'}</h6>
                        <p class="mb-1">
                            <i class="fas fa-calendar"></i> ${this.formatDate(request.pickupDate)}
                            ${pickupIcon}
                        </p>
                        <small class="text-muted">${request.requesterAddress || 'アドレス未設定'}</small>
                    </div>
                    <div>
                        ${statusBadge}
                    </div>
                </div>
            `;
        } else {
            // Other roles - full info
            content = `
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center mb-1">
                            <h6 class="mb-0 me-2">${request.requestId || 'ID未設定'}</h6>
                            ${statusBadge}
                        </div>
                        <p class="mb-1">
                            <strong>${request.requesterName || '名称未設定'}</strong>
                        </p>
                        <p class="mb-1">
                            <i class="fas fa-calendar"></i> ${this.formatDate(request.pickupDate)}
                            ${pickupIcon}
                            <span class="ms-2">${this.getEventTypeLabel(request.eventType)}</span>
                        </p>
                        ${(request.kodomoCount || request.pantryCount) ? `
                            <small class="text-muted">
                                世帯数: ${request.kodomoCount || 0} / ${request.pantryCount || 0}
                            </small>
                        ` : ''}
                    </div>
                    <div class="text-end">
                        <i class="fas fa-chevron-right text-muted"></i>
                    </div>
                </div>
            `;
        }

        item.innerHTML = content;

        // Add click handler
        item.addEventListener('click', () => {
            navigateTo('/details', { id: request.requestId });
        });

        return item;
    }

    getStatusBadge(status) {
        const badges = {
            active: '<span class="badge badge-status-active">処理中</span>',
            completed: '<span class="badge badge-status-completed">完了</span>',
            cancelled: '<span class="badge badge-status-cancelled">キャンセル</span>'
        };
        return badges[status] || '<span class="badge bg-secondary">不明</span>';
    }

    getEventTypeLabel(eventType) {
        const labels = {
            kodomo: '子ども食堂',
            pantry: 'パントリー',
            both: '両方'
        };
        return labels[eventType] || '';
    }

    formatDate(dateString) {
        if (!dateString) return '日付未設定';
        try {
            const date = new Date(dateString);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}年${month}月${day}日`;
        } catch (error) {
            return '日付エラー';
        }
    }

    setupAutoRefresh() {
        // Auto-refresh every 30 seconds
        this.refreshInterval = setInterval(async () => {
            await this.loadRequests();
        }, 30000);
    }

    cleanup() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}