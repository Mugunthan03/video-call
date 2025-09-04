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
import { User, Mic, MicOff, Video, VideoOff } from "lucide-react";

const APP_ID = "f9250d1d7cfd44c1a514966db2ad860b";
const TOKEN =
  "006f9250d1d7cfd44c1a514966db2ad860bIABc0X4X4AmTzcY4PCWyPjnmuD9Sw7UvdIRsRUweb0aJsMHg1RZNIb4SIgBsKhM3MIq6aAQAAQD4P7loAgD4P7loAwD4P7loBAD4P7lo";
const CHANNEL = "consult_68b684aea345e9a0b182c630";
const UID = "59202";

// Consultation start and end times (UNIX seconds)
const joinAllowedFrom = 1756969500; // start
const end = 1756971000;   // end

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

      setRemoteUsers((prev) => {
        const updated = { ...prev };

        if (mediaType === "video") {
          updated[user.uid] = {
            ...user,
            videoTrack: user.videoTrack,
            hasVideo: true,
            hasAudio: prev[user.uid]?.hasAudio ?? false,
          };
        }

        if (mediaType === "audio") {
          updated[user.uid] = {
            ...user,
            audioTrack: user.audioTrack,
            hasAudio: true,
            hasVideo: prev[user.uid]?.hasVideo ?? false,
          };
          user.audioTrack.play();
        }

        return updated;
      });

      if (mediaType === "video" && user.videoTrack) {
        setMainTrack(user.videoTrack);
      }
    });

    clientRef.current.on("user-unpublished", (user, mediaType) => {
      setRemoteUsers((prev) => {
        const updated = { ...prev };

        if (mediaType === "video") {
          updated[user.uid] = { ...updated[user.uid], hasVideo: false, videoTrack: null };
        }
        if (mediaType === "audio") {
          updated[user.uid] = { ...updated[user.uid], hasAudio: false, audioTrack: null };
        }

        if (mainTrack === user.videoTrack) {
          const remoteWithVideo = Object.values(updated).find((u) => u.videoTrack);
          if (remoteWithVideo) {
            setMainTrack(remoteWithVideo.videoTrack);
          } else if (localTracks.video) {
            setMainTrack(localTracks.video);
          } else {
            setMainTrack(null);
          }
        }

        return updated;
      });
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
    if (localTracks.video) {
      if (camOn) {
        await localTracks.video.setEnabled(false);
      } else {
        await localTracks.video.setEnabled(true);
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

  // Share Screen
  const shareScreen = async () => {
    if (!clientRef.current) return;

    const track = await AgoraRTC.createScreenVideoTrack();

    if (localTracks.video) {
      await clientRef.current.unpublish(localTracks.video);
      localTracks.video.stop();
      setCamOn(false);
    }

    await clientRef.current.publish(track);
    setScreenTrack(track);
    setMainTrack(track);

    track.on("track-ended", async () => {
      await stopScreenShare();
    });
  };

  const stopScreenShare = async () => {
    if (screenTrack) {
      await clientRef.current.unpublish(screenTrack);
      screenTrack.stop();
      setScreenTrack(null);

      let camTrack = localTracks.video;
      if (!camTrack) {
        camTrack = await AgoraRTC.createCameraVideoTrack();
        setLocalTracks((prev) => ({ ...prev, video: camTrack }));
      }
      await clientRef.current.publish(camTrack);
      setCamOn(true);

      const remoteWithVideo = Object.values(remoteUsers).find((u) => u.videoTrack);
      if (remoteWithVideo) {
        setMainTrack(remoteWithVideo.videoTrack);
      } else {
        setMainTrack(camTrack);
      }
    }
  };

  const makeFullScreen = (track) => {
    setMainTrack(track);
  };

  // Handle Join button click with consultation time validation
  const handleJoinClick = () => {
    const currentTime = Math.floor(Date.now() / 1000);
    console.log(currentTime)
    if (currentTime < joinAllowedFrom) {
      alert("You can only join 5 minutes before the consultation starts.");
      return;
    }

    if (currentTime > end) {
      alert("Consultation time is over. Re-entry is not allowed.");
      return;
    }

    // if (currentTime >= joinAllowedFrom - 300 && currentTime < joinAllowedFrom) {
    //   alert("Consultation will start in 5 minutes. Please wait.");
    //   return;
    // }

    joinCall();
  };

  // Video Player
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

  const AvatarTile = ({ micOn, camOn }) => (
    <div className="flex items-center justify-center w-[90%] h-full bg-gray-800 relative">
      <User size={48} className="text-white" />
      <div className="absolute bottom-2 left-2 flex gap-2">
        {micOn ? <Mic size={16} className="text-green-400" /> : <MicOff size={16} className="text-red-500" />}
        {camOn ? <Video size={16} className="text-green-400" /> : <VideoOff size={16} className="text-red-500" />}
      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen bg-gray-900 flex flex-col relative">
      {/* Full Screen */}
      <div className="flex-1 flex items-center justify-center rounded-lg m-2 relative">
        {screenTrack ? (
          <VideoPlayer track={screenTrack} />
        ) : mainTrack ? (
          <VideoPlayer track={mainTrack} />
        ) : (
          <AvatarTile micOn={micOn} camOn={camOn} />
        )}
      </div>

      {/* Floating Tiles */}
      <div className="absolute bottom-28 right-6 flex flex-col gap-2">
        {localTracks.video && mainTrack !== localTracks.video && (
          <div className="relative w-52 h-32 bg-black rounded-lg overflow-hidden border border-white shadow flex items-center justify-center">
            {camOn ? <VideoPlayer track={localTracks.video} /> : <AvatarTile micOn={micOn} camOn={camOn} />}
            <button
              onClick={() => makeFullScreen(localTracks.video)}
              className="absolute top-1 right-1 bg-gray-700 text-white p-1 rounded"
            >
              <FaExpand />
            </button>
          </div>
        )}

        {Object.values(remoteUsers).map((user) =>
          user.videoTrack && mainTrack !== user.videoTrack ? (
            <div
              key={user.uid}
              className="relative w-52 h-32 bg-black rounded-lg overflow-hidden border border-white shadow flex items-center justify-center"
            >
              <VideoPlayer track={user.videoTrack} />
              <button
                onClick={() => makeFullScreen(user.videoTrack)}
                className="absolute top-1 right-1 bg-gray-700 text-white p-1 rounded"
              >
                <FaExpand />
              </button>
            </div>
          ) : null
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 py-3 flex justify-center gap-6">
        {!joined ? (
          <button onClick={handleJoinClick} className="px-4 py-2 bg-green-600 rounded-lg text-white">
            Join
          </button>
        ) : (
          <>
            <button
              onClick={leaveCall}
              className="px-4 py-2 bg-red-600 rounded-lg text-white flex items-center gap-2"
            >
              <FaPhoneSlash /> Leave
            </button>

            <button
              onClick={toggleMic}
              className={`px-4 py-2 rounded-full text-white ${!micOn ? "bg-blue-500" : "bg-gray-700"}`}
            >
              {micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
            </button>

            <button
              onClick={toggleCamera}
              className={`px-4 py-2 rounded-full text-white ${!camOn ? "bg-blue-500" : "bg-gray-700"}`}
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
          </>
        )}
      </div>
    </div>
  );
};

export default VideoCall;
