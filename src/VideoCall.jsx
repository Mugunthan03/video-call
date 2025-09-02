// import React, { useState, useEffect } from "react";
// import AgoraRTC from "agora-rtc-sdk-ng";
// import {
//   Mic,
//   MicOff,
//   Video,
//   VideoOff,
//   MonitorUp,
//   PhoneOff,
// } from "lucide-react";

// const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

// export default function VideoCall() {
//   const [joined, setJoined] = useState(false);
//   const [localTracks, setLocalTracks] = useState([]);
//   const [remoteUsers, setRemoteUsers] = useState([]);
//   const [isMicOn, setIsMicOn] = useState(true);
//   const [isCamOn, setIsCamOn] = useState(true);
//   const [isScreenSharing, setIsScreenSharing] = useState(false);
//   const [screenTrack, setScreenTrack] = useState(null);

//   const appId = "3af292aa36b34cf4a434142efbb86ab3";
//   const token = '0063af292aa36b34cf4a434142efbb86ab3IABMMTKK5EoCy01PPCxxuW3SpmZPexX7uIpexoBu7jXZ0DP7zn1EL5HfEAD6YsiyjOu3aAEAAQCM67do';
//   const channel = "consult_68b684ada345e9a0b182c5de";
//   const uid = '13937'



//   console.log("AppID:", appId);
// console.log("Channel:", channel);
// console.log("UID:", uid);
// console.log("Token:", token);

//   // Join Channel
//   const joinChannel = async () => {
//     await client.join(appId, channel, token, uid);

//     const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
//     setLocalTracks(tracks);

//     tracks[1].play("local-player");
//     await client.publish(tracks);

//     client.on("user-published", async (user, mediaType) => {
//       await client.subscribe(user, mediaType);
//       if (mediaType === "video") {
//         setRemoteUsers((prev) => [...prev, user]);
//         user.videoTrack.play(`remote-${user.uid}`);
//       }
//       if (mediaType === "audio") {
//         user.audioTrack.play();
//       }
//     });

//     client.on("user-unpublished", (user) => {
//       setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
//     });

//     client.on("user-left", (user) => {
//       setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
//     });

//     setJoined(true);
//   };

//   // Leave channel
//   const leaveChannel = async () => {
//     localTracks.forEach((track) => track.stop() && track.close());
//     if (screenTrack) {
//       await client.unpublish(screenTrack);
//       screenTrack.stop();
//       screenTrack.close();
//     }
//     await client.leave();
//     setRemoteUsers([]);
//     setJoined(false);
//   };

//   // Toggle mic
//   const toggleMic = async () => {
//     if (isMicOn) {
//       await localTracks[0].setEnabled(false);
//     } else {
//       await localTracks[0].setEnabled(true);
//     }
//     setIsMicOn(!isMicOn);
//   };

//   // Toggle camera
//   const toggleCam = async () => {
//     if (isCamOn) {
//       await localTracks[1].setEnabled(false);
//     } else {
//       await localTracks[1].setEnabled(true);
//     }
//     setIsCamOn(!isCamOn);
//   };

//   // Start/Stop Screen Share
//   const toggleScreenShare = async () => {
//     if (!isScreenSharing) {
//       const screenTrack = await AgoraRTC.createScreenVideoTrack();
//       setScreenTrack(screenTrack);
//       await client.unpublish(localTracks);
//       await client.publish(screenTrack);
//       screenTrack.play("main-view");
//       setIsScreenSharing(true);
//     } else {
//       await client.unpublish(screenTrack);
//       screenTrack.stop();
//       screenTrack.close();
//       await client.publish(localTracks);
//       localTracks[1].play("main-view");
//       setIsScreenSharing(false);
//     }
//   };

//   return (
//     <div className="w-full h-screen flex flex-col bg-black text-white">
//       {/* Main Area */}
//       <div className="flex-1 flex">
//         {/* Main video or screen share */}
//         <div id="main-view" className="flex-1 bg-black relative">
//           {!isScreenSharing && (
//             <div
//               id="local-player"
//               className="w-full h-full bg-gray-900 rounded-lg"
//             ></div>
//           )}
//         </div>

//         {/* Side panel (only in screen share mode) */}
//         {isScreenSharing && (
//           <div className="w-1/4 bg-gray-900 flex flex-col gap-2 p-2">
//             {remoteUsers.map((user) => (
//               <div
//                 key={user.uid}
//                 id={`remote-${user.uid}`}
//                 className="h-1/2 bg-gray-800 rounded-lg relative"
//               >
//                 <span className="absolute bottom-1 left-1 text-xs bg-black/50 px-2 rounded">
//                   User {user.uid}
//                 </span>
//               </div>
//             ))}
//           </div>
//         )}

//         {/* Floating thumbnail (only if NOT screen sharing) */}
//         {!isScreenSharing && remoteUsers.length > 0 && (
//           <div className="absolute bottom-4 right-4 w-40 h-28 bg-gray-800 rounded-lg shadow-lg overflow-hidden">
//             <div
//               id={`remote-${remoteUsers[0].uid}`}
//               className="w-full h-full"
//             ></div>
//           </div>
//         )}
//       </div>

//       {/* Control Bar */}
//       {joined && (
//         <div className="flex justify-center gap-6 py-3 bg-gray-900">
//           <button
//             onClick={toggleMic}
//             className="p-3 rounded-full bg-gray-700 hover:bg-gray-600"
//           >
//             {isMicOn ? <Mic /> : <MicOff />}
//           </button>

//           <button
//             onClick={toggleCam}
//             className="p-3 rounded-full bg-gray-700 hover:bg-gray-600"
//           >
//             {isCamOn ? <Video /> : <VideoOff />}
//           </button>

//           <button
//             onClick={toggleScreenShare}
//             className="p-3 rounded-full bg-gray-700 hover:bg-gray-600"
//           >
//             <MonitorUp />
//           </button>

//           <button
//             onClick={leaveChannel}
//             className="p-3 rounded-full bg-red-600 hover:bg-red-500"
//           >
//             <PhoneOff />
//           </button>
//         </div>
//       )}

//       {/* Join button */}
//       {!joined && (
//         <div className="absolute inset-0 flex items-center justify-center bg-black/80">
//           <button
//             onClick={joinChannel}
//             className="px-6 py-3 bg-green-600 text-white rounded-lg"
//           >
//             Join Meeting
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }


import React, { useEffect, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";

const APP_ID = "3af292aa36b34cf4a434142efbb86ab3"; // Replace with Agora App ID
const TOKEN = '0063af292aa36b34cf4a434142efbb86ab3IABMMTKK5EoCy01PPCxxuW3SpmZPexX7uIpexoBu7jXZ0DP7zn1EL5HfEAD6YsiyjOu3aAEAAQCM67do'; // Use generated token if you enabled certificate
const CHANNEL = "consult_68b684ada345e9a0b182c5de"; // Example channel name

//   const appId = "3af292aa36b34cf4a434142efbb86ab3";
//   const token = '0063af292aa36b34cf4a434142efbb86ab3IABMMTKK5EoCy01PPCxxuW3SpmZPexX7uIpexoBu7jXZ0DP7zn1EL5HfEAD6YsiyjOu3aAEAAQCM67do';
//   const channel = "consult_68b684ada345e9a0b182c5de";
  const uid = '13937'

const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

export default function VideoCall() {
  const [localTracks, setLocalTracks] = useState({ video: null, audio: null });
  const [remoteUsers, setRemoteUsers] = useState({});
  const [screenTrack, setScreenTrack] = useState(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    client.on("user-published", handleUserPublished);
    client.on("user-unpublished", handleUserUnpublished);

    return () => {
      client.off("user-published", handleUserPublished);
      client.off("user-unpublished", handleUserUnpublished);
    };
  }, []);

  const joinCall = async () => {
    await client.join(APP_ID, CHANNEL, TOKEN, uid);

    const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
    const camTrack = await AgoraRTC.createCameraVideoTrack();
    await client.publish([micTrack, camTrack]);

    setLocalTracks({ video: camTrack, audio: micTrack });
    setJoined(true);
  };

  const leaveCall = async () => {
    localTracks.video && localTracks.video.stop();
    localTracks.video && localTracks.video.close();
    localTracks.audio && localTracks.audio.close();
    screenTrack && screenTrack.close();

    await client.leave();
    setLocalTracks({ video: null, audio: null });
    setRemoteUsers({});
    setScreenTrack(null);
    setJoined(false);
  };

  const startScreenShare = async () => {
    const screen = await AgoraRTC.createScreenVideoTrack(
      { encoderConfig: "1080p_1" },
      "auto"
    );
    setScreenTrack(screen);
    await client.unpublish(localTracks.video);
    await client.publish(screen);
  };

  const stopScreenShare = async () => {
    if (screenTrack) {
      await client.unpublish(screenTrack);
      screenTrack.stop();
      screenTrack.close();
      setScreenTrack(null);

      await client.publish(localTracks.video);
    }
  };

  const handleUserPublished = async (user, mediaType) => {
    await client.subscribe(user, mediaType);
    if (mediaType === "video") {
      setRemoteUsers((prev) => ({ ...prev, [user.uid]: user }));
    }
    if (mediaType === "audio") {
      user.audioTrack && user.audioTrack.play();
    }
  };

  const handleUserUnpublished = (user, mediaType) => {
    if (mediaType === "video") {
      setRemoteUsers((prev) => {
        const updated = { ...prev };
        delete updated[user.uid];
        return updated;
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Video Grid */}
      <div className="flex-1 relative flex justify-center items-center gap-2 p-2">
        {/* Screen Share Fullscreen */}
        {screenTrack ? (
          <div className="relative w-full h-full">
            <div
              ref={(el) => el && screenTrack.play(el)}
              className="w-full h-full bg-black rounded-xl"
            ></div>
            <div className="absolute bottom-4 right-4 w-48 h-32 border-2 border-white rounded-lg overflow-hidden">
              {localTracks.video && !screenTrack && (
                <div ref={(el) => el && localTracks.video.play(el)} className="w-full h-full"></div>
              )}
              {Object.values(remoteUsers).map((user) => (
                <div key={user.uid} ref={(el) => el && user.videoTrack?.play(el)} className="w-full h-full"></div>
              ))}
            </div>
          </div>
        ) : (
          // Normal Call Layout
          <div className="grid grid-cols-2 gap-2 w-full h-full">
            <div className="bg-black rounded-xl overflow-hidden">
              {localTracks.video && (
                <div ref={(el) => el && localTracks.video.play(el)} className="w-full h-full"></div>
              )}
            </div>
            {Object.values(remoteUsers).map((user) => (
              <div key={user.uid} className="bg-black rounded-xl overflow-hidden">
                <div ref={(el) => el && user.videoTrack?.play(el)} className="w-full h-full"></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4 p-4 bg-gray-800">
        {!joined ? (
          <button
            onClick={joinCall}
            className="px-4 py-2 bg-green-600 rounded-lg shadow-md hover:bg-green-500"
          >
            Join Call
          </button>
        ) : (
          <>
            <button
              onClick={leaveCall}
              className="px-4 py-2 bg-red-600 rounded-lg shadow-md hover:bg-red-500"
            >
              Leave Call
            </button>
            {!screenTrack ? (
              <button
                onClick={startScreenShare}
                className="px-4 py-2 bg-blue-600 rounded-lg shadow-md hover:bg-blue-500"
              >
                Share Screen
              </button>
            ) : (
              <button
                onClick={stopScreenShare}
                className="px-4 py-2 bg-yellow-600 rounded-lg shadow-md hover:bg-yellow-500"
              >
                Stop Sharing
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
