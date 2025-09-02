import React, { useState, useRef } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaDesktop, FaPhoneSlash } from "react-icons/fa";

const APP_ID = "3af292aa36b34cf4a434142efbb86ab3";
const TOKEN =
  "0063af292aa36b34cf4a434142efbb86ab3IAAw1e5iGL/eb7VwzJoB46zqRuRQxdXfKEDpwZoPOCuSMoabvg+i3gSeEACFATkg9A+4aAEAAQD0D7ho";
const CHANNEL = "consult_68b684ada345e9a0b182c5e5";
const UID = '66250';

const VideoCall = () => {
  const [joined, setJoined] = useState(false);
  const [localTracks, setLocalTracks] = useState({ video: null, audio: null });
  const [screenTrack, setScreenTrack] = useState(null);
  const [mainTrack, setMainTrack] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const clientRef = useRef(null);
  const mainContainer = useRef(null);
  const thumbnailsContainer = useRef(null);

  // Join Channel
  const joinCall = async () => {
    clientRef.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

    // Remote user handlers
    clientRef.current.on("user-published", async (user, mediaType) => {
      await clientRef.current.subscribe(user, mediaType);
      if (mediaType === "video") {
        const remoteVideo = document.createElement("video");
        remoteVideo.autoplay = true;
        remoteVideo.playsInline = true;
        remoteVideo.id = `remote-${user.uid}`;
        remoteVideo.className = "w-28 h-20 rounded-lg bg-black";
        thumbnailsContainer.current.appendChild(remoteVideo);
        user.videoTrack.play(remoteVideo);
        setRemoteUsers((prev) => [...prev, user]);
      }
      if (mediaType === "audio") {
        user.audioTrack.play();
      }
    });

    clientRef.current.on("user-unpublished", (user) => {
      const el = document.getElementById(`remote-${user.uid}`);
      if (el) el.remove();
      setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
    });

    await clientRef.current.join(APP_ID, CHANNEL, TOKEN, UID);

    const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
    const camTrack = await AgoraRTC.createCameraVideoTrack();

    setLocalTracks({ video: camTrack, audio: micTrack });

    // Main stage shows my camera by default
    camTrack.play(mainContainer.current);
    setMainTrack(camTrack);

    await clientRef.current.publish([micTrack, camTrack]);
    setJoined(true);
  };

  // Leave Channel
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
    setRemoteUsers([]);
    mainContainer.current.innerHTML = "";
    thumbnailsContainer.current.innerHTML = "";
  };

  // Toggle Camera
  const toggleCamera = async () => {
    if (localTracks.video) {
      if (camOn) {
        await clientRef.current.unpublish(localTracks.video);
        localTracks.video.stop();
      } else {
        await clientRef.current.publish(localTracks.video);
        localTracks.video.play(mainContainer.current);
        setMainTrack(localTracks.video);
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

        // Unpublish camera and show screen as main
        if (localTracks.video) {
          await clientRef.current.unpublish(localTracks.video);
        }
        await clientRef.current.publish(screen);

        mainContainer.current.innerHTML = "";
        screen.play(mainContainer.current);
        setMainTrack(screen);
      } catch (err) {
        console.error("Screen share failed", err);
      }
    } else {
      // Stop screen share → revert to camera
      await clientRef.current.unpublish(screenTrack);
      screenTrack.stop();
      screenTrack.close();
      setScreenTrack(null);

      if (localTracks.video) {
        await clientRef.current.publish(localTracks.video);
        mainContainer.current.innerHTML = "";
        localTracks.video.play(mainContainer.current);
        setMainTrack(localTracks.video);
      }
    }
  };

  return (
    <div className="h-screen w-screen bg-gray-900 flex flex-col">
      {/* Main Stage */}
      <div ref={mainContainer} className="flex-1 bg-black flex items-center justify-center rounded-lg m-2"></div>

      {/* Floating thumbnails */}
      <div
        ref={thumbnailsContainer}
        className="absolute bottom-24 left-4 flex gap-2"
      >
        {/* Local video as floating thumbnail when screen sharing */}
        {screenTrack && (
          <div className="w-28 h-20 rounded-lg overflow-hidden bg-black">
            <video
              autoPlay
              playsInline
              muted
              ref={(el) => localTracks.video && el && localTracks.video.play(el)}
            ></video>
          </div>
        )}
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
