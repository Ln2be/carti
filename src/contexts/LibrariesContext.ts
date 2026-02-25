import { Platform } from 'react-native';
import { getLocales } from "expo-localization";
import { User, Users, Bot, Search, LogOut, Mic, MicOff, Volume2, VolumeX, Plus, Menu } from 'lucide-react-native';

// Use a lazy requirement or a null check for WebRTC
let NativeRTCView = null;
let mediaDevices = null;

if (Platform.OS !== 'web') {
    // We use require here so it doesn't try to resolve during a Web build
    const WebRTC = require("react-native-webrtc");
    NativeRTCView = WebRTC.RTCView;
    mediaDevices = WebRTC.mediaDevices;
}

export const useLibraries = () => {
    return {
        getLocales,
        NativeRTCView,
        mediaDevices,
    }
}

export const useIcons = () => {
    return {
        User, Users, Bot, Search, LogOut, Mic, MicOff, Volume2, VolumeX, Plus, Menu
    }
}