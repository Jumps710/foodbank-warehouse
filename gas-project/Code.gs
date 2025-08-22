/**
 * フードバンク倉庫システム - GAS API
 * Google Apps Script for warehouse management system
 */

// Configuration
const WAREHOUSE_SHEET_ID = '1MuHWjCaJE9WU5yAFonbOPVB-QgVJOdlELyJuhG1yxis';
const KODOMO_SHEET_ID = '106UgpPr_aB2XI8U8rDpbWBNsnavqpJkkmF2ujEZqAwY';

// Sheet names
const SHEETS = {
  REQUESTS: 'requests',
  USERS: 'users', 
  LOGS: 'logs'
};

/**
 * Handle GET requests
 */
function doGet(e) {
  try {
    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    
    const params = e.parameter;
    const action = params.action;
    
    logEvent('GET', action, JSON.stringify(params));
    
    switch (action) {
      case 'test':
        return createResponse({ success: true, message: 'Warehouse API is working', timestamp: new Date() }, headers);
        
      case 'getUserRole':
        return createResponse(getUserRole(params.lineUserId), headers);
        
      case 'getRequests':
        return createResponse(getRequests(params), headers);
        
      case 'getRequestDetails':
        return createResponse(getRequestDetails(params.requestId, params.userId), headers);
        
      case 'getDashboardData':
        return createResponse(getDashboardData(params), headers);
        
      case 'getRequesterByLineId':
        return createResponse(getRequesterByLineId(params.lineUserId), headers);
        
      case 'getPhoto':
        return getPhoto(params.photoId);
        
      case 'exportData':
        return exportData(params.type, params);
        
      default:
        return createResponse({ success: false, message: 'Invalid GET action: ' + action }, headers);
    }
  } catch (error) {
    logError('doGet', error);
    return createResponse({ success: false, message: error.toString() }, {});
  }
}

/**
 * Handle POST requests
 */
function doPost(e) {
  try {
    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    logEvent('POST', action, JSON.stringify(data));
    
    switch (action) {
      case 'createRequest':
        return createResponse(createRequest(data), headers);
        
      case 'updateRequestStatus':
        return createResponse(updateRequestStatus(data), headers);
        
      case 'addComment':
        return createResponse(addComment(data), headers);
        
      case 'uploadPhoto':
        return createResponse(uploadPhoto(data), headers);
        
      case 'updateInternalComments':
        return createResponse(updateInternalComments(data), headers);
        
      default:
        return createResponse({ success: false, message: 'Invalid POST action: ' + action }, headers);
    }
  } catch (error) {
    logError('doPost', error);
    return createResponse({ success: false, message: error.toString() }, {});
  }
}

/**
 * Create response with proper headers
 */
function createResponse(data, headers = {}) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(headers);
}

/**
 * Get user role by LINE user ID
 */
function getUserRole(lineUserId) {
  try {
    const sheet = getSheet(SHEETS.USERS);
    const data = sheet.getDataRange().getValues();
    
    // Find user by LINE user ID
    for (let i = 1; i < data.length; i++) {
      if (data[i][3] === lineUserId) { // lineUserId column
        return {
          success: true,
          role: data[i][2], // role column
          displayName: data[i][1] // displayName column
        };
      }
    }
    
    // Default to requester if not found
    return {
      success: true,
      role: 'requester',
      displayName: 'Guest User'
    };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * Get requests based on filters and user role
 */
function getRequests(params) {
  try {
    const sheet = getSheet(SHEETS.REQUESTS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const requests = [];
    
    // Convert data to objects
    for (let i = 1; i < data.length; i++) {
      const request = {};
      headers.forEach((header, index) => {
        request[header] = data[i][index];
      });
      
      // Apply filters based on user role
      if (shouldIncludeRequest(request, params)) {
        requests.push(request);
      }
    }
    
    return {
      success: true,
      requests: requests.sort((a, b) => new Date(a.pickupDate) - new Date(b.pickupDate))
    };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * Check if request should be included based on user role and filters
 */
function shouldIncludeRequest(request, params) {
  const userRole = params.userRole || 'requester';
  const userId = params.userId;
  
  // Role-based filtering
  if (userRole === 'requester') {
    // Requesters can only see their own requests
    if (request.lineUserId !== userId) return false;
  } else if (userRole === 'driver') {
    // Drivers only see completed delivery requests
    if (request.status !== 'completed' || request.pickupType !== 'delivery') return false;
  }
  
  // Date filtering for non-requesters
  if (userRole !== 'requester') {
    const today = new Date().toISOString().split('T')[0];
    if (request.pickupDate < today) return false;
  }
  
  return true;
}

/**
 * Get specific request details
 */
function getRequestDetails(requestId, userId) {
  try {
    const sheet = getSheet(SHEETS.REQUESTS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find request by ID
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === requestId) { // requestId column
        const request = {};
        headers.forEach((header, index) => {
          request[header] = data[i][index];
        });
        
        // Get user role
        const userRoleResult = getUserRole(userId);
        
        return {
          success: true,
          request: request,
          userRole: userRoleResult.role
        };
      }
    }
    
    return { success: false, message: 'Request not found' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * Create new request
 */
function createRequest(data) {
  try {
    const sheet = getSheet(SHEETS.REQUESTS);
    const requestId = generateRequestId();
    
    const newRow = [
      requestId,
      'active',
      data.requesterName,
      data.requesterAddress,
      data.pickupDate,
      data.pickupType,
      data.eventType,
      data.pantryType || '',
      data.kodomoCount || 0,
      data.pantryCount || 0,
      data.kodomoRequest || '',
      data.pantryRequest || '',
      JSON.stringify([]), // comments
      '', // pictures
      '', // internalComments
      new Date(),
      new Date(),
      data.lineUserId,
      data.siteId || ''
    ];
    
    sheet.appendRow(newRow);
    
    // Send notifications
    sendNotifications('request_created', {
      requestId: requestId,
      requesterName: data.requesterName,
      pickupDate: data.pickupDate,
      pickupType: data.pickupType
    });
    
    return {
      success: true,
      requestId: requestId,
      message: 'Request created successfully'
    };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * Update request status
 */
function updateRequestStatus(data) {
  try {
    const sheet = getSheet(SHEETS.REQUESTS);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Find and update request
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.requestId) {
        values[i][1] = data.status; // status column
        values[i][16] = new Date(); // updatedAt column
        
        dataRange.setValues(values);
        
        // Send notifications
        sendNotifications('status_updated', {
          requestId: data.requestId,
          status: data.status,
          requesterName: values[i][2],
          pickupDate: values[i][4],
          pickupType: values[i][5]
        });
        
        return { success: true, message: 'Status updated successfully' };
      }
    }
    
    return { success: false, message: 'Request not found' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * Add comment to request
 */
function addComment(data) {
  try {
    const sheet = getSheet(SHEETS.REQUESTS);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Find request
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.requestId) {
        // Parse existing comments
        const comments = JSON.parse(values[i][12] || '[]');
        
        // Add new comment
        comments.push({
          date: new Date().toISOString(),
          name: data.userName,
          text: data.comment
        });
        
        values[i][12] = JSON.stringify(comments); // comments column
        values[i][16] = new Date(); // updatedAt column
        
        dataRange.setValues(values);
        
        return { success: true, message: 'Comment added successfully' };
      }
    }
    
    return { success: false, message: 'Request not found' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * Upload photo
 */
function uploadPhoto(data) {
  try {
    // Create folder in Google Drive if it doesn't exist
    const folderName = 'FoodbankPhotos';
    let folder = DriveApp.getFoldersByName(folderName);
    if (!folder.hasNext()) {
      folder = DriveApp.createFolder(folderName);
    } else {
      folder = folder.next();
    }
    
    // Decode base64 image
    const base64Data = data.photo.split(',')[1];
    const blob = Utilities.base64Decode(base64Data);
    const fileName = `${data.requestId}_${data.fileName}_${new Date().getTime()}`;
    
    // Save file to Drive
    const file = folder.createFile(Utilities.newBlob(blob, 'image/jpeg', fileName));
    const fileId = file.getId();
    
    // Update request with photo ID
    const sheet = getSheet(SHEETS.REQUESTS);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.requestId) {
        const photos = values[i][13] ? values[i][13].split(',') : [];
        photos.push(fileId);
        values[i][13] = photos.join(','); // pictures column
        values[i][16] = new Date(); // updatedAt column
        
        dataRange.setValues(values);
        break;
      }
    }
    
    return { success: true, photoId: fileId, message: 'Photo uploaded successfully' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * Get photo from Google Drive
 */
function getPhoto(photoId) {
  try {
    const file = DriveApp.getFileById(photoId);
    const blob = file.getBlob();
    
    return ContentService
      .createTextOutput(Utilities.base64Encode(blob.getBytes()))
      .setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    return ContentService
      .createTextOutput('Photo not found')
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * Update internal comments
 */
function updateInternalComments(data) {
  try {
    const sheet = getSheet(SHEETS.REQUESTS);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.requestId) {
        values[i][14] = data.internalComments; // internalComments column
        values[i][16] = new Date(); // updatedAt column
        
        dataRange.setValues(values);
        return { success: true, message: 'Internal comments updated successfully' };
      }
    }
    
    return { success: false, message: 'Request not found' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * Get dashboard data
 */
function getDashboardData(params) {
  try {
    const sheet = getSheet(SHEETS.REQUESTS);
    const data = sheet.getDataRange().getValues();
    
    // Process data for dashboard
    const dashboardData = {
      totalRequests: data.length - 1,
      totalHouseholds: 0,
      activeOrganizations: new Set(),
      requestTrend: [],
      eventTypeDistribution: [],
      topOrganizations: [],
      householdTrend: []
    };
    
    // Calculate metrics
    for (let i = 1; i < data.length; i++) {
      const request = data[i];
      dashboardData.totalHouseholds += (request[8] || 0) + (request[9] || 0); // kodomoCount + pantryCount
      dashboardData.activeOrganizations.add(request[2]); // requesterName
    }
    
    dashboardData.activeOrganizations = dashboardData.activeOrganizations.size;
    
    return {
      success: true,
      data: dashboardData
    };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * Get requester info by LINE ID (from kodomo network)
 */
function getRequesterByLineId(lineUserId) {
  try {
    // This would query the kodomo network sheet
    // For now, return mock data
    return {
      success: true,
      requester: {
        siteName: 'テスト子ども食堂',
        address: '東京都渋谷区テスト1-1-1',
        siteId: 'TEST001'
      }
    };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * Generate unique request ID
 */
function generateRequestId() {
  const now = new Date();
  const dateStr = Utilities.formatDate(now, 'Asia/Tokyo', 'yyMMdd');
  const timeStr = Utilities.formatDate(now, 'Asia/Tokyo', 'HHmmss');
  return `${dateStr}${timeStr}`;
}

/**
 * Get sheet by name, create if doesn't exist
 */
function getSheet(sheetName) {
  const spreadsheet = SpreadsheetApp.openById(WAREHOUSE_SHEET_ID);
  let sheet = spreadsheet.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    initializeSheet(sheet, sheetName);
  }
  
  return sheet;
}

/**
 * Initialize sheet with headers
 */
function initializeSheet(sheet, sheetName) {
  let headers = [];
  
  switch (sheetName) {
    case SHEETS.REQUESTS:
      headers = [
        'requestId', 'status', 'requesterName', 'requesterAddress', 'pickupDate',
        'pickupType', 'eventType', 'pantryType', 'kodomoCount', 'pantryCount',
        'kodomoRequest', 'pantryRequest', 'comments', 'pictures', 'internalComments',
        'createdAt', 'updatedAt', 'lineUserId', 'siteId'
      ];
      break;
    case SHEETS.USERS:
      headers = ['userId', 'displayName', 'role', 'lineUserId', 'siteId'];
      break;
    case SHEETS.LOGS:
      headers = ['timestamp', 'eventType', 'userId', 'details', 'requestId'];
      break;
  }
  
  if (headers.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

/**
 * Log events
 */
function logEvent(method, action, details) {
  try {
    const sheet = getSheet(SHEETS.LOGS);
    sheet.appendRow([
      new Date(),
      `${method}_${action}`,
      'system',
      details,
      ''
    ]);
  } catch (error) {
    console.error('Logging failed:', error);
  }
}

/**
 * Log errors
 */
function logError(method, error) {
  try {
    const sheet = getSheet(SHEETS.LOGS);
    sheet.appendRow([
      new Date(),
      'ERROR',
      method,
      error.toString(),
      ''
    ]);
  } catch (error) {
    console.error('Error logging failed:', error);
  }
}

/**
 * Send notifications (placeholder)
 */
function sendNotifications(eventType, data) {
  // This will be implemented with LINE Messaging API
  logEvent('NOTIFICATION', eventType, JSON.stringify(data));
}

/**
 * Export data as CSV
 */
function exportData(type, params) {
  try {
    let sheet, filename;
    
    switch (type) {
      case 'requests':
        sheet = getSheet(SHEETS.REQUESTS);
        filename = 'foodbank_requests.csv';
        break;
      case 'summary':
        // Create summary data
        return createResponse({ success: false, message: 'Summary export not implemented yet' });
      default:
        return createResponse({ success: false, message: 'Invalid export type' });
    }
    
    const data = sheet.getDataRange().getValues();
    const csv = data.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    return ContentService
      .createTextOutput(csv)
      .setMimeType(ContentService.MimeType.TEXT)
      .downloadAsFile(filename);
  } catch (error) {
    return createResponse({ success: false, message: error.toString() });
  }
}