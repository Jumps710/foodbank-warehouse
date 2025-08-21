// Request Form specific functionality
let requesterData = null;

// Called after LIFF initialization
window.onLiffInit = async function(liffData) {
    console.log('Request Form initialized', liffData);
    
    // Display user info
    if (liffData.profile) {
        document.getElementById('displayName').textContent = liffData.profile.displayName;
        document.getElementById('userInfo').classList.remove('d-none');
        
        // Fetch requester data from kodomo nw database
        await fetchRequesterData(liffData.profile.userId);
    }
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('pickupDate').setAttribute('min', today);
    
    // Hide loading
    document.getElementById('loading').style.display = 'none';
};

// Fetch requester data from kodomo nw database
async function fetchRequesterData(lineUserId) {
    try {
        const response = await fetch(`${window.KODOMO_NW_API_URL}?action=getRequesterByLineId&lineUserId=${lineUserId}`);
        const data = await response.json();
        
        if (data.success && data.requester) {
            requesterData = data.requester;
            document.getElementById('requesterName').value = requesterData.siteName || '';
            document.getElementById('requesterAddress').value = requesterData.address || '';
        } else {
            showAlert('団体情報が見つかりませんでした。管理者にお問い合わせください。', 'warning');
        }
    } catch (error) {
        console.error('Error fetching requester data:', error);
        showAlert('団体情報の取得に失敗しました。', 'danger');
    }
}

// Event type change handler
document.getElementById('eventType').addEventListener('change', function() {
    const eventType = this.value;
    
    // Show/hide relevant sections
    document.getElementById('pantryTypeSection').classList.toggle('d-none', !['pantry', 'both'].includes(eventType));
    document.getElementById('kodomoCountSection').classList.toggle('d-none', !['kodomo', 'both'].includes(eventType));
    document.getElementById('pantryCountSection').classList.toggle('d-none', !['pantry', 'both'].includes(eventType));
    document.getElementById('kodomoRequestSection').classList.toggle('d-none', !['kodomo', 'both'].includes(eventType));
    document.getElementById('pantryRequestSection').classList.toggle('d-none', !['pantry', 'both'].includes(eventType));
    
    // Update required attributes
    if (['pantry', 'both'].includes(eventType)) {
        document.getElementById('pantryType').setAttribute('required', '');
        document.getElementById('pantryCount').setAttribute('required', '');
        document.getElementById('pantryRequest').setAttribute('required', '');
    } else {
        document.getElementById('pantryType').removeAttribute('required');
        document.getElementById('pantryCount').removeAttribute('required');
        document.getElementById('pantryRequest').removeAttribute('required');
    }
    
    if (['kodomo', 'both'].includes(eventType)) {
        document.getElementById('kodomoCount').setAttribute('required', '');
        document.getElementById('kodomoRequest').setAttribute('required', '');
    } else {
        document.getElementById('kodomoCount').removeAttribute('required');
        document.getElementById('kodomoRequest').removeAttribute('required');
    }
});

// Form submission handler
document.getElementById('requestForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!requesterData) {
        showAlert('団体情報が読み込まれていません。', 'danger');
        return;
    }
    
    // Collect form data
    const formData = {
        action: 'createRequest',
        requesterName: document.getElementById('requesterName').value,
        requesterAddress: document.getElementById('requesterAddress').value,
        pickupDate: document.getElementById('pickupDate').value,
        pickupType: document.getElementById('pickupType').value,
        eventType: document.getElementById('eventType').value,
        pantryType: document.getElementById('pantryType').value || '',
        kodomoCount: parseInt(document.getElementById('kodomoCount').value) || 0,
        pantryCount: parseInt(document.getElementById('pantryCount').value) || 0,
        kodomoRequest: document.getElementById('kodomoRequest').value || '',
        pantryRequest: document.getElementById('pantryRequest').value || '',
        comments: document.getElementById('comments').value || '',
        lineUserId: liff.getContext().userId,
        siteId: requesterData.siteId || ''
    };
    
    // Show loading
    document.getElementById('loading').style.display = 'flex';
    
    try {
        const response = await fetch(window.WAREHOUSE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('リクエストを送信しました。', 'success');
            
            // Send LIFF message
            if (liff.isApiAvailable('shareTargetPicker')) {
                await liff.shareTargetPicker([{
                    type: 'text',
                    text: `食品リクエストを送信しました。\nピックアップ日: ${formData.pickupDate}\nリクエストID: ${result.requestId}`
                }]);
            }
            
            // Clear form
            document.getElementById('requestForm').reset();
            
            // Redirect to request table after 2 seconds
            setTimeout(() => {
                window.location.href = '../request-table/';
            }, 2000);
        } else {
            showAlert(result.message || 'リクエストの送信に失敗しました。', 'danger');
        }
    } catch (error) {
        console.error('Error submitting request:', error);
        showAlert('リクエストの送信中にエラーが発生しました。', 'danger');
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
});

// Utility function to show alerts
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.card-body');
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}