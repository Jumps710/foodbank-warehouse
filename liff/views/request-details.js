/**
 * Request Details View
 */

class RequestDetailsView extends BaseView {
    constructor(requestId) {
        super();
        this.requestId = requestId;
        this.currentRequest = null;
        this.userRole = null;
    }

    async init() {
        this.userRole = await this.getUserRole();
        await this.loadRequestDetails();
        this.render(this.getHTML());
        this.setupEventListeners();
    }

    async loadRequestDetails() {
        try {
            const response = await fetch(`${window.WAREHOUSE_API_URL}?action=getRequestDetails&requestId=${this.requestId}&userId=${window.appState.userProfile.userId}`);
            const data = await response.json();

            if (data.success && data.request) {
                this.currentRequest = data.request;
                this.userRole = data.userRole || this.userRole;
            } else {
                showAlert('リクエストが見つかりません', 'danger');
                navigateTo('/table');
            }
        } catch (error) {
            console.error('Error loading request details:', error);
            showAlert('データの読み込みに失敗しました', 'danger');
        }
    }

    getHTML() {
        if (!this.currentRequest) {
            return '<div class="text-center p-5">データを読み込んでいます...</div>';
        }

        const req = this.currentRequest;
        const isDriver = this.userRole === 'driver';

        return `
        <div class="container mt-3">
            <!-- Back button -->
            <div class="mb-3">
                <button class="btn btn-outline-secondary btn-sm" onclick="navigateTo('/table')">
                    <i class="fas fa-arrow-left"></i> 戻る
                </button>
            </div>

            <!-- Request details card -->
            <div class="card mb-3">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0">
                        <i class="fas fa-file-alt"></i> リクエスト詳細
                        <span class="float-end">${req.requestId || ''}</span>
                    </h5>
                </div>
                <div class="card-body">
                    <!-- Status and actions -->
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <div>${this.getStatusBadge(req.status)}</div>
                        <div id="actionButtons">${this.getActionButtons()}</div>
                    </div>

                    <!-- Basic info -->
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="text-muted small">団体名</label>
                            <p class="mb-2">${req.requesterName || '未設定'}</p>
                        </div>
                        <div class="col-md-6">
                            <label class="text-muted small">団体住所</label>
                            <p class="mb-2">${req.requesterAddress || '未設定'}</p>
                        </div>
                    </div>

                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="text-muted small">ピックアップ予定日</label>
                            <p class="mb-2">${this.formatDate(req.pickupDate)}</p>
                        </div>
                        <div class="col-md-6">
                            <label class="text-muted small">ピックアップタイプ</label>
                            <p class="mb-2">${req.pickupType === 'delivery' ? 'WeNeed配送' : 'セルフピックアップ'}</p>
                        </div>
                    </div>

                    ${!isDriver ? `
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="text-muted small">開催タイプ</label>
                            <p class="mb-2">${this.getEventTypeLabel(req.eventType)}</p>
                        </div>
                        ${req.pantryType ? `
                        <div class="col-md-6">
                            <label class="text-muted small">パントリー目的</label>
                            <p class="mb-2">${req.pantryType === 'foodloss' ? 'フードロス削減' : '生活困窮世帯の支援'}</p>
                        </div>
                        ` : ''}
                    </div>

                    <!-- Household counts -->
                    ${(req.kodomoCount > 0 || req.pantryCount > 0) ? `
                    <div class="row mb-3">
                        ${req.kodomoCount > 0 ? `
                        <div class="col-md-6">
                            <label class="text-muted small">子ども食堂利用世帯数</label>
                            <p class="mb-2">${req.kodomoCount}世帯</p>
                        </div>
                        ` : ''}
                        ${req.pantryCount > 0 ? `
                        <div class="col-md-6">
                            <label class="text-muted small">パントリー利用世帯数</label>
                            <p class="mb-2">${req.pantryCount}世帯</p>
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}

                    <!-- Food requests -->
                    ${req.kodomoRequest ? `
                    <div class="mb-3">
                        <label class="text-muted small">子ども食堂調理用の食品リクエスト</label>
                        <p class="mb-2">${req.kodomoRequest}</p>
                    </div>
                    ` : ''}

                    ${req.pantryRequest ? `
                    <div class="mb-3">
                        <label class="text-muted small">パントリー配布用の食品リクエスト</label>
                        <p class="mb-2">${req.pantryRequest}</p>
                    </div>
                    ` : ''}
                    ` : ''}

                    <!-- Internal comments (staff only) -->
                    ${(this.userRole === 'staff' || this.userRole === 'admin') ? `
                    <div class="mb-3">
                        <label class="text-muted small">業務連絡</label>
                        <div class="border rounded p-2">
                            <p class="mb-2" id="internalComments">${req.internalComments || '（なし）'}</p>
                            <button class="btn btn-sm btn-outline-secondary" onclick="this.editInternalComments()">
                                <i class="fas fa-edit"></i> 編集
                            </button>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>

            ${!isDriver ? `
            <!-- Photos card -->
            <div class="card mb-3">
                <div class="card-header">
                    <h6 class="mb-0">
                        <i class="fas fa-camera"></i> 写真
                    </h6>
                </div>
                <div class="card-body">
                    <div id="photoGallery" class="d-flex flex-wrap mb-3">
                        ${this.getPhotosHTML()}
                    </div>
                    
                    ${req.status === 'active' ? `
                    <div id="photoUploadSection">
                        <div class="photo-upload-area" id="photoUploadArea">
                            <i class="fas fa-cloud-upload-alt fa-2x text-muted mb-2"></i>
                            <p class="mb-0">クリックまたはドラッグして写真をアップロード</p>
                            <input type="file" id="photoInput" accept="image/*" multiple style="display: none;">
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}

            <!-- Comments card -->
            <div class="card mb-3">
                <div class="card-header">
                    <h6 class="mb-0">
                        <i class="fas fa-comments"></i> コメント
                    </h6>
                </div>
                <div class="card-body">
                    <div id="commentThread" class="comment-thread mb-3">
                        ${this.getCommentsHTML()}
                    </div>
                    
                    <!-- Add comment form -->
                    <div class="input-group">
                        <input type="text" class="form-control" id="newComment" placeholder="コメントを入力...">
                        <button class="btn btn-primary" onclick="this.addComment()">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Photo modal -->
        <div class="modal fade" id="photoModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">写真</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center">
                        <img id="modalPhoto" src="" class="img-fluid">
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    getActionButtons() {
        const req = this.currentRequest;
        let buttons = '';

        if ((this.userRole === 'staff' || this.userRole === 'admin') && req.status === 'active') {
            buttons += `
                <button class="btn btn-success btn-sm me-2" onclick="this.updateStatus('completed')">
                    <i class="fas fa-check"></i> 完了
                </button>
                <button class="btn btn-danger btn-sm" onclick="this.updateStatus('cancelled')">
                    <i class="fas fa-times"></i> キャンセル
                </button>
            `;
        }

        if (this.userRole === 'driver' && req.status === 'completed' && req.pickupType === 'delivery') {
            buttons += `
                <button class="btn btn-primary btn-sm" onclick="this.markDelivered()">
                    <i class="fas fa-truck"></i> 配送完了
                </button>
            `;
        }

        return buttons;
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
            kodomo: '子ども食堂の調理用',
            pantry: 'パントリーでの配布用',
            both: '両方'
        };
        return labels[eventType] || '';
    }

    getPhotosHTML() {
        if (!this.currentRequest.pictures) {
            return '<p class="text-muted">写真がありません</p>';
        }

        const photoIds = this.currentRequest.pictures.split(',').filter(id => id.trim());
        if (photoIds.length === 0) {
            return '<p class="text-muted">写真がありません</p>';
        }

        return photoIds.map(photoId => `
            <img src="${window.WAREHOUSE_API_URL}?action=getPhoto&photoId=${photoId}" 
                 class="photo-thumbnail" 
                 onclick="this.showPhotoModal('${photoId}')"
                 onerror="this.style.display='none'">
        `).join('');
    }

    getCommentsHTML() {
        if (!this.currentRequest.comments) {
            return '<p class="text-muted text-center">コメントがありません</p>';
        }

        try {
            const comments = JSON.parse(this.currentRequest.comments);
            if (comments.length === 0) {
                return '<p class="text-muted text-center">コメントがありません</p>';
            }

            return comments.map(comment => `
                <div class="comment-item">
                    <div class="comment-author">${comment.name}</div>
                    <div class="comment-date">${this.formatDateTime(comment.date)}</div>
                    <div class="comment-text">${comment.text}</div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error parsing comments:', error);
            return '<p class="text-muted text-center">コメントの読み込みに失敗しました</p>';
        }
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

    formatDateTime(dateTimeString) {
        if (!dateTimeString) return '日時未設定';
        try {
            const date = new Date(dateTimeString);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}年${month}月${day}日 ${hours}:${minutes}`;
        } catch (error) {
            return '日時エラー';
        }
    }

    setupEventListeners() {
        // Photo upload setup
        const photoUploadArea = document.getElementById('photoUploadArea');
        const photoInput = document.getElementById('photoInput');

        if (photoUploadArea && photoInput) {
            this.setupPhotoUpload(photoUploadArea, photoInput);
        }

        // Comment input enter key
        const commentInput = document.getElementById('newComment');
        if (commentInput) {
            commentInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addComment();
                }
            });
        }

        // Bind methods to window for onclick handlers
        window.requestDetailsView = this;
    }

    setupPhotoUpload(uploadArea, photoInput) {
        uploadArea.onclick = () => photoInput.click();

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
            this.handlePhotoFiles(e.dataTransfer.files);
        };

        photoInput.onchange = (e) => {
            this.handlePhotoFiles(e.target.files);
        };
    }

    async handlePhotoFiles(files) {
        if (files.length === 0) return;

        this.showLoading();

        for (const file of files) {
            if (!file.type.startsWith('image/')) continue;

            try {
                const base64 = await this.fileToBase64(file);

                const response = await fetch(window.WAREHOUSE_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'uploadPhoto',
                        requestId: this.requestId,
                        photo: base64,
                        fileName: file.name,
                        userId: window.appState.userProfile.userId
                    })
                });

                const result = await response.json();

                if (!result.success) {
                    showAlert('写真のアップロードに失敗しました', 'danger');
                }
            } catch (error) {
                console.error('Error uploading photo:', error);
                showAlert('写真のアップロード中にエラーが発生しました', 'danger');
            }
        }

        // Reload to show new photos
        await this.loadRequestDetails();
        location.reload();
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    showPhotoModal(photoId) {
        const modalPhoto = document.getElementById('modalPhoto');
        modalPhoto.src = `${window.WAREHOUSE_API_URL}?action=getPhoto&photoId=${photoId}`;
        new bootstrap.Modal(document.getElementById('photoModal')).show();
    }

    async updateStatus(newStatus) {
        const statusLabel = newStatus === 'completed' ? '完了' : 'キャンセル';
        
        if (!confirm(`ステータスを「${statusLabel}」に変更しますか？`)) {
            return;
        }

        this.showLoading();

        try {
            const response = await fetch(window.WAREHOUSE_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'updateRequestStatus',
                    requestId: this.requestId,
                    status: newStatus,
                    userId: window.appState.userProfile.userId
                })
            });

            const result = await response.json();

            if (result.success) {
                showAlert('ステータスを更新しました', 'success');
                location.reload();
            } else {
                showAlert('更新に失敗しました: ' + result.message, 'danger');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            showAlert('エラーが発生しました', 'danger');
        } finally {
            this.hideLoading();
        }
    }

    async addComment() {
        const commentInput = document.getElementById('newComment');
        const commentText = commentInput.value.trim();

        if (!commentText) return;

        this.showLoading();

        try {
            const response = await fetch(window.WAREHOUSE_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'addComment',
                    requestId: this.requestId,
                    comment: commentText,
                    userId: window.appState.userProfile.userId,
                    userName: window.appState.userProfile.displayName
                })
            });

            const result = await response.json();

            if (result.success) {
                commentInput.value = '';
                await this.loadRequestDetails();
                location.reload();
            } else {
                showAlert('コメントの追加に失敗しました', 'danger');
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            showAlert('エラーが発生しました', 'danger');
        } finally {
            this.hideLoading();
        }
    }

    async editInternalComments() {
        const currentComments = document.getElementById('internalComments').textContent;
        const newComments = prompt('業務連絡を編集:', currentComments === '（なし）' ? '' : currentComments);

        if (newComments === null) return;

        this.showLoading();

        try {
            const response = await fetch(window.WAREHOUSE_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'updateInternalComments',
                    requestId: this.requestId,
                    internalComments: newComments,
                    userId: window.appState.userProfile.userId
                })
            });

            const result = await response.json();

            if (result.success) {
                document.getElementById('internalComments').textContent = newComments || '（なし）';
                showAlert('業務連絡を更新しました', 'success');
            } else {
                showAlert('更新に失敗しました', 'danger');
            }
        } catch (error) {
            console.error('Error updating internal comments:', error);
            showAlert('エラーが発生しました', 'danger');
        } finally {
            this.hideLoading();
        }
    }

    cleanup() {
        // Clean up global references
        if (window.requestDetailsView === this) {
            delete window.requestDetailsView;
        }
    }
}