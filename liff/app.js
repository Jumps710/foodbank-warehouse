/**
 * Main Application Entry Point
 */

// Global app state
window.appState = {
    currentView: null,
    userProfile: null,
    userRole: null,
    liffData: null
};

// Called after LIFF initialization
window.onLiffInit = async function(liffData) {
    console.log('App initialized with LIFF data', liffData);
    
    // Store LIFF data
    window.appState.liffData = liffData;
    window.appState.userProfile = liffData.profile;
    
    // Initialize router
    initRouter();
    
    // Handle initial route
    handleRoute();
};

/**
 * Initialize router
 */
function initRouter() {
    // Listen for hash changes
    window.addEventListener('hashchange', handleRoute);
    
    // Listen for back/forward buttons
    window.addEventListener('popstate', handleRoute);
}

/**
 * Handle route changes
 */
async function handleRoute() {
    // Show loading
    document.getElementById('loading').style.display = 'flex';
    
    try {
        // Get current route
        const hash = window.location.hash || '#/';
        const [route, queryString] = hash.split('?');
        const params = new URLSearchParams(queryString || '');
        
        console.log('Navigating to:', route, 'Params:', Object.fromEntries(params));
        
        // Clean up previous view
        if (window.appState.currentView && typeof window.appState.currentView.cleanup === 'function') {
            window.appState.currentView.cleanup();
        }
        
        // Route to appropriate view
        switch (route) {
            case '#/':
            case '#/form':
                window.appState.currentView = new RequestFormView();
                break;
                
            case '#/table':
                window.appState.currentView = new RequestTableView();
                break;
                
            case '#/details':
                const requestId = params.get('id');
                if (!requestId) {
                    alert('リクエストIDが指定されていません');
                    window.location.hash = '#/table';
                    return;
                }
                window.appState.currentView = new RequestDetailsView(requestId);
                break;
                
            case '#/dashboard':
                // Check admin permission
                const userRole = await checkUserRole();
                if (userRole !== 'admin') {
                    alert('ダッシュボードへのアクセス権限がありません');
                    window.location.hash = '#/';
                    return;
                }
                window.appState.currentView = new RequestDashboardView();
                break;
                
            default:
                // Default to form
                window.location.hash = '#/form';
                return;
        }
        
        // Initialize the view
        if (window.appState.currentView) {
            await window.appState.currentView.init();
        }
        
    } catch (error) {
        console.error('Error handling route:', error);
        alert('エラーが発生しました。ページを再読み込みしてください。');
    } finally {
        // Hide loading
        document.getElementById('loading').style.display = 'none';
    }
}

/**
 * Check user role
 */
async function checkUserRole() {
    if (window.appState.userRole) {
        return window.appState.userRole;
    }
    
    try {
        const response = await fetch(`${window.WAREHOUSE_API_URL}?action=getUserRole&lineUserId=${window.appState.userProfile.userId}`);
        const data = await response.json();
        
        if (data.success) {
            window.appState.userRole = data.role;
            return data.role;
        }
    } catch (error) {
        console.error('Error checking user role:', error);
    }
    
    return 'requester';
}

/**
 * Navigation helper functions
 */
window.navigateTo = function(route, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    window.location.hash = queryString ? `#${route}?${queryString}` : `#${route}`;
};

window.showAlert = function(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.getElementById('app-container');
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
};