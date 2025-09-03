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
import { User } from "lucide-react"; // 👈 Lucide avatar icon

const APP_ID = "4206f05f65d8414c8d818ae589f4aa8e";
const TOKEN = null;
const CHANNEL = "consult_68b684ada345e9a0b182c5e9";
const UID = "46005";

const VideoCall = () => {
  const [joined, setJoined] = useState(false);
  const [localTracks, setLocalTracks] = useState({ video: null, audio: null });
  const [screenTrack, setScreenTrack] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState({});
  const [mainTrack, setMainTrack] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const clientRef = useRef(null);

  // Join Call
  const joinCall = async () => {
    clientRef.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

    clientRef.current.on("user-published", async (user, mediaType) => {
      await clientRef.current.subscribe(user, mediaType);

      if (mediaType === "video") {
        setRemoteUsers((prev) => ({ ...prev, [user.uid]: user }));
        if (user.videoTrack) {
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
        if (screenTrack) setMainTrack(screenTrack);
        else setMainTrack(localTracks.video);
      }
    });

    await clientRef.current.join(APP_ID, CHANNEL, TOKEN, UID);

    const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
    const camTrack = await AgoraRTC.createCameraVideoTrack();
    setLocalTracks({ video: camTrack, audio: micTrack });

    await clientRef.current.publish([micTrack, camTrack]);

    setMainTrack(camTrack);
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
    if (!camOn) {
      // Camera is OFF → recreate or enable
      let camTrack = localTracks.video;
      if (!camTrack) {
        camTrack = await AgoraRTC.createCameraVideoTrack();
        setLocalTracks((prev) => ({ ...prev, video: camTrack }));
      }
      await clientRef.current.publish(camTrack);
      camTrack.play();
      setCamOn(true);
      setMainTrack(camTrack);
    } else {
      // Camera is ON → turn it off
      if (localTracks.video) {
        await clientRef.current.unpublish(localTracks.video);
        localTracks.video.stop();
      }
      setCamOn(false);
    }
  };

  // Toggle Mic
  const toggleMic = async () => {
    if (localTracks.audio) {
      await localTracks.audio.setMuted(micOn);
      setMicOn(!micOn);
    }
  };

  // Start Screen Share
  const shareScreen = async () => {
    if (!clientRef.current) return;

    const track = await AgoraRTC.createScreenVideoTrack();

    if (localTracks.video) {
      await clientRef.current.unpublish(localTracks.video);
      localTracks.video.stop();
      setCamOn(false); // auto disable camera
    }

    await clientRef.current.publish(track);
    setScreenTrack(track);
    setMainTrack(track);

    track.on("track-ended", async () => {
      await stopScreenShare(true);
    });
  };

  // Stop Screen Share
  const stopScreenShare = async () => {
    if (screenTrack) {
      await clientRef.current.unpublish(screenTrack);
      screenTrack.stop();
      setScreenTrack(null);

      // Restore camera
      let camTrack = localTracks.video;
      if (!camTrack) {
        camTrack = await AgoraRTC.createCameraVideoTrack();
        setLocalTracks((prev) => ({ ...prev, video: camTrack }));
      }
      await clientRef.current.publish(camTrack);
      camTrack.play();
      setCamOn(true);
      setMainTrack(camTrack);
    }
  };

  // Make any track full screen
  const makeFullScreen = (track) => {
    setMainTrack(track);
  };

  // Video Player component
  const VideoPlayer = ({ track }) => {
    const ref = useRef(null);

    useEffect(() => {
      if (track && ref.current) {
        track.stop();
        track.play(ref.current, { fit: "cover" });
      }
      return () => {
        if (track) track.stop();
      };
    }, [track]);

    return <div ref={ref} className="w-[90%] p-3 h-full bg-black"></div>;
  };

  // Avatar placeholder
  const Avatar = () => (
    <div className="flex items-center justify-center w-full h-full bg-gray-800">
      <User size={64} className="text-white" />
    </div>
  );

  return (
    <div className="h-screen w-screen bg-gray-900 flex flex-col relative">
      {/* Full Screen Area */}
      <div className="flex-1 flex items-center justify-center rounded-lg m-2 relative">
        {screenTrack ? (
          <VideoPlayer track={screenTrack} />
        ) : camOn && mainTrack ? (
          <VideoPlayer track={mainTrack} />
        ) : (
          <Avatar />
        )}
      </div>

      {/* Floating Tiles */}
      <div className="absolute bottom-28 right-6 flex flex-col gap-2">
        {localTracks.video && mainTrack !== localTracks.video && (
          <div className="relative w-52 h-32 bg-gray-800 rounded-lg overflow-hidden border border-white shadow flex items-center justify-center">
            {camOn ? <VideoPlayer track={localTracks.video} /> : <Avatar />}
            {camOn && (
              <button
                onClick={() => makeFullScreen(localTracks.video)}
                className="absolute top-1 right-1 bg-gray-700 text-white p-1 rounded"
              >
                <FaExpand />
              </button>
            )}
          </div>
        )}

        {Object.values(remoteUsers).map((user) => (
          <div
            key={user.uid}
            className="relative w-52 h-32 bg-gray-800 rounded-lg overflow-hidden border border-white shadow flex items-center justify-center"
          >
            {user.videoTrack ? <VideoPlayer track={user.videoTrack} /> : <Avatar />}
            {user.videoTrack && (
              <button
                onClick={() => makeFullScreen(user.videoTrack)}
                className="absolute top-1 right-1 bg-gray-700 text-white p-1 rounded"
              >
                <FaExpand />
              </button>
            )}
          </div>
        ))}
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
          onClick={screenTrack ? stopScreenShare : shareScreen}
          className={`px-4 py-2 rounded-full text-white transition-colors ${screenTrack ? "bg-blue-500" : "bg-gray-700"
            }`}
        >
          <FaDesktop />
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
