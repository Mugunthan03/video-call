import React, { useState, useRef, useEffect } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaDesktop,
  FaPhoneSlash,
    FaExpand,
} from "react-icons/fa";

const APP_ID = "4206f05f65d8414c8d818ae589f4aa8e";
const TOKEN = null;
const CHANNEL = "consult_68b684ada345e9a0b182c5e9";
const UID = String(Math.floor(Math.random() * 100000));

const VideoCall = () => {
  const [joined, setJoined] = useState(false);
  const [localTracks, setLocalTracks] = useState({ video: null, audio: null });
  const [screenTrack, setScreenTrack] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState({});
  const [mainTrack, setMainTrack] = useState(null); // whoever is in full stage
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const clientRef = useRef(null);

  // Join Channel
  const joinCall = async () => {
    clientRef.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

    clientRef.current.on("user-published", async (user, mediaType) => {
      await clientRef.current.subscribe(user, mediaType);

      if (mediaType === "video") {
        setRemoteUsers((prev) => ({ ...prev, [user.uid]: user }));

        // auto-switch to screen share OR remote camera if only 1 remote
        if (user.videoTrack?.trackMediaType === "screen") {
          setMainTrack(user.videoTrack);
        } else if (!mainTrack && Object.keys(remoteUsers).length === 0) {
          setMainTrack(user.videoTrack);
        }
      }
      if (mediaType === "audio") {
        user.audioTrack.play();
      }
    });

    clientRef.current.on("user-unpublished", (user) => {
      setRemoteUsers((prev) => {
        const updated = { ...prev };
        delete updated[user.uid];
        return updated;
      });
      if (mainTrack === user.videoTrack) {
        setMainTrack(null); // clear if main user leaves
      }
    });

    await clientRef.current.join(APP_ID, CHANNEL, TOKEN, UID);

    const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
    const camTrack = await AgoraRTC.createCameraVideoTrack();
    setLocalTracks({ video: camTrack, audio: micTrack });

    await clientRef.current.publish([micTrack, camTrack]);

    // default: show remote as main if they join
    setMainTrack(null);

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
    setRemoteUsers({});
    setMainTrack(null);
  };

  // Toggle Camera
  const toggleCamera = async () => {
    if (localTracks.video) {
      if (camOn) {
        await clientRef.current.unpublish(localTracks.video);
        localTracks.video.stop();
      } else {
        await clientRef.current.publish(localTracks.video);
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
  // Screen Share
const shareScreen = async () => {
  if (!screenTrack) {
    try {
      const screenTracks = await AgoraRTC.createScreenVideoTrack(
        { encoderConfig: "1080p_1" },
        "auto"
      );

      let video, audio;

      // Check if Agora returned [video, audio]
      if (Array.isArray(screenTracks)) {
        [video, audio] = screenTracks;
      } else {
        video = screenTracks;
      }

      setScreenTrack(video);

      // Publish screen video (and audio if available)
      if (audio) {
        await clientRef.current.publish([video, audio]);
      } else {
        await clientRef.current.publish(video);
      }

      setMainTrack(video);

      // Handle when user stops sharing via browser
      video.on("track-ended", () => {
        stopScreenShare();
      });
    } catch (err) {
      console.error("Screen share failed", err);
    }
  } else {
    stopScreenShare();
  }
};


  const stopScreenShare = async () => {
    if (screenTrack) {
      await clientRef.current.unpublish(screenTrack);
      screenTrack.stop();
      screenTrack.close();
      setScreenTrack(null);

      // fallback: show remote or my camera
      const remotes = Object.values(remoteUsers);
      if (remotes.length > 0) {
        setMainTrack(remotes[0].videoTrack);
      } else {
        setMainTrack(localTracks.video);
      }
    }
  };

  // Handle fullscreen click
  const makeFullScreen = (track) => {
    setMainTrack(track);
  };

  // Render video track
  const VideoPlayer = ({ track }) => {
    const ref = useRef(null);
    useEffect(() => {
      if (track && ref.current) {
        track.play(ref.current);
      }
    }, [track]);
    return <div ref={ref} className="w-full h-full"></div>;
  };

  return (
    <div className="h-screen w-screen bg-gray-900 flex flex-col relative">
      {/* Main Stage */}
      <div className="flex-1 bg-black flex items-center justify-center rounded-lg m-2 relative">
        {mainTrack && <VideoPlayer track={mainTrack} />}
      </div>

      {/* Floating tiles (local + remotes except main) */}
      <div className="absolute bottom-28 right-6 flex flex-col gap-2">
        {/* Local Camera */}
        {localTracks.video && mainTrack !== localTracks.video && (
          <div className="relative w-40 h-28 bg-black rounded-lg overflow-hidden border border-white shadow">
            <VideoPlayer track={localTracks.video} />
            <button
              onClick={() => makeFullScreen(localTracks.video)}
              className="absolute top-1 right-1 bg-gray-700 text-white p-1 rounded"
            >
              <FaExpand />
            </button>
          </div>
        )}

        {/* Remote users */}
        {Object.values(remoteUsers).map(
          (user) =>
            user.videoTrack &&
            mainTrack !== user.videoTrack && (
              <div
                key={user.uid}
                className="relative w-40 h-28 bg-black rounded-lg overflow-hidden border border-white shadow"
              >
                <VideoPlayer track={user.videoTrack} />
                <button
                  onClick={() => makeFullScreen(user.videoTrack)}
                  className="absolute top-1 right-1 bg-gray-700 text-white p-1 rounded"
                >
                  <FaExpand />
                </button>
              </div>
            )
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
