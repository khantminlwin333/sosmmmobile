package com.sosapp;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.NetworkInfo;
import android.net.wifi.WifiManager;
import android.net.wifi.p2p.*;
import android.os.AsyncTask;
import android.util.Log;
import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.io.*;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.util.*;

public class WiFiDirectModule extends ReactContextBaseJavaModule {
    private final WifiP2pManager wifiP2pManager;
    private final WifiP2pManager.Channel channel;
    private final ReactApplicationContext reactContext;

    private static final String TAG = "WiFiDirectModule";
    private static final int PORT = 8888;

    // Declare the connected devices list
    private List<WifiP2pDevice> connectedDevices = new ArrayList<>();

    public WiFiDirectModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        wifiP2pManager = (WifiP2pManager) reactContext.getSystemService(Context.WIFI_P2P_SERVICE);
        channel = wifiP2pManager.initialize(reactContext, reactContext.getMainLooper(), null);

        // Register receiver for connection changes and peer changes
        IntentFilter filter = new IntentFilter();
        filter.addAction(WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION);
        filter.addAction(WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION);
        reactContext.registerReceiver(receiver, filter);
    }

    @Override
    public String getName() {
        return "WiFiDirectModule";
    }

    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        try {
            reactContext.unregisterReceiver(receiver);
        } catch (IllegalArgumentException e) {
            Log.w(TAG, "Receiver was not registered or already unregistered");
        }
    }

    // BroadcastReceiver to detect when device is connected and peers change
    private final BroadcastReceiver receiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();

            if (WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION.equals(action)) {
                NetworkInfo networkInfo = intent.getParcelableExtra(WifiP2pManager.EXTRA_NETWORK_INFO);

                if (networkInfo != null && networkInfo.isConnected()) {
                    wifiP2pManager.requestConnectionInfo(channel, connectionInfoListener);
                }
            } else if (WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION.equals(action)) {
                Log.d(TAG, "Peers changed action received");
                wifiP2pManager.requestPeers(channel, peerListListener);
            }
        }
    };

    @ReactMethod
    public void getConnectedDevices(Callback successCallback, Callback errorCallback) {
        // Use the correct wifiP2pManager and channel instead of mManager and mChannel
        wifiP2pManager.requestPeers(channel, new WifiP2pManager.PeerListListener() {
            @Override
            public void onPeersAvailable(WifiP2pDeviceList peerList) {
                connectedDevices.clear();
                connectedDevices.addAll(peerList.getDeviceList());
                
                // Convert the connected devices to a list of device names (or other properties)
                List<String> devices = new ArrayList<>();
                for (WifiP2pDevice device : connectedDevices) {
                    devices.add(device.deviceName); // You can also use device.deviceAddress or device.status
                }

                // Send the list of device names back to React Native
                successCallback.invoke(devices);
            }
        });
    }

    @ReactMethod
public void getConnectionInfo(Promise promise) {
    wifiP2pManager.requestConnectionInfo(channel, info -> {
        WritableMap map = Arguments.createMap();
        map.putBoolean("groupFormed", info.groupFormed);
        map.putBoolean("isGroupOwner", info.isGroupOwner);
        map.putString("groupOwnerAddress", info.groupOwnerAddress.getHostAddress());
        promise.resolve(map);
    });
}

    // Connection info callback
    private final WifiP2pManager.ConnectionInfoListener connectionInfoListener = new WifiP2pManager.ConnectionInfoListener() {
        @Override
        public void onConnectionInfoAvailable(WifiP2pInfo info) {
            if (info.groupFormed && info.groupOwnerAddress != null) {
                String groupOwnerIp = info.groupOwnerAddress.getHostAddress();
                Log.d(TAG, "Group Owner IP: " + groupOwnerIp);
                sendGroupOwnerIpToReactNative(groupOwnerIp);
            } else {
                Log.d(TAG, "Group not formed or group owner address is null");
            }
        }
    };

    private void sendGroupOwnerIpToReactNative(String groupOwnerIp) {
        DeviceEventManagerModule.RCTDeviceEventEmitter emitter = getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class);
        emitter.emit("onGroupOwnerIpReceived", groupOwnerIp);
    }

    // Peer list listener to handle updated peers
    private final WifiP2pManager.PeerListListener peerListListener = new WifiP2pManager.PeerListListener() {
        @Override
        public void onPeersAvailable(WifiP2pDeviceList peers) {
            connectedDevices.clear();
            connectedDevices.addAll(peers.getDeviceList());
            WritableArray result = Arguments.createArray();
            for (WifiP2pDevice device : connectedDevices) {
                WritableMap deviceMap = Arguments.createMap();
                deviceMap.putString("deviceName", device.deviceName);
                deviceMap.putString("deviceAddress", device.deviceAddress);
                result.pushMap(deviceMap);
            }
            Log.d(TAG, "Peers available: " + connectedDevices.size());
            sendEvent("onPeersAvailable", result);
        }
    };

    @ReactMethod
    public void isWifiEnabled(Promise promise) {
        WifiManager wifiManager = (WifiManager) reactContext.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        promise.resolve(wifiManager.isWifiEnabled());
    }
    @ReactMethod
    public void createGroup(final Promise promise) {
        Log.d(TAG, "Creating group...");
        wifiP2pManager.createGroup(channel, new WifiP2pManager.ActionListener() {
            public void onSuccess() {
                Log.d(TAG, "Group created successfully");
                promise.resolve(true);
            }

            public void onFailure(int reason) {
                Log.e(TAG, "Failed to create group: " + reason);
                promise.reject("GROUP_CREATION_FAILED", "Failed to create group: " + reason);
            }
        });
    }

    @ReactMethod
    public void removeGroup(final Promise promise) {
        wifiP2pManager.removeGroup(channel, new WifiP2pManager.ActionListener() {
            public void onSuccess() {
                promise.resolve("Group removed");
            }

            public void onFailure(int reason) {
                promise.reject("REMOVE_FAILED", "Failed to remove group: " + reason);
            }
        });
    }

    @ReactMethod
    public void discoverPeers(final Promise promise) {
        Log.d(TAG, "Starting peer discovery...");
        wifiP2pManager.discoverPeers(channel, new WifiP2pManager.ActionListener() {
            public void onSuccess() {
                Log.d(TAG, "Peer discovery started");
                promise.resolve("Discovery started");
            }

            public void onFailure(int reason) {
                Log.e(TAG, "Peer discovery failed: " + reason);
                promise.reject("DISCOVERY_FAILED", "Peer discovery failed: " + reason);
            }
        });
    }

    @ReactMethod
    public void getAvailablePeers(final Promise promise) {
        wifiP2pManager.requestPeers(channel, peers -> {
            WritableArray result = Arguments.createArray();
            for (WifiP2pDevice device : peers.getDeviceList()) {
                WritableMap deviceMap = Arguments.createMap();
                deviceMap.putString("deviceName", device.deviceName);
                deviceMap.putString("deviceAddress", device.deviceAddress);
                result.pushMap(deviceMap);
            }
            promise.resolve(result);
        });
    }

    @ReactMethod
    public void connectToPeer(String deviceAddress, final Promise promise) {
        WifiP2pConfig config = new WifiP2pConfig();
        config.deviceAddress = deviceAddress;

        sendEvent("onConnectionStatus", "Connecting to peer: " + deviceAddress);

        wifiP2pManager.connect(channel, config, new WifiP2pManager.ActionListener() {
            public void onSuccess() {
                sendEvent("onConnectionStatus", "Connection success, getting info...");
                // Now get the connection info after success
                wifiP2pManager.requestConnectionInfo(channel, new WifiP2pManager.ConnectionInfoListener() {
                    @Override
                    public void onConnectionInfoAvailable(WifiP2pInfo info) {
                        if (info.groupFormed) {
                            String ip = info.groupOwnerAddress.getHostAddress();
                            Log.d(TAG, "Connected to peer, group owner IP: " + ip);
                            sendEvent("onConnectionStatus", "Connected to peer, group owner IP: " + ip);
                            promise.resolve(ip);  // ✅ Return actual IP to JavaScript
                        } else {
                            sendEvent("onConnectionStatus", "Group not formed yet.");
                            promise.reject("NO_GROUP", "Group not formed yet.");
                        }
                    }
                });
            }

            public void onFailure(int reason) {
                sendEvent("onConnectionStatus", "Connection failed: " + reason);
                promise.reject("CONNECT_FAILED", "Connection failed: " + reason);
            }
        });
    }

    @ReactMethod
    public void startServer(final Promise promise) {
        new Thread(() -> {
            try (ServerSocket serverSocket = new ServerSocket(PORT, 0, InetAddress.getByName("0.0.0.0"))) {
                Log.d(TAG, "Server started, waiting for connections...");
                while (true) {
                    Socket clientSocket = serverSocket.accept();
                    Log.d(TAG, "Client connected: " + clientSocket.getInetAddress().getHostAddress());
                    BufferedReader in = new BufferedReader(new InputStreamReader(clientSocket.getInputStream()));
                    String received = in.readLine();
                    Log.d(TAG, "Received message: " + received);

                    sendEvent("onMessageReceived", received);
                }
            } catch (IOException e) {
                Log.e(TAG, "Server failed", e);
                promise.reject("SERVER_FAILED", e.getMessage());
            }
        }).start();
        promise.resolve("Server started");
    }

 @ReactMethod
public void sendData(String host, int port, String message, Promise promise) {
    new Thread(() -> {
        try {
            Log.d(TAG, "Connecting to " + host + ":" + port);
            Socket socket = new Socket();
            socket.connect(new InetSocketAddress(host, port), 5000); // ⏱️ 5 sec timeout

            OutputStream outputStream = socket.getOutputStream();
            PrintWriter writer = new PrintWriter(outputStream, true);
            writer.println(message);
            writer.flush();

            socket.close();

            Log.d(TAG, "✅ Message sent to " + host + ":" + port);
            
            // 👉 Emit event to JS
            WritableMap params = Arguments.createMap();
            params.putString("status", "Message sent via Wi-Fi Direct!");
            getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("onMessageSent", "Message sent via Wi-Fi Direct!");

            promise.resolve("Message sent");
        } catch (IOException e) {
             Log.e(TAG, "❌ Failed to send data", e);
            
            // Emit failure event to JS
            WritableMap errorParams = Arguments.createMap();
            errorParams.putString("status", "Failed to send message via Wi-Fi Direct");
            errorParams.putString("error", e.getMessage());  // Include error details
            getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("onMessageFailed", errorParams);  // Send error details

            promise.reject("SEND_FAILED", e.getMessage());
        }
    }).start();
}


    private void sendEvent(String eventName, WritableArray data) {
        DeviceEventManagerModule.RCTDeviceEventEmitter emitter = getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class);
        emitter.emit(eventName, data);
    }

    private void sendEvent(String eventName, String message) {
        WritableMap params = Arguments.createMap();
        params.putString("message", message);
        DeviceEventManagerModule.RCTDeviceEventEmitter emitter = getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class);
        emitter.emit(eventName, params);
    }
}
