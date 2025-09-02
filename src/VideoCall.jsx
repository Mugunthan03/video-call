import React, { useEffect, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";

const APP_ID = "3af292aa36b34cf4a434142efbb86ab3";
const TOKEN =
  "0063af292aa36b34cf4a434142efbb86ab3IABMMTKK5EoCy01PPCxxuW3SpmZPexX7uIpexoBu7jXZ0DP7zn1EL5HfEAD6YsiyjOu3aAEAAQCM67do";
const CHANNEL = "consult_68b684ada345e9a0b182c5de";

// ⚡ Important: each user must have a UNIQUE uid
const uid = '13937';

const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

export default function VideoCall() {
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState({});
  const [screenTrack, setScreenTrack] = useState(null);
  const [joined, setJoined] = useState(false);

  // Attach local video to DOM
  useEffect(() => {
    if (localVideoTrack) {
      localVideoTrack.play("local-player");
    }
  }, [localVideoTrack]);

  // Attach remote videos to DOM
  useEffect(() => {
    Object.values(remoteUsers).forEach((user) => {
      if (user.videoTrack) {
        user.videoTrack.play(`remote-player-${user.uid}`);
      }
    });
  }, [remoteUsers]);

  // Join channel
  const joinChannel = async () => {
    await client.join(APP_ID, CHANNEL, TOKEN, uid);

    const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
    const camTrack = await AgoraRTC.createCameraVideoTrack();

    setLocalAudioTrack(micTrack);
    setLocalVideoTrack(camTrack);

    await client.publish([micTrack, camTrack]);

    client.on("user-published", async (user, mediaType) => {
      await client.subscribe(user, mediaType);

      if (mediaType === "video") {
        setRemoteUsers((prev) => ({ ...prev, [user.uid]: user }));
      }

      if (mediaType === "audio") {
        user.audioTrack.play();
      }
    });

    client.on("user-unpublished", (user) => {
      setRemoteUsers((prev) => {
        const updated = { ...prev };
        delete updated[user.uid];
        return updated;
      });
    });

    setJoined(true);
  };

  // Leave channel
  const leaveChannel = async () => {
    client.remoteUsers.forEach((user) => {
      if (user.videoTrack) user.videoTrack.stop();
      if (user.audioTrack) user.audioTrack.stop();
    });

    localVideoTrack?.stop();
    localVideoTrack?.close();
    localAudioTrack?.stop();
    localAudioTrack?.close();

    if (screenTrack) {
      await client.unpublish(screenTrack);
      screenTrack.stop();
      screenTrack.close();
    }

    await client.leave();
    setJoined(false);
    setRemoteUsers({});
    setScreenTrack(null);
    setLocalVideoTrack(null);
    setLocalAudioTrack(null);
  };

  // Screen share
  const shareScreen = async () => {
    if (screenTrack) {
      await client.unpublish(screenTrack);
      screenTrack.stop();
      screenTrack.close();
      setScreenTrack(null);
    } else {
      const screen = await AgoraRTC.createScreenVideoTrack();
      setScreenTrack(screen);
      await client.publish(screen);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Video Grid */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        {screenTrack ? (
          <div className="absolute inset-0">
            <div id="screen-player" className="w-full h-full"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 w-full h-full">
            {/* Local Video */}
            <div id="local-player" className="bg-black w-full h-full"></div>

            {/* Remote Videos */}
            {Object.values(remoteUsers).map((user) => (
              <div
                key={user.uid}
                id={`remote-player-${user.uid}`}
                className="bg-black w-full h-full"
              ></div>
            ))}
          </div>
        )}

        {/* Local small preview when sharing screen */}
        {screenTrack && (
          <div className="absolute bottom-4 right-4 w-40 h-28 border-2 border-white rounded-lg overflow-hidden">
            <div id="local-player" className="w-full h-full"></div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 bg-gray-800 flex justify-center gap-4">
        {!joined ? (
          <button
            onClick={joinChannel}
            className="px-4 py-2 bg-green-600 rounded-lg"
          >
            Join
          </button>
        ) : (
          <>
            <button
              onClick={shareScreen}
              className="px-4 py-2 bg-blue-600 rounded-lg"
            >
              {screenTrack ? "Stop Share" : "Share Screen"}
            </button>
            <button
              onClick={leaveChannel}
              className="px-4 py-2 bg-red-600 rounded-lg"
            >
              Leave
            </button>
          </>
        )}
      </div>
    </div>
  );
}
