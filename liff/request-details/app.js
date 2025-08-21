// Request Details specific functionality
let currentRequest = null;
let userRole = null;
let currentUserId = null;
let currentUserName = null;

// Called after LIFF initialization
window.onLiffInit = async function(liffData) {
    console.log('Request Details initialized', liffData);
    
    currentUserId = liffData.profile.userId;
    currentUserName = liffData.profile.displayName;
    
    // Get request ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const requestId = urlParams.get('id');
    
    if (!requestId) {
        alert('リクエストIDが指定されていません');
        history.back();
        return;
    }
    
    // Load request details
    await loadRequestDetails(requestId);
    
    // Hide loading
    document.getElementById('loading').style.display = 'none';
};

// Load request details
async function loadRequestDetails(requestId) {
    try {
        const response = await fetch(`${window.WAREHOUSE_API_URL}?action=getRequestDetails&requestId=${requestId}&userId=${currentUserId}`);
        const data = await response.json();
        
        if (data.success && data.request) {
            currentRequest = data.request;
            userRole = data.userRole || 'requester';
            displayRequestDetails();
            setupPermissions();
        } else {
            alert('リクエストが見つかりません');
            history.back();
        }
    } catch (error) {
        console.error('Error loading request details:', error);
        alert('データの読み込みに失敗しました');
    }
}

// Display request details
function displayRequestDetails() {
    // Basic info
    document.getElementById('requestId').textContent = currentRequest.requestId;
    document.getElementById('statusBadge').innerHTML = getStatusBadge(currentRequest.status);
    document.getElementById('requesterName').textContent = currentRequest.requesterName;
    document.getElementById('requesterAddress').textContent = currentRequest.requesterAddress;
    document.getElementById('pickupDate').textContent = window.liffUtils.formatDate(currentRequest.pickupDate);
    document.getElementById('pickupType').textContent = 
        currentRequest.pickupType === 'delivery' ? 'WeNeed配送' : 'セルフピックアップ';
    
    // Event type
    const eventTypeLabels = {
        kodomo: '子ども食堂の調理用',
        pantry: 'パントリーでの配布用',
        both: '両方'
    };
    document.getElementById('eventType').textContent = eventTypeLabels[currentRequest.eventType] || '';
    
    // Pantry type
    if (currentRequest.pantryType) {
        document.getElementById('pantryType').textContent = 
            currentRequest.pantryType === 'foodloss' ? 'フードロス削減' : '生活困窮世帯の支援';
    } else {
        document.getElementById('pantryTypeSection').style.display = 'none';
    }
    
    // Household counts
    if (currentRequest.kodomoCount > 0) {
        document.getElementById('kodomoCount').textContent = currentRequest.kodomoCount + '世帯';
    } else {
        document.getElementById('kodomoCountSection').style.display = 'none';
    }
    
    if (currentRequest.pantryCount > 0) {
        document.getElementById('pantryCount').textContent = currentRequest.pantryCount + '世帯';
    } else {
        document.getElementById('pantryCountSection').style.display = 'none';
    }
    
    // Food requests
    if (currentRequest.kodomoRequest) {
        document.getElementById('kodomoRequest').textContent = currentRequest.kodomoRequest;
    } else {
        document.getElementById('kodomoRequestSection').style.display = 'none';
    }
    
    if (currentRequest.pantryRequest) {
        document.getElementById('pantryRequest').textContent = currentRequest.pantryRequest;
    } else {
        document.getElementById('pantryRequestSection').style.display = 'none';
    }
    
    // Internal comments (staff/admin only)
    if (userRole === 'staff' || userRole === 'admin') {
        document.getElementById('internalCommentsSection').style.display = 'block';
        document.getElementById('internalComments').textContent = currentRequest.internalComments || '（なし）';
    }
    
    // Display photos
    displayPhotos();
    
    // Display comments
    displayComments();
}

// Setup permissions based on user role
function setupPermissions() {
    const actionButtons = document.getElementById('actionButtons');
    
    // Staff/Admin can change status
    if ((userRole === 'staff' || userRole === 'admin') && currentRequest.status === 'active') {
        actionButtons.innerHTML = `
            <button class="btn btn-success btn-sm" onclick="updateStatus('completed')">
                <i class="fas fa-check"></i> 完了にする
            </button>
            <button class="btn btn-danger btn-sm ms-2" onclick="updateStatus('cancelled')">
                <i class="fas fa-times"></i> キャンセル
            </button>
        `;
    }
    
    // Driver view restrictions
    if (userRole === 'driver') {
        // Hide unnecessary sections
        document.getElementById('kodomoRequestSection').style.display = 'none';
        document.getElementById('pantryRequestSection').style.display = 'none';
        document.getElementById('householdSection').style.display = 'none';
        document.getElementById('internalCommentsSection').style.display = 'none';
        
        // Show only delivery completed button
        if (currentRequest.status === 'completed' && currentRequest.pickupType === 'delivery') {
            actionButtons.innerHTML = `
                <button class="btn btn-primary btn-sm" onclick="markDelivered()">
                    <i class="fas fa-truck"></i> 配送完了
                </button>
            `;
        }
    }
    
    // Photo upload permissions
    if (userRole !== 'driver' && currentRequest.status === 'active') {
        document.getElementById('photoUploadSection').style.display = 'block';
        setupPhotoUpload();
    }
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

// Update request status
async function updateStatus(newStatus) {
    if (!confirm(`ステータスを「${newStatus === 'completed' ? '完了' : 'キャンセル'}」に変更しますか？`)) {
        return;
    }
    
    document.getElementById('loading').style.display = 'flex';
    
    try {
        const response = await fetch(window.WAREHOUSE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'updateRequestStatus',
                requestId: currentRequest.requestId,
                status: newStatus,
                userId: currentUserId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('ステータスを更新しました');
            location.reload();
        } else {
            alert('更新に失敗しました: ' + result.message);
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert('エラーが発生しました');
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

// Display photos
function displayPhotos() {
    const photoGallery = document.getElementById('photoGallery');
    photoGallery.innerHTML = '';
    
    if (currentRequest.pictures && currentRequest.pictures.length > 0) {
        currentRequest.pictures.forEach((photoId, index) => {
            const img = document.createElement('img');
            img.src = `${window.WAREHOUSE_API_URL}?action=getPhoto&photoId=${photoId}`;
            img.className = 'photo-thumbnail';
            img.style.cursor = 'pointer';
            img.onclick = () => showPhotoModal(img.src);
            photoGallery.appendChild(img);
        });
    } else {
        photoGallery.innerHTML = '<p class="text-muted">写真がありません</p>';
    }
}

// Show photo modal
function showPhotoModal(src) {
    document.getElementById('modalPhoto').src = src;
    new bootstrap.Modal(document.getElementById('photoModal')).show();
}

// Setup photo upload
function setupPhotoUpload() {
    const uploadArea = document.getElementById('photoUploadArea');
    const photoInput = document.getElementById('photoInput');
    
    uploadArea.onclick = () => photoInput.click();
    
    // Drag and drop
    uploadArea.ondragover = (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    };
    
    uploadArea.ondragleave = () => {
        uploadArea.classList.remove('dragover');
    };
    
    uploadArea.ondrop = (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handlePhotoFiles(e.dataTransfer.files);
    };
    
    photoInput.onchange = (e) => {
        handlePhotoFiles(e.target.files);
    };
}

// Handle photo file upload
async function handlePhotoFiles(files) {
    if (files.length === 0) return;
    
    document.getElementById('loading').style.display = 'flex';
    
    for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        
        try {
            // Convert to base64
            const base64 = await fileToBase64(file);
            
            // Upload photo
            const response = await fetch(window.WAREHOUSE_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'uploadPhoto',
                    requestId: currentRequest.requestId,
                    photo: base64,
                    fileName: file.name,
                    userId: currentUserId
                })
            });
            
            const result = await response.json();
            
            if (!result.success) {
                alert('写真のアップロードに失敗しました');
            }
        } catch (error) {
            console.error('Error uploading photo:', error);
        }
    }
    
    // Reload to show new photos
    await loadRequestDetails(currentRequest.requestId);
    document.getElementById('loading').style.display = 'none';
}

// Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Display comments
function displayComments() {
    const commentThread = document.getElementById('commentThread');
    commentThread.innerHTML = '';
    
    if (currentRequest.comments && currentRequest.comments.length > 0) {
        // Parse comments JSON
        try {
            const comments = JSON.parse(currentRequest.comments);
            comments.forEach(comment => {
                const commentItem = document.createElement('div');
                commentItem.className = 'comment-item';
                commentItem.innerHTML = `
                    <div class="comment-author">${comment.name}</div>
                    <div class="comment-date">${window.liffUtils.formatDateTime(comment.date)}</div>
                    <div class="comment-text">${comment.text}</div>
                `;
                commentThread.appendChild(commentItem);
            });
        } catch (error) {
            console.error('Error parsing comments:', error);
        }
    } else {
        commentThread.innerHTML = '<p class="text-muted text-center">コメントがありません</p>';
    }
}

// Add comment
async function addComment() {
    const commentInput = document.getElementById('newComment');
    const commentText = commentInput.value.trim();
    
    if (!commentText) return;
    
    document.getElementById('loading').style.display = 'flex';
    
    try {
        const response = await fetch(window.WAREHOUSE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'addComment',
                requestId: currentRequest.requestId,
                comment: commentText,
                userId: currentUserId,
                userName: currentUserName
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            commentInput.value = '';
            await loadRequestDetails(currentRequest.requestId);
        } else {
            alert('コメントの追加に失敗しました');
        }
    } catch (error) {
        console.error('Error adding comment:', error);
        alert('エラーが発生しました');
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

// Edit internal comments
async function editInternalComments() {
    const currentComments = document.getElementById('internalComments').textContent;
    const newComments = prompt('業務連絡を編集:', currentComments === '（なし）' ? '' : currentComments);
    
    if (newComments === null) return;
    
    document.getElementById('loading').style.display = 'flex';
    
    try {
        const response = await fetch(window.WAREHOUSE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'updateInternalComments',
                requestId: currentRequest.requestId,
                internalComments: newComments,
                userId: currentUserId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('internalComments').textContent = newComments || '（なし）';
        } else {
            alert('更新に失敗しました');
        }
    } catch (error) {
        console.error('Error updating internal comments:', error);
        alert('エラーが発生しました');
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}