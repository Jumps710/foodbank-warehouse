/**
 * Request Form View
 */

class RequestFormView extends BaseView {
    constructor() {
        super();
        this.requesterData = null;
    }

    async init() {
        this.render(this.getHTML());
        await this.loadRequesterData();
        this.setupEventListeners();
        this.setupFormValidation();
    }

    getHTML() {
        return `
        <div class="container mt-3">
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0">
                        <i class="fas fa-box"></i> 食品リクエストフォーム
                    </h5>
                </div>
                <div class="card-body">
                    <!-- User info -->
                    <div id="userInfo" class="alert alert-info d-none">
                        <small>ログインユーザー: <span id="displayName">${window.appState.userProfile?.displayName || ''}</span></small>
                    </div>

                    <!-- Request form -->
                    <form id="requestForm">
                        <!-- Requester info -->
                        <div class="mb-3">
                            <label class="form-label">団体名</label>
                            <input type="text" class="form-control" id="requesterName" readonly>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">団体住所</label>
                            <input type="text" class="form-control" id="requesterAddress" readonly>
                        </div>

                        <!-- Pickup info -->
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label">ピックアップ予定日 <span class="text-danger">*</span></label>
                                <input type="date" class="form-control" id="pickupDate" required>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label">ピックアップタイプ <span class="text-danger">*</span></label>
                                <select class="form-select" id="pickupType" required>
                                    <option value="">選択してください</option>
                                    <option value="self">セルフピックアップ</option>
                                    <option value="delivery">WeNeed配送</option>
                                </select>
                            </div>
                        </div>

                        <!-- Event type -->
                        <div class="mb-3">
                            <label class="form-label">開催タイプ <span class="text-danger">*</span></label>
                            <select class="form-select" id="eventType" required>
                                <option value="">選択してください</option>
                                <option value="kodomo">子ども食堂の調理用</option>
                                <option value="pantry">パントリーでの配布用</option>
                                <option value="both">両方</option>
                            </select>
                        </div>

                        <!-- Conditional sections -->
                        <div class="mb-3 d-none" id="pantryTypeSection">
                            <label class="form-label">パントリー目的</label>
                            <select class="form-select" id="pantryType">
                                <option value="">選択してください</option>
                                <option value="foodloss">フードロス削減</option>
                                <option value="support">生活困窮世帯の支援</option>
                            </select>
                        </div>

                        <div class="row">
                            <div class="col-md-6 mb-3 d-none" id="kodomoCountSection">
                                <label class="form-label">子ども食堂利用世帯数</label>
                                <input type="number" class="form-control" id="kodomoCount" min="0">
                            </div>
                            <div class="col-md-6 mb-3 d-none" id="pantryCountSection">
                                <label class="form-label">パントリー利用世帯数</label>
                                <input type="number" class="form-control" id="pantryCount" min="0">
                            </div>
                        </div>

                        <div class="mb-3 d-none" id="kodomoRequestSection">
                            <label class="form-label">子ども食堂調理用の食品リクエスト</label>
                            <textarea class="form-control" id="kodomoRequest" rows="3" placeholder="必要な食品をご記入ください"></textarea>
                        </div>

                        <div class="mb-3 d-none" id="pantryRequestSection">
                            <label class="form-label">パントリー配布用の食品リクエスト</label>
                            <textarea class="form-control" id="pantryRequest" rows="3" placeholder="必要な食品をご記入ください"></textarea>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">コメント</label>
                            <textarea class="form-control" id="comments" rows="2" placeholder="その他連絡事項があればご記入ください"></textarea>
                        </div>

                        <!-- Navigation buttons -->
                        <div class="row">
                            <div class="col-md-6 mb-2">
                                <button type="button" class="btn btn-outline-secondary w-100" onclick="navigateTo('/table')">
                                    <i class="fas fa-list"></i> リクエスト一覧
                                </button>
                            </div>
                            <div class="col-md-6 mb-2">
                                <button type="submit" class="btn btn-primary w-100">
                                    <i class="fas fa-paper-plane"></i> リクエストを送信
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        `;
    }

    async loadRequesterData() {
        try {
            const response = await fetch(`${window.KODOMO_NW_API_URL}?action=getRequesterByLineId&lineUserId=${window.appState.userProfile.userId}`);
            const data = await response.json();
            
            if (data.success && data.requester) {
                this.requesterData = data.requester;
                document.getElementById('requesterName').value = this.requesterData.siteName || '';
                document.getElementById('requesterAddress').value = this.requesterData.address || '';
                document.getElementById('userInfo').classList.remove('d-none');
            } else {
                showAlert('団体情報が見つかりませんでした。管理者にお問い合わせください。', 'warning');
            }
        } catch (error) {
            console.error('Error fetching requester data:', error);
            showAlert('団体情報の取得に失敗しました。', 'danger');
        }
    }

    setupEventListeners() {
        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('pickupDate').setAttribute('min', today);

        // Event type change handler
        document.getElementById('eventType').addEventListener('change', (e) => {
            this.handleEventTypeChange(e.target.value);
        });

        // Form submission
        document.getElementById('requestForm').addEventListener('submit', (e) => {
            this.handleFormSubmit(e);
        });
    }

    handleEventTypeChange(eventType) {
        const sections = {
            pantryTypeSection: ['pantry', 'both'].includes(eventType),
            kodomoCountSection: ['kodomo', 'both'].includes(eventType),
            pantryCountSection: ['pantry', 'both'].includes(eventType),
            kodomoRequestSection: ['kodomo', 'both'].includes(eventType),
            pantryRequestSection: ['pantry', 'both'].includes(eventType)
        };

        Object.entries(sections).forEach(([sectionId, show]) => {
            document.getElementById(sectionId).classList.toggle('d-none', !show);
        });

        // Update required attributes
        const requiredFields = {
            pantryType: ['pantry', 'both'].includes(eventType),
            pantryCount: ['pantry', 'both'].includes(eventType),
            pantryRequest: ['pantry', 'both'].includes(eventType),
            kodomoCount: ['kodomo', 'both'].includes(eventType),
            kodomoRequest: ['kodomo', 'both'].includes(eventType)
        };

        Object.entries(requiredFields).forEach(([fieldId, required]) => {
            const field = document.getElementById(fieldId);
            if (required) {
                field.setAttribute('required', '');
            } else {
                field.removeAttribute('required');
            }
        });
    }

    setupFormValidation() {
        const form = document.getElementById('requestForm');
        form.addEventListener('input', () => {
            this.validateForm();
        });
    }

    validateForm() {
        const form = document.getElementById('requestForm');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Check if all required fields are filled
        const requiredFields = form.querySelectorAll('[required]');
        const isValid = Array.from(requiredFields).every(field => field.value.trim() !== '');
        
        submitBtn.disabled = !isValid;
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        if (!this.requesterData) {
            showAlert('団体情報が読み込まれていません。', 'danger');
            return;
        }

        this.showLoading();

        try {
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
                lineUserId: window.appState.userProfile.userId,
                siteId: this.requesterData.siteId || ''
            };

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
                
                // Send LIFF message if available
                if (window.appState.liffData.isInClient && liff.isApiAvailable('shareTargetPicker')) {
                    await liff.shareTargetPicker([{
                        type: 'text',
                        text: `食品リクエストを送信しました。\\nピックアップ日: ${formData.pickupDate}\\nリクエストID: ${result.requestId}`
                    }]);
                }

                // Clear form
                document.getElementById('requestForm').reset();
                
                // Navigate to details page
                setTimeout(() => {
                    navigateTo('/details', { id: result.requestId });
                }, 2000);
            } else {
                showAlert(result.message || 'リクエストの送信に失敗しました。', 'danger');
            }
        } catch (error) {
            console.error('Error submitting request:', error);
            showAlert('リクエストの送信中にエラーが発生しました。', 'danger');
        } finally {
            this.hideLoading();
        }
    }

    cleanup() {
        // Remove event listeners if needed
    }
}