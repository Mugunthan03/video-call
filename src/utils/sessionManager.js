// Generate unique session ID
export const generateUniqueId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Get or create session info
export const getSessionInfo = () => {
  const stored = localStorage.getItem('videoConsultSession');
  
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Invalid stored data, create new
    }
  }
  
  const sessionInfo = {
    userId: generateUniqueId(),
    sessionId: generateUniqueId(),
    timestamp: Date.now()
  };
  
  localStorage.setItem('videoConsultSession', JSON.stringify(sessionInfo));
  return sessionInfo;
};

// Get channel from URL or generate default
export const getChannelInfo = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('room') || urlParams.get('channel') || urlParams.get('id');
  
  if (roomId) {
    return {
      channel: `consult_${roomId}`,
      isCustomRoom: true,
      roomId: roomId
    };
  }
  
  return {
    channel: 'consult_default_room',
    isCustomRoom: false,
    roomId: 'default'
  };
};

// Check if user is already connected in another tab
export const checkExistingConnection = () => {
  const tabId = sessionStorage.getItem('videoTabId');
  if (!tabId) {
    // First time in this tab, mark it
    sessionStorage.setItem('videoTabId', generateUniqueId());
    return false;
  }
  return true;
};

// Generate token-compatible UID (numeric)
export const generateNumericUid = () => {
  return Math.floor(Math.random() * 1000000);
};