// Request Table specific functionality
let allRequests = [];
let userRole = null;
let currentUserId = null;

// Called after LIFF initialization
window.onLiffInit = async function(liffData) {
    console.log('Request Table initialized', liffData);
    
    currentUserId = liffData.profile.userId;
    
    // Determine user role and fetch data
    await determineUserRole(currentUserId);
    await loadRequests();
    
    // Hide loading
    document.getElementById('loading').style.display = 'none';
};

// Determine user role based on LINE user ID
async function determineUserRole(lineUserId) {
    try {
        const response = await fetch(`${window.WAREHOUSE_API_URL}?action=getUserRole&lineUserId=${lineUserId}`);
        const data = await response.json();
        
        if (data.success) {
            userRole = data.role || 'requester';
            
            // Adjust UI based on role
            if (userRole === 'requester') {
                document.getElementById('summarySection').classList.add('d-none');
                document.getElementById('monthFilter').parentElement.classList.add('d-none');
            } else if (userRole === 'driver') {
                document.getElementById('summarySection').classList.add('d-none');
                document.querySelector('.row.g-2').classList.add('d-none');
            }
        }
    } catch (error) {
        console.error('Error determining user role:', error);
        userRole = 'requester'; // Default to requester
    }
}

// Load requests based on user role
async function loadRequests() {
    try {
        const params = new URLSearchParams({
            action: 'getRequests',
            userRole: userRole,
            userId: currentUserId
        });
        
        const response = await fetch(`${window.WAREHOUSE_API_URL}?${params}`);
        const data = await response.json();
        
        if (data.success) {
            allRequests = data.requests || [];
            updateSummary();
            populateMonthFilter();
            applyFilters();
        } else {
            console.error('Failed to load requests:', data.message);
        }
    } catch (error) {
        console.error('Error loading requests:', error);
    }
}

// Update summary counts
function updateSummary() {
    if (userRole === 'requester' || userRole === 'driver') return;
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthRequests = allRequests.filter(r => r.pickupDate.startsWith(currentMonth));
    
    document.getElementById('activeCount').textContent = 
        monthRequests.filter(r => r.status === 'active').length;
    document.getElementById('completedCount').textContent = 
        monthRequests.filter(r => r.status === 'completed').length;
    document.getElementById('totalCount').textContent = monthRequests.length;
}

// Populate month filter
function populateMonthFilter() {
    const monthFilter = document.getElementById('monthFilter');
    const months = new Set();
    
    // Add current and future months
    const currentDate = new Date();
    months.add(currentDate.toISOString().slice(0, 7));
    
    // Add months from requests
    allRequests.forEach(request => {
        const month = request.pickupDate.slice(0, 7);
        months.add(month);
    });
    
    // Sort and populate
    Array.from(months).sort().reverse().forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        const [year, monthNum] = month.split('-');
        option.textContent = `${year}年${parseInt(monthNum)}月`;
        monthFilter.appendChild(option);
    });
    
    // Set default to current month
    monthFilter.value = currentDate.toISOString().slice(0, 7);
}

// Apply filters
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const monthFilter = document.getElementById('monthFilter').value;
    
    let filteredRequests = allRequests;
    
    // Apply status filter
    if (statusFilter) {
        filteredRequests = filteredRequests.filter(r => r.status === statusFilter);
    }
    
    // Apply month filter (for non-requester roles)
    if (monthFilter && userRole !== 'requester') {
        filteredRequests = filteredRequests.filter(r => r.pickupDate.startsWith(monthFilter));
    }
    
    // For requesters, show only current and future requests by default
    if (userRole === 'requester' && !monthFilter) {
        const today = new Date().toISOString().split('T')[0];
        filteredRequests = filteredRequests.filter(r => r.pickupDate >= today);
    }
    
    // Sort by pickup date (ascending)
    filteredRequests.sort((a, b) => a.pickupDate.localeCompare(b.pickupDate));
    
    displayRequests(filteredRequests);
}

// Display requests in the list
function displayRequests(requests) {
    const requestList = document.getElementById('requestList');
    const noDataMessage = document.getElementById('noDataMessage');
    
    requestList.innerHTML = '';
    
    if (requests.length === 0) {
        noDataMessage.classList.remove('d-none');
        return;
    }
    
    noDataMessage.classList.add('d-none');
    
    requests.forEach(request => {
        const item = createRequestItem(request);
        requestList.appendChild(item);
    });
}

// Create request list item
function createRequestItem(request) {
    const item = document.createElement('div');
    item.className = 'list-group-item list-group-item-action request-item';
    
    const statusBadge = getStatusBadge(request.status);
    const pickupIcon = request.pickupType === 'delivery' ? 
        '<i class="fas fa-truck text-info"></i>' : 
        '<i class="fas fa-hand-holding text-secondary"></i>';
    
    // Build item content based on user role
    let content = '';
    
    if (userRole === 'driver') {
        // Driver view - minimal info
        content = `
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <h6 class="mb-1">${request.requesterName}</h6>
                    <p class="mb-1">
                        <i class="fas fa-calendar"></i> ${window.liffUtils.formatDate(request.pickupDate)}
                        ${pickupIcon}
                    </p>
                    <small class="text-muted">${request.requesterAddress}</small>
                </div>
                <div>
                    ${statusBadge}
                </div>
            </div>
        `;
    } else {
        // Staff/Admin/Requester view - full info
        content = `
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center mb-1">
                        <h6 class="mb-0 me-2">${request.requestId}</h6>
                        ${statusBadge}
                    </div>
                    <p class="mb-1">
                        <strong>${request.requesterName}</strong>
                    </p>
                    <p class="mb-1">
                        <i class="fas fa-calendar"></i> ${window.liffUtils.formatDate(request.pickupDate)}
                        ${pickupIcon}
                        <span class="ms-2">${getEventTypeLabel(request.eventType)}</span>
                    </p>
                    ${request.kodomoCount || request.pantryCount ? `
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
        window.location.href = `../request-details/?id=${request.requestId}`;
    });
    
    return item;
}

// Get status badge HTML
function getStatusBadge(status) {
    const badges = {
        active: '<span class="badge badge-status-active">処理中</span>',
        completed: '<span class="badge badge-status-completed">完了</span>',
        cancelled: '<span class="badge badge-status-cancelled">キャンセル</span>'
    };
    return badges[status] || '';
}

// Get event type label
function getEventTypeLabel(eventType) {
    const labels = {
        kodomo: '子ども食堂',
        pantry: 'パントリー',
        both: '両方'
    };
    return labels[eventType] || '';
}

// Event listeners
document.getElementById('statusFilter').addEventListener('change', applyFilters);
document.getElementById('monthFilter').addEventListener('change', applyFilters);

// Auto-refresh every 30 seconds
setInterval(async () => {
    await loadRequests();
}, 30000);