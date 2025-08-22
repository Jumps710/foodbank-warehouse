/**
 * LINE/LINE WORKS 通知サービス
 * Notification service for LINE and LINE WORKS
 */

// LINE Messaging API Configuration
const LINE_CONFIG = {
  CHANNEL_ACCESS_TOKEN: 'YOUR_LINE_CHANNEL_ACCESS_TOKEN',
  MESSAGING_API_URL: 'https://api.line.me/v2/bot/message/push'
};

// LINE WORKS API Configuration  
const LINE_WORKS_CONFIG = {
  API_ID: 'YOUR_LINE_WORKS_API_ID',
  SERVER_API_CONSUMER_KEY: 'YOUR_SERVER_API_CONSUMER_KEY',
  SERVER_LIST_ID: 'YOUR_SERVER_LIST_ID',
  PRIVATE_KEY: 'YOUR_PRIVATE_KEY',
  BOT_NO: 'YOUR_BOT_NUMBER',
  STAFF_ROOM_ID: 'YOUR_STAFF_ROOM_ID',
  DRIVER_ROOM_ID: 'YOUR_DRIVER_ROOM_ID'
};

/**
 * Send notifications based on event type
 */
function sendNotifications(eventType, data) {
  try {
    switch (eventType) {
      case 'request_created':
        sendRequestCreatedNotifications(data);
        break;
      case 'status_updated':
        sendStatusUpdatedNotifications(data);
        break;
      case 'comment_added':
        sendCommentAddedNotifications(data);
        break;
      default:
        console.log('Unknown notification event type:', eventType);
    }
  } catch (error) {
    logError('sendNotifications', error);
  }
}

/**
 * Send notifications when new request is created
 */
function sendRequestCreatedNotifications(data) {
  // Send confirmation to requester via LINE
  sendLineMessage(data.lineUserId, {
    type: 'flex',
    altText: 'フードバンクへ食品リクエストをしました',
    contents: createRequestConfirmationFlex(data)
  });
  
  // Send notification to staff via LINE WORKS
  sendLineWorksMessage(LINE_WORKS_CONFIG.STAFF_ROOM_ID, 
    `${data.requesterName}よりピックアップ日:${data.pickupDate}で食品リクエストがありました。`,
    createRequestDetailsButtons(data.requestId)
  );
  
  // Add to staff calendar
  addToStaffCalendar(data);
}

/**
 * Send notifications when status is updated
 */
function sendStatusUpdatedNotifications(data) {
  if (data.status === 'completed') {
    // Send completion notification to requester
    sendLineMessage(data.lineUserId, {
      type: 'flex',
      altText: '食品のパッキングが完了しました',
      contents: createPackingCompletedFlex(data)
    });
    
    // If delivery, notify drivers
    if (data.pickupType === 'delivery') {
      sendLineWorksMessage(LINE_WORKS_CONFIG.DRIVER_ROOM_ID,
        `${data.requesterName}よりピックアップ日:${data.pickupDate}のパッキングが完了しました。`,
        createDeliveryDetailsButtons(data.requestId)
      );
      
      // Add to driver calendar
      addToDriverCalendar(data);
    }
    
    // Update staff calendar
    updateStaffCalendar(data.requestId, '✅完了');
  }
}

/**
 * Send notifications when comment is added
 */
function sendCommentAddedNotifications(data) {
  sendLineWorksMessage(LINE_WORKS_CONFIG.STAFF_ROOM_ID,
    `${data.requesterName}より追加コメントがありました。`,
    createRequestDetailsButtons(data.requestId)
  );
}

/**
 * Send LINE message
 */
function sendLineMessage(userId, message) {
  try {
    const payload = {
      to: userId,
      messages: [message]
    };
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CONFIG.CHANNEL_ACCESS_TOKEN}`
      },
      payload: JSON.stringify(payload)
    };
    
    const response = UrlFetchApp.fetch(LINE_CONFIG.MESSAGING_API_URL, options);
    
    if (response.getResponseCode() !== 200) {
      throw new Error(`LINE API Error: ${response.getContentText()}`);
    }
    
    logEvent('LINE_MESSAGE', 'sent', `User: ${userId}`);
  } catch (error) {
    logError('sendLineMessage', error);
  }
}

/**
 * Send LINE WORKS message
 */
function sendLineWorksMessage(roomId, text, actions = []) {
  try {
    // LINE WORKS API implementation would go here
    // This is a placeholder for the actual implementation
    
    const message = {
      roomId: roomId,
      content: {
        type: 'text',
        text: text
      }
    };
    
    if (actions.length > 0) {
      message.content.actions = actions;
    }
    
    // For now, just log the message
    logEvent('LINE_WORKS_MESSAGE', 'sent', JSON.stringify(message));
    
    console.log('LINE WORKS message sent:', message);
  } catch (error) {
    logError('sendLineWorksMessage', error);
  }
}

/**
 * Create request confirmation flex message
 */
function createRequestConfirmationFlex(data) {
  return {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: 'リクエスト送信完了',
          weight: 'bold',
          color: '#06c755',
          size: 'lg'
        }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: `リクエストID: ${data.requestId}`,
          size: 'sm',
          color: '#666666'
        },
        {
          type: 'text',
          text: `ピックアップ日: ${data.pickupDate}`,
          size: 'sm',
          color: '#666666'
        },
        {
          type: 'text',
          text: `方法: ${data.pickupType === 'delivery' ? 'WeNeed配送' : 'セルフピックアップ'}`,
          size: 'sm',
          color: '#666666'
        }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: '詳細確認',
            uri: `https://miniapp.line.me/2007977152-VaXgDOXk?requestId=${data.requestId}`
          },
          style: 'primary'
        }
      ]
    }
  };
}

/**
 * Create packing completed flex message
 */
function createPackingCompletedFlex(data) {
  return {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: 'パッキング完了',
          weight: 'bold',
          color: '#06c755',
          size: 'lg'
        }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '食品のパッキングが完了しました。',
          wrap: true
        },
        {
          type: 'text',
          text: '内容を確認してください。',
          wrap: true
        },
        {
          type: 'text',
          text: `リクエストID: ${data.requestId}`,
          size: 'sm',
          color: '#666666'
        }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: '詳細確認',
            uri: `https://miniapp.line.me/2007977152-VaXgDOXk?requestId=${data.requestId}`
          },
          style: 'primary'
        }
      ]
    }
  };
}

/**
 * Create request details buttons
 */
function createRequestDetailsButtons(requestId) {
  return [
    {
      type: 'button',
      text: '詳細確認',
      url: `https://jumps710.github.io/foodbank-warehouse/liff/request-details/?id=${requestId}`
    }
  ];
}

/**
 * Create delivery details buttons
 */
function createDeliveryDetailsButtons(requestId) {
  return [
    {
      type: 'button', 
      text: '配送詳細',
      url: `https://jumps710.github.io/foodbank-warehouse/liff/request-details/?id=${requestId}`
    }
  ];
}

/**
 * Add event to staff calendar
 */
function addToStaffCalendar(data) {
  try {
    // Get default calendar
    const calendar = CalendarApp.getDefaultCalendar();
    
    const startTime = new Date(data.pickupDate + 'T09:00:00');
    const endTime = new Date(data.pickupDate + 'T17:00:00');
    
    const title = `${data.requesterName} ${data.pickupType === 'delivery' ? '配送' : 'ピックアップ'}`;
    const description = `
リクエストID: ${data.requestId}
団体名: ${data.requesterName}
ピックアップタイプ: ${data.pickupType === 'delivery' ? 'WeNeed配送' : 'セルフピックアップ'}
詳細URL: https://jumps710.github.io/foodbank-warehouse/liff/request-details/?id=${data.requestId}
    `.trim();
    
    const event = calendar.createEvent(title, startTime, endTime, {
      description: description,
      location: data.requesterAddress || ''
    });
    
    // Store event ID for future updates
    const sheet = getSheet('calendar_events');
    sheet.appendRow([
      data.requestId,
      event.getId(),
      'staff',
      new Date()
    ]);
    
    logEvent('CALENDAR', 'staff_event_created', data.requestId);
  } catch (error) {
    logError('addToStaffCalendar', error);
  }
}

/**
 * Update staff calendar event
 */
function updateStaffCalendar(requestId, prefix) {
  try {
    const sheet = getSheet('calendar_events');
    const data = sheet.getDataRange().getValues();
    
    // Find event by request ID
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === requestId && data[i][2] === 'staff') {
        const eventId = data[i][1];
        const event = CalendarApp.getEventById(eventId);
        
        if (event) {
          const currentTitle = event.getTitle();
          if (!currentTitle.startsWith(prefix)) {
            event.setTitle(`${prefix} ${currentTitle}`);
            logEvent('CALENDAR', 'staff_event_updated', requestId);
          }
        }
        break;
      }
    }
  } catch (error) {
    logError('updateStaffCalendar', error);
  }
}

/**
 * Add event to driver calendar (Google Calendar)
 */
function addToDriverCalendar(data) {
  try {
    // For driver calendar, we'd typically use a specific calendar
    // This is a placeholder implementation
    
    const calendar = CalendarApp.getDefaultCalendar();
    
    const startTime = new Date(data.pickupDate + 'T10:00:00');
    const endTime = new Date(data.pickupDate + 'T18:00:00');
    
    const title = `配送: ${data.requesterName}`;
    const description = `
配送先: ${data.requesterAddress}
リクエストID: ${data.requestId}
詳細URL: https://jumps710.github.io/foodbank-warehouse/liff/request-details/?id=${data.requestId}
    `.trim();
    
    const event = calendar.createEvent(title, startTime, endTime, {
      description: description,
      location: data.requesterAddress || ''
    });
    
    // Store event ID
    const sheet = getSheet('calendar_events');
    sheet.appendRow([
      data.requestId,
      event.getId(),
      'driver',
      new Date()
    ]);
    
    logEvent('CALENDAR', 'driver_event_created', data.requestId);
  } catch (error) {
    logError('addToDriverCalendar', error);
  }
}

/**
 * Initialize calendar events sheet if needed
 */
function initializeCalendarEventsSheet() {
  try {
    const sheet = getSheet('calendar_events');
    const headers = ['requestId', 'eventId', 'type', 'createdAt'];
    
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  } catch (error) {
    logError('initializeCalendarEventsSheet', error);
  }
}