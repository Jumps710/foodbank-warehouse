// LIFF initialization and common utilities

// API URLs (to be replaced with actual URLs)
window.WAREHOUSE_API_URL = 'https://script.google.com/macros/s/AKfycby3cljD8FT5yBB2VM4Q2pw7Za8OfT6L5m67dtdVfUjnhedNBDK384E3GNBp1XzQFK1g/exec';
window.KODOMO_NW_API_URL = 'https://script.google.com/macros/s/AKfycbwyDc0GFNBChfjsbiAP9HLmWTWELhUPUOcsbV1iQZagEbUf-wHm1dLYJdx2XTkWLT8E8Q/exec';

// LIFF IDs (set after registration)
const LIFF_IDS = {
    requestForm: '2007977152-VaXgDOXk',
    requestTable: '', // To be set
    requestDetails: '', // To be set
    requestDashboard: '' // To be set
};

// Get current LIFF ID based on pathname
function getCurrentLiffId() {
    const pathname = window.location.pathname;
    if (pathname.includes('request-form')) return LIFF_IDS.requestForm;
    if (pathname.includes('request-table')) return LIFF_IDS.requestTable;
    if (pathname.includes('request-details')) return LIFF_IDS.requestDetails;
    if (pathname.includes('request-dashboard')) return LIFF_IDS.requestDashboard;
    return '';
}

// Initialize LIFF
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Show loading
        if (document.getElementById('loading')) {
            document.getElementById('loading').style.display = 'flex';
        }
        
        // Initialize LIFF
        const liffId = getCurrentLiffId();
        if (liffId) {
            await liff.init({ liffId: liffId });
            
            // Check if user is logged in
            if (!liff.isLoggedIn()) {
                liff.login();
                return;
            }
            
            // Get user profile
            const profile = await liff.getProfile();
            const context = liff.getContext();
            
            // Pass data to app-specific initialization
            if (typeof window.onLiffInit === 'function') {
                window.onLiffInit({
                    profile: profile,
                    context: context,
                    isInClient: liff.isInClient(),
                    language: liff.getLanguage(),
                    version: liff.getVersion()
                });
            }
        } else {
            console.warn('LIFF ID not set for this app. Running in development mode.');
            // Development mode - call onLiffInit with mock data
            if (typeof window.onLiffInit === 'function') {
                window.onLiffInit({
                    profile: {
                        userId: 'test-user-id',
                        displayName: 'テストユーザー',
                        pictureUrl: ''
                    },
                    context: {
                        type: 'utou',
                        userId: 'test-user-id',
                        viewType: 'full'
                    },
                    isInClient: false,
                    language: 'ja',
                    version: '2.0.0'
                });
            }
        }
    } catch (error) {
        console.error('LIFF initialization failed:', error);
        if (document.getElementById('loading')) {
            document.getElementById('loading').style.display = 'none';
        }
        alert('LIFFの初期化に失敗しました。ページを再読み込みしてください。');
    }
});

// Common utility functions
window.liffUtils = {
    // Send message
    sendMessage: async function(message) {
        try {
            if (liff.isInClient()) {
                await liff.sendMessages([{
                    type: 'text',
                    text: message
                }]);
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    },
    
    // Close LIFF window
    closeWindow: function() {
        if (liff.isInClient()) {
            liff.closeWindow();
        } else {
            window.close();
        }
    },
    
    // Open external URL
    openExternal: function(url) {
        if (liff.isInClient()) {
            liff.openWindow({
                url: url,
                external: true
            });
        } else {
            window.open(url, '_blank');
        }
    },
    
    // Get access token
    getAccessToken: function() {
        try {
            return liff.getAccessToken();
        } catch (error) {
            console.error('Error getting access token:', error);
            return null;
        }
    },
    
    // Format date
    formatDate: function(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}年${month}月${day}日`;
    },
    
    // Format datetime
    formatDateTime: function(dateTimeString) {
        const date = new Date(dateTimeString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}年${month}月${day}日 ${hours}:${minutes}`;
    }
};