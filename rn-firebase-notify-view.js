import  messaging from '@react-native-firebase/messaging';
import {Platform} from 'react-native';

class FCMService {
    register = (onRegister, onNotification, onOpenNotification) => {
        this.checkPermission(onRegister);
        this.createNotificationListeners(onRegister, onNotification, onOpenNotification);
    };

    registerAppWithFCM = async () => {
        if (Platform.OS === 'ios') {
            await messaging().registerDeviceForRemoteMessages();
            await messaging().setAutoInitEnabled(true);
        }
    };

    checkPermission = (onRegister) => {
        messaging().hasPermission()
            .then(enabled => {
                if (enabled) {
                    //User has permissions
                    this.getToken(onRegister)
                } else {
                    // User doesn't have permission
                    this.requestPermission(onRegister);
                }
            }).catch(error => {
                console.log('[FCMService] Permission rejected', error);
            })
    }

    getToken = (onRegister) => {
        messaging().getToken()
            .then(fcmToken => {
                if (fcmToken) {
                    onRegister(fcmToken)
                } else {
                    console.log('[FCMService] User does not have a device token')
                }
            }).catch(error => {
                console.log('[FCMService] getToken rejected ', error)
            })
    }

    requestPermission = (onRegister) => {
        messaging().requestPermission()
            .then(() => {
                this.getToken(onRegister)
            }).catch(error => {
                console.log('[FCMService] Request Permission rejected ', error)
            })
    }

    deleteToken = () => {
        console.log('[FCMService] deleteToken ');
        messaging().deleteToken()
            .catch(error => {
                console.log('[FCMService] deleteToken error ', error);
            })
    }

    createNotificationListeners = (onRegister, onNotification, onOpenNotification) => {
        // when app application is running, but in the background
        messaging()
            .onNotificationOpenedApp(remoteMessage => {
                console.log('[FCMService] onNotificatinOpenedApp Notification caused app to open ', remoteMessage);
                if (remoteMessage) {
                    const notification = remoteMessage;
                    // onOpenNotification(notification)                                                             //can be changed by logic
                    //this.removeDeliveredNotification(notification.notificationId)
                }
            })

        //background setting
        messaging().setBackgroundMessageHandler(async remoteMessage => {
            console.log('[FCMService] Message handled in the background!', remoteMessage);
            if (remoteMessage) {
                const notification = remoteMessage;
                // onNotification(notification)
                // onOpenNotification(notification)                                                             //can be changed by logic
                //this.removeDeliveredNotification(notification.notificationId)
            }
        });

        // when the application is opened from a quit state.
        messaging()
            .getInitialNotification()
            .then(remoteMessage => {
                console.log('[FCMService] getInitialNotification Notification caused app to open');

                if (remoteMessage) {
                    const notification = remoteMessage;
                    // onOpenNotification(notification)                                                             //can be changed by logic
                    //this.removeDeliveredNotification(notification.notificationId)`
                }
            })

        // Foreground state messages
        this.messageListener = messaging().onMessage(async remoteMessage => {
            console.log('[FCMService] A new FCM message arrived! ', remoteMessage);

            if (remoteMessage) {
                let notification = null
                if (Platform.OS !== 'ios') {
                    notification = remoteMessage.data
                } else {
                    notification = remoteMessage
                }
                onNotification(notification)                                                                   //can be changed by logic
            }
        });

        //Triggered when have new token
        messaging().onTokenRefresh(fcmToken => {
            console.log('[FCMService] New token refresh ', fcmToken);
            onRegister(fcmToken)
        })
    }

    unRegister = () => {
        this.messageListener()
    }
}

export const fcmService = new FCMService();
