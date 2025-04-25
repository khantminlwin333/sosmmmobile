/**
 * Backend API Service
 * Handles communication with backend services for sending emergency news reports
 */

// Backend API base URL
const BACKEND_REPORT_URL = 'https://sos-mm.fly.dev/api/reports/sendreportnews';
const BACKEND_SOS_URL = 'https://sos-mm.fly.dev/api/sos/sendsos';
const BACKEND_SOSALERT_URL = 'https://sos-mm.fly.dev/api/noti/notify-sos';

/**
 * Send user-reported emergency news to the backend
 * @param {Object} reportData - The report data to send
 * @returns {Promise<Object>} Response from the server
 */
export const sendNewsReport = async (reportData) => {
  try {
    // Add metadata like timestamp for the report
    const sendData = reportData;

    try {
      // Try to make the actual API call to local backend
      const response = await fetch(BACKEND_REPORT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sendData)
      });

      if (!response.ok) {
        throw new Error(`Reporting service API error: ${response.status}`);
      }

      const result = await response.json();
      return {
        success: true,
        message: 'Report submitted successfully',
        reportId: result.reportId || result._id
      };
    } catch (fetchError) {
      throw fetchError;
    }
  } catch (error) {
    console.log(error)
    throw new Error('Failed to submit report. Please check your connection and try again.');
  }
};
/**
 * Send user-reported emergency news to the backend
 * @param {Object} reportData - The report data to send
 * @returns {Promise<Object>} Response from the server
 */
export const sendSOS = async (sosData) => {
  try {
    // Add metadata like timestamp for the report if needed
    const sendData = sosData;

    // Send SOS data to backend
    const response = await fetch(BACKEND_SOS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sendData)
    });

    if (!response.ok) {
      throw new Error(`SOS service API error: ${response.status}`);
    }

    const [longitude, latitude] = sosData.coordinates.coordinates;
    const notificationBody = `Help ME! I AM TROUBLE! I NEED HELP!\n Location: Lat: ${latitude}, Long: ${longitude}`;
    // Prepare notification data
    const notificationData = {
      title: sosData.message,
      body: notificationBody
    };

    
    const sosNoti = await fetch(BACKEND_SOSALERT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(notificationData)
    });

    if (!sosNoti.ok) {
      throw new Error(`SOS alert notification API error: ${sosNoti.status}`);
    }

    return {
      success: true,
      message: 'SOS submitted successfully',
    };

  } catch (error) {
    console.error(error);
    throw new Error('Failed to submit SOS. Please check your connection and try again.');
  }
};

/**
 * Fetch SOS Messages
 *  * @param {Object} fetchSosMessages - to show SOS Message
 * @returns {Promise<Object>}
 */
export const fetchSosMessages = async () => {
  try {
    const response = await fetch('https://sos-mm.fly.dev/api/sos/showSOS', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Check if the response status is okay (200-299)
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    // Check if the data contains success and count > 0
    if (data.success && data.count > 0) {
      // Map the raw response to the desired format
      const sosMessages = data.data.map((item) => ({
        id: item._id, // Unique identifier for the SOS message
        message: item.message, // The message content (e.g., "HELP ME!")
        status: item.status, // Status of the SOS (ACTIVE/INACTIVE)
        timestamp: item.timestamp, // Timestamp when the message was created
        location: item.coordinates ? {
          latitude: item.coordinates.coordinates[1], // Latitude
          longitude: item.coordinates.coordinates[0], // Longitude
        } : null, // Location data (null if not available)
      }));

      return {
        success: true,
        data: sosMessages, // Transformed data
      };
    } else {
      return {
        success: false,
        error: 'No SOS messages found.',
      };
    }
  } catch (error) {
    console.error('Error fetching SOS messages:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch SOS messages.',
    };
  }
};

export default {
  sendNewsReport, sendSOS,fetchSosMessages
};