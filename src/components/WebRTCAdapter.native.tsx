import React from "react";
import { useLibraries } from "../contexts/LibrariesContext";


const {mediaDevices, NativeRTCView} = useLibraries();
export const getMediaDevices = () => {
  return mediaDevices;
};

export const RTCView = ({ stream, style }: any) => {
  // In Native, we use the 'streamURL' prop (the ID of the stream)
  // instead of attaching to a ref.
  return (
    <NativeRTCView
      streamURL={stream?.toURL()}
      style={style}
      objectFit="cover"
    />
  );
};
