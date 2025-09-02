import React, { useState, useEffect } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  PhoneOff,
} from "lucide-react";

const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

export default function VideoCall() {
  const [joined, setJoined] = useState(false);
  const [localTracks, setLocalTracks] = useState([]);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenTrack, setScreenTrack] = useState(null);

  const appId = "4206f05f65d8414c8d818ae589f4aa8e";
  const token = null;
  const channel = "consult_68b684ada345e9a0b182c5da";

  // Join Channel
  const joinChannel = async () => {
    await client.join(appId, channel, token, null);

    const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
    setLocalTracks(tracks);

    tracks[1].play("local-player");
    await client.publish(tracks);

    client.on("user-published", async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      if (mediaType === "video") {
        setRemoteUsers((prev) => [...prev, user]);
        user.videoTrack.play(`remote-${user.uid}`);
      }
      if (mediaType === "audio") {
        user.audioTrack.play();
      }
    });

    client.on("user-unpublished", (user) => {
      setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
    });

    client.on("user-left", (user) => {
      setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
    });

    setJoined(true);
  };

  // Leave channel
  const leaveChannel = async () => {
    localTracks.forEach((track) => track.stop() && track.close());
    if (screenTrack) {
      await client.unpublish(screenTrack);
      screenTrack.stop();
      screenTrack.close();
    }
    await client.leave();
    setRemoteUsers([]);
    setJoined(false);
  };

  // Toggle mic
  const toggleMic = async () => {
    if (isMicOn) {
      await localTracks[0].setEnabled(false);
    } else {
      await localTracks[0].setEnabled(true);
    }
    setIsMicOn(!isMicOn);
  };

  // Toggle camera
  const toggleCam = async () => {
    if (isCamOn) {
      await localTracks[1].setEnabled(false);
    } else {
      await localTracks[1].setEnabled(true);
    }
    setIsCamOn(!isCamOn);
  };

  // Start/Stop Screen Share
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      const screenTrack = await AgoraRTC.createScreenVideoTrack();
      setScreenTrack(screenTrack);
      await client.unpublish(localTracks);
      await client.publish(screenTrack);
      screenTrack.play("main-view");
      setIsScreenSharing(true);
    } else {
      await client.unpublish(screenTrack);
      screenTrack.stop();
      screenTrack.close();
      await client.publish(localTracks);
      localTracks[1].play("main-view");
      setIsScreenSharing(false);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-black text-white">
      {/* Main Area */}
      <div className="flex-1 flex">
        {/* Main video or screen share */}
        <div id="main-view" className="flex-1 bg-black relative">
          {!isScreenSharing && (
            <div
              id="local-player"
              className="w-full h-full bg-gray-900 rounded-lg"
            ></div>
          )}
        </div>

        {/* Side panel (only in screen share mode) */}
        {isScreenSharing && (
          <div className="w-1/4 bg-gray-900 flex flex-col gap-2 p-2">
            {remoteUsers.map((user) => (
              <div
                key={user.uid}
                id={`remote-${user.uid}`}
                className="h-1/2 bg-gray-800 rounded-lg relative"
              >
                <span className="absolute bottom-1 left-1 text-xs bg-black/50 px-2 rounded">
                  User {user.uid}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Floating thumbnail (only if NOT screen sharing) */}
        {!isScreenSharing && remoteUsers.length > 0 && (
          <div className="absolute bottom-4 right-4 w-40 h-28 bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div
              id={`remote-${remoteUsers[0].uid}`}
              className="w-full h-full"
            ></div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      {joined && (
        <div className="flex justify-center gap-6 py-3 bg-gray-900">
          <button
            onClick={toggleMic}
            className="p-3 rounded-full bg-gray-700 hover:bg-gray-600"
          >
            {isMicOn ? <Mic /> : <MicOff />}
          </button>

          <button
            onClick={toggleCam}
            className="p-3 rounded-full bg-gray-700 hover:bg-gray-600"
          >
            {isCamOn ? <Video /> : <VideoOff />}
          </button>

          <button
            onClick={toggleScreenShare}
            className="p-3 rounded-full bg-gray-700 hover:bg-gray-600"
          >
            <MonitorUp />
          </button>

          <button
            onClick={leaveChannel}
            className="p-3 rounded-full bg-red-600 hover:bg-red-500"
          >
            <PhoneOff />
          </button>
        </div>
      )}

      {/* Join button */}
      {!joined && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <button
            onClick={joinChannel}
            className="px-6 py-3 bg-green-600 text-white rounded-lg"
          >
            Join Meeting
          </button>
        </div>
      )}
    </div>
  );
}
