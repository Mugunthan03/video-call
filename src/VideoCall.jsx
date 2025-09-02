import React, { useState, useRef } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaDesktop,
  FaPhoneSlash,
} from "react-icons/fa";

const APP_ID = "4206f05f65d8414c8d818ae589f4aa8e";
const TOKEN = null;
const CHANNEL = "consult_68b684ada345e9a0b182c5e9";
const UID = '18710';

const VideoCall = () => {
  const [joined, setJoined] = useState(false);
  const [localTracks, setLocalTracks] = useState({ video: null, audio: null });
  const [screenTrack, setScreenTrack] = useState(null);
  const [remoteMainTrack, setRemoteMainTrack] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const clientRef = useRef(null);
  const mainContainer = useRef(null);
  const localFloating = useRef(null);

  // Join Channel
  const joinCall = async () => {
    clientRef.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

    // Handle remote user publish
    clientRef.current.on("user-published", async (user, mediaType) => {
      await clientRef.current.subscribe(user, mediaType);

      if (mediaType === "video") {
        mainContainer.current.innerHTML = "";
        user.videoTrack.play(mainContainer.current);
        setRemoteMainTrack(user.videoTrack);
      }
      if (mediaType === "audio") {
        user.audioTrack.play();
      }
    });

    clientRef.current.on("user-unpublished", () => {
      mainContainer.current.innerHTML = "";
      setRemoteMainTrack(null);
    });

    await clientRef.current.join(APP_ID, CHANNEL, TOKEN, UID);

    const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
    const camTrack = await AgoraRTC.createCameraVideoTrack();

    setLocalTracks({ video: camTrack, audio: micTrack });

    // Publish local tracks
    await clientRef.current.publish([micTrack, camTrack]);

    // Play local in floating video (not main)
    if (localFloating.current) {
      camTrack.play(localFloating.current);
    }

    setJoined(true);
  };

  // Leave Call
  const leaveCall = async () => {
    localTracks.video?.stop();
    localTracks.audio?.stop();
    localTracks.video?.close();
    localTracks.audio?.close();
    screenTrack?.close();

    await clientRef.current.leave();
    setJoined(false);
    setLocalTracks({ video: null, audio: null });
    setScreenTrack(null);
    setRemoteMainTrack(null);
    mainContainer.current.innerHTML = "";
    if (localFloating.current) localFloating.current.innerHTML = "";
  };

  // Toggle Camera
  const toggleCamera = async () => {
    if (localTracks.video) {
      if (camOn) {
        await clientRef.current.unpublish(localTracks.video);
        localTracks.video.stop();
        if (localFloating.current) localFloating.current.innerHTML = "";
      } else {
        await clientRef.current.publish(localTracks.video);
        if (localFloating.current) localTracks.video.play(localFloating.current);
      }
      setCamOn(!camOn);
    }
  };

  // Toggle Mic
  const toggleMic = async () => {
    if (localTracks.audio) {
      await localTracks.audio.setMuted(micOn);
      setMicOn(!micOn);
    }
  };

  // Screen Share
  const shareScreen = async () => {
    if (!screenTrack) {
      try {
        const screen = await AgoraRTC.createScreenVideoTrack(
          { encoderConfig: "1080p_1" },
          "auto"
        );
        setScreenTrack(screen);

        // Publish screen as main
        await clientRef.current.publish(screen);
        mainContainer.current.innerHTML = "";
        screen.play(mainContainer.current);
      } catch (err) {
        console.error("Screen share failed", err);
      }
    } else {
      // Stop screen share → back to remote or empty
      await clientRef.current.unpublish(screenTrack);
      screenTrack.stop();
      screenTrack.close();
      setScreenTrack(null);

      if (remoteMainTrack) {
        mainContainer.current.innerHTML = "";
        remoteMainTrack.play(mainContainer.current);
      }
    }
  };

  return (
    <div className="h-screen w-screen bg-gray-900 flex flex-col relative">
      {/* Main stage (full screen for remote or shared screen) */}
      <div
        ref={mainContainer}
        className="flex-1 bg-black flex items-center justify-center rounded-lg m-2"
      ></div>

      {/* Floating local video (always in corner) */}
      <div className="absolute bottom-28 right-6 w-40 h-28 rounded-lg overflow-hidden bg-black shadow-lg border-2 border-white">
        <div ref={localFloating} className="w-full h-full"></div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 py-3 flex justify-center gap-6">
        {!joined ? (
          <button
            onClick={joinCall}
            className="px-4 py-2 bg-green-600 rounded-lg text-white"
          >
            Join
          </button>
        ) : (
          <button
            onClick={leaveCall}
            className="px-4 py-2 bg-red-600 rounded-lg text-white flex items-center gap-2"
          >
            <FaPhoneSlash /> Leave
          </button>
        )}

        <button
          onClick={toggleMic}
          className="px-4 py-2 bg-gray-700 rounded-full text-white"
        >
          {micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </button>

        <button
          onClick={toggleCamera}
          className="px-4 py-2 bg-gray-700 rounded-full text-white"
        >
          {camOn ? <FaVideo /> : <FaVideoSlash />}
        </button>

        <button
          onClick={shareScreen}
          className="px-4 py-2 bg-gray-700 rounded-full text-white"
        >
          <FaDesktop />
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
