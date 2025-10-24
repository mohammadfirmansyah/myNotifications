// App.js
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  Platform 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const App = () => {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(null);
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Register for push notifications and get token
    registerForPushNotificationsAsync()
      .then(token => {
        console.log('Push Token:', token);
        setExpoPushToken(token);
      })
      .catch(error => {
        console.error('Error getting token:', error);
        setErrorMsg(error.message);
      });

    // Listener for notifications received while app is foregrounded
    const notificationListener = Notifications.addNotificationReceivedListener(
      notification => {
        console.log('Notification received in foreground:', notification);
        setNotification(notification);
        
        // Add to notification history with timestamp
        addToHistory(notification);
      }
    );

    // Listener for when user taps on notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      response => {
        console.log('Notification tapped:', response);
        const notification = response.notification;
        setNotification(notification);
        
        // Add to history if not already there
        addToHistory(notification);
      }
    );

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  // Add notification to history
  const addToHistory = (notification) => {
    const newNotification = {
      id: notification.request.identifier,
      title: notification.request.content.title || 'No Title',
      body: notification.request.content.body || 'No Body',
      data: notification.request.content.data || {},
      timestamp: new Date().toLocaleString(),
      rawNotification: notification,
    };
    
    setNotificationHistory(prev => [newNotification, ...prev.slice(0, 9)]); // Keep last 10
  };

  // Clear notification history
  const clearHistory = () => {
    setNotificationHistory([]);
    setNotification(null);
    Alert.alert('Success', 'Notification history cleared');
  };

  // Register device for push notifications and get Expo Push Token
  async function registerForPushNotificationsAsync() {
    let token;

    // Push notifications require a physical device
    if (!Device.isDevice) {
      throw new Error('Push notifications are not available on emulators. Please use a physical device.');
    }

    // Check and request notification permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      throw new Error('Permission not granted for push notifications!');
    }

    // Get the Expo Push Token
    // This token can be used with Firebase Cloud Messaging
    token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId ?? 
                   Constants.easConfig?.projectId,
      })
    ).data;

    // Configure Android notification channel (required for Android 8+)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  }

  // Copy token to clipboard for Firebase Console testing
  const copyTokenToClipboard = async () => {
    if (expoPushToken) {
      await Clipboard.setStringAsync(expoPushToken);
      Alert.alert(
        'Success', 
        'Token copied to clipboard!\n\nYou can now paste it in Firebase Console.'
      );
    } else {
      Alert.alert('Error', 'No token available to copy');
    }
  };

  // Send a test local notification
  const sendTestNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Test Notification 📬",
        body: 'This is a local test notification!',
        data: { testData: 'Test notification data' },
      },
      trigger: { seconds: 2 },
    });
    Alert.alert('Scheduled', 'Test notification will appear in 2 seconds');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>🔔 Push Notification Test</Text>
        <Text style={styles.subtitle}>
          Firebase Cloud Messaging with Expo
        </Text>

        {/* Status Section */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Device Type:</Text>
          <Text style={styles.statusText}>
            {Device.isDevice ? '� Physical Device' : '🖥️ Emulator (Not Supported)'}
          </Text>
          
          {!Device.isDevice && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ Push notifications require a physical device.
                {'\n'}Please install this app on your phone to get a real token.
              </Text>
            </View>
          )}
          
          <Text style={styles.statusLabel}>Notification Status:</Text>
          <Text style={styles.statusText}>
            {expoPushToken ? '✅ Ready to receive push notifications' : 
             errorMsg ? '❌ ' + errorMsg : '⏳ Initializing...'}
          </Text>
        </View>

        {/* Token Display Section */}
        {expoPushToken ? (
          <View style={styles.tokenContainer}>
            <Text style={styles.label}>
              Your Push Token (for Firebase Console):
            </Text>
            <ScrollView 
              style={styles.tokenScrollView}
              nestedScrollEnabled={true}
            >
              <Text style={styles.tokenText} selectable>
                {expoPushToken}
              </Text>
            </ScrollView>
            
            <TouchableOpacity 
              style={[styles.button, styles.copyButton]} 
              onPress={copyTokenToClipboard}
            >
              <Text style={styles.buttonText}>
                📋 Copy Token to Clipboard
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.hint}>
              💡 Use this token in Firebase Console → 
              Cloud Messaging → "Send test message"
            </Text>
          </View>
        ) : !Device.isDevice ? (
          <View style={styles.emulatorInfoContainer}>
            <Text style={styles.emulatorInfoTitle}>
              📱 Physical Device Required
            </Text>
            <Text style={styles.emulatorInfoText}>
              Push notification tokens cannot be generated on emulators.
              {'\n\n'}
              To get a real token and test Firebase Cloud Messaging:
              {'\n'}1. Install this app on your physical Android device
              {'\n'}2. Open the app and allow notification permissions
              {'\n'}3. Copy the token that appears
              {'\n'}4. Use it in Firebase Console for testing
            </Text>
          </View>
        ) : null}

        {/* Test Button Section */}
        <View style={styles.actionContainer}>
          <Text style={styles.sectionTitle}>Test Notifications</Text>
          
          <TouchableOpacity 
            style={[styles.button, styles.testButton]} 
            onPress={sendTestNotification}
          >
            <Text style={styles.buttonText}>
              🧪 Send Local Test Notification
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.infoText}>
            {Device.isDevice ? (
              'Local notifications work on both emulators and physical devices.\n\n' +
              'To test Firebase Cloud Messaging:\n' +
              '1. Copy your token above\n' +
              '2. Open Firebase Console\n' +
              '3. Go to Cloud Messaging → Send test message\n' +
              '4. Paste the token and send the notification'
            ) : (
              'Local notifications can be tested on emulators.\n\n' +
              'However, Firebase Cloud Messaging requires a physical device.\n' +
              'Install the app on your phone to test FCM push notifications.'
            )}
          </Text>
        </View>

        {/* Last Notification Section */}
        {notification && (
          <View style={styles.notificationDetailContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📬 Latest Notification</Text>
              <TouchableOpacity 
                style={styles.viewDetailsButton}
                onPress={() => {
                  Alert.alert(
                    'Full Notification Data',
                    JSON.stringify(notification.request.content, null, 2),
                    [{ text: 'OK' }]
                  );
                }}
              >
                <Text style={styles.viewDetailsButtonText}>View Full JSON</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.notificationDetail}>
              <Text style={styles.detailLabel}>Title:</Text>
              <Text style={styles.detailValue}>
                {notification.request.content.title || 'N/A'}
              </Text>
            </View>
            
            <View style={styles.notificationDetail}>
              <Text style={styles.detailLabel}>Body:</Text>
              <Text style={styles.detailValue}>
                {notification.request.content.body || 'N/A'}
              </Text>
            </View>
            
            <View style={styles.notificationDetail}>
              <Text style={styles.detailLabel}>Notification ID:</Text>
              <Text style={styles.detailValue}>
                {notification.request.identifier}
              </Text>
            </View>
            
            {notification.request.content.data && 
             Object.keys(notification.request.content.data).length > 0 && (
              <View style={styles.notificationDetail}>
                <Text style={styles.detailLabel}>Custom Data:</Text>
                <ScrollView 
                  style={styles.dataScrollView}
                  nestedScrollEnabled={true}
                >
                  <Text style={styles.dataText} selectable>
                    {JSON.stringify(notification.request.content.data, null, 2)}
                  </Text>
                </ScrollView>
              </View>
            )}
            
            {notification.request.content.badge && (
              <View style={styles.notificationDetail}>
                <Text style={styles.detailLabel}>Badge Count:</Text>
                <Text style={styles.detailValue}>
                  {notification.request.content.badge}
                </Text>
              </View>
            )}
            
            {notification.request.content.sound && (
              <View style={styles.notificationDetail}>
                <Text style={styles.detailLabel}>Sound:</Text>
                <Text style={styles.detailValue}>
                  {notification.request.content.sound}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Notification History */}
        {notificationHistory.length > 0 && (
          <View style={styles.historyContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                📋 Notification History ({notificationHistory.length})
              </Text>
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={clearHistory}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
            
            {notificationHistory.map((item, index) => (
              <TouchableOpacity
                key={item.id + index}
                style={styles.historyItem}
                onPress={() => {
                  Alert.alert(
                    'Notification Details',
                    `Title: ${item.title}\n\n` +
                    `Body: ${item.body}\n\n` +
                    `Received: ${item.timestamp}\n\n` +
                    `Data: ${JSON.stringify(item.data, null, 2)}`,
                    [{ text: 'OK' }]
                  );
                }}
              >
                <View style={styles.historyItemHeader}>
                  <Text style={styles.historyItemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.historyItemTime}>{item.timestamp}</Text>
                </View>
                <Text style={styles.historyItemBody} numberOfLines={2}>
                  {item.body}
                </Text>
                {Object.keys(item.data).length > 0 && (
                  <Text style={styles.historyItemData}>
                    📎 Contains custom data
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  tokenContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  tokenScrollView: {
    maxHeight: 120,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 12,
  },
  tokenText: {
    fontSize: 11,
    color: '#2c3e50',
    padding: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 18,
  },
  button: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  copyButton: {
    backgroundColor: '#2196F3',
  },
  testButton: {
    backgroundColor: '#FF9800',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    lineHeight: 18,
  },
  actionContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    marginTop: 12,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  notificationContainer: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  notificationText: {
    fontSize: 14,
    color: '#2e7d32',
    marginBottom: 6,
  },
  emulatorInfoContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#ff9800',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emulatorInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e65100',
    marginBottom: 12,
    textAlign: 'center',
  },
  emulatorInfoText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
  notificationDetailContainer: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewDetailsButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewDetailsButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  notificationDetail: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#1b5e20',
    lineHeight: 20,
  },
  dataScrollView: {
    maxHeight: 100,
    backgroundColor: '#f1f8e9',
    borderRadius: 6,
    marginTop: 4,
  },
  dataText: {
    fontSize: 11,
    color: '#33691e',
    padding: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  historyContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clearButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  historyItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  historyItemTime: {
    fontSize: 11,
    color: '#888',
  },
  historyItemBody: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  historyItemData: {
    fontSize: 11,
    color: '#2196F3',
    marginTop: 6,
    fontStyle: 'italic',
  },
});
export default App;