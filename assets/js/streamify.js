function broadcastStream(data){

    data.clientSocketId = (typeof data.clientSocketId != 'undefined') ? data.clientSocketId : false;
    data.state          = (typeof data.state != 'undefined') ? data.state : false;
    data.camera         = (typeof data.camera != 'undefined') ? data.camera : false;
    data.microphone     = (typeof data.microphone != 'undefined') ? data.microphone : false;
    data.socket         = (typeof data.socket != 'undefined') ? data.socket : false;
    data.webRTCconfig   = (typeof data.webRTCconfig != 'undefined') ? data.webRTCconfig : {
        iceServers: [
            { 
            "urls": "stun:stun.l.google.com:19302",
            },
             { 
               "urls": "turn:turn.patrila.app:5349",
               "username": "user",
               "credential": "somepassword"
             }
        ]
    };
   
    if(!data.camera) {
        return new Promise.reject('Camera not found');
    }

    if(!data.microphone) {
        return new Promise.reject('Microphone not found');
    }

    if(!data.socket) {
        return new Promise.reject('Socket not found');
    }

    if(!data.clientSocketId) {
        return new Promise.reject('Client Socket ID not found');
    }

    if(!data.state) {
        return new Promise.reject('State not found');
    }

    if (window.stream) {
        window.stream.getTracks().forEach(track => {
            track.stop();
        });
    }



 

    return new Promise( (resolve,reject)=>{

        //Open microphone and camera
        navigator.mediaDevices.getUserMedia({
            audio: { deviceId: data.microphone ? { exact: data.microphone } : undefined },
            video: { deviceId: data.camera ? { exact: data.camera } : undefined }
        }).then((stream)=>{
        
            window.stream = stream;
                
            const peerConnection    = new RTCPeerConnection(data.webRTCconfig);        
        
        
            stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
        
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    data.socket.emit("candidate", data.clientSocketId, event.candidate);
                }
            };
            
            //Send connection offer to client
            peerConnection
                .createOffer()
                .then(sdp => peerConnection.setLocalDescription(sdp))
                .then(() => {
                    data.socket.emit("offer", data.clientSocketId, peerConnection.localDescription,data.state.name);
                });


            data.socket.on("answer", (id, description) => {
                peerConnections[id].setRemoteDescription(description);
            });

            data.socket.on("candidate", (id, candidate) => {
                peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
            });
              

            resolve({
                stopStream:()=>{

                    //Stop all stream
                    if (window.stream) {
                        window.stream.getTracks().forEach(track => {
                            track.stop();
                        });
                    }
                    
                    //Close peer connection
                    peerConnection.close();
                }
            });

        }).catch((err)=>{
            
            //Stop all stream
            if (window.stream) {
                window.stream.getTracks().forEach(track => {
                    track.stop();
                });
            }
            
            reject(err);
            console.log('Error: unable to broadcast',err);
        });

    });
  
}


function getMediaCaptureDevices(){
    
    return new Promise( (resolve,reject) =>{

        navigator.mediaDevices.enumerateDevices().then((deviceInfos)=>{
        
            let audioDevices = [];
            let videoDevices = [];
    
            let audio_i = 1;
            let video_i = 1;
    
            for (const deviceInfo of deviceInfos) {
                
                if (deviceInfo.kind === "audioinput") {
                    
                    audioDevices.push({
                        id:deviceInfo.deviceId,
                        name:deviceInfo.label || `Microphone ${audio_i++}`
                    });
                    
                } else if (deviceInfo.kind === "videoinput") {
                    
                    videoDevices.push({
                        id:deviceInfo.deviceId,
                        name:deviceInfo.label || `Camera ${video_i++}`
                    });
                }
            }
    
            resolve({
                video: videoDevices,
                audio: audioDevices
            });
        });
    
    });
    
}


function viewStream(data){
    
    data.videoElement   = (typeof data.videoElement != 'undefined') ? data.videoElement : undefined;
    data.broadcasterId  = (typeof data.broadcasterId != 'undefined') ? data.broadcasterId : undefined;
    data.socket         = (typeof data.socket != 'undefined') ? data.socket : undefined;
    data.onMessage      = (typeof data.onMessage != 'undefined') ? data.onMessage : (message)=>{};
    data.onStreamEnd    = (typeof data.onStreamEnd != 'undefined') ? data.onStreamEnd : (message)=>{};
    data.streamId       = (typeof data.streamId != 'undefined') ? data.streamId : false;
    data.webRTCconfig   = (typeof data.webRTCconfig != 'undefined') ? data.webRTCconfig : {
        iceServers: [
            { 
            "urls": "stun:stun.l.google.com:19302",
            },
            { 
                "urls": "turn:turn.patrila.app:5349",
                "username": "user",
                "credential": "somepassword"
            }
        ]
    };

    let status = {
        connected: false
    };

    let peerConnections;

    data.socket.on("offer", (id, description) => {
  
        peerConnection = new RTCPeerConnection(data.webRTCconfig);
        
        peerConnection
            .setRemoteDescription(description)
            .then(()  => peerConnection.createAnswer())
            .then(sdp => peerConnection.setLocalDescription(sdp))
            .then(() => {
                data.socket.emit("answer", id, peerConnection.localDescription);
            });
    
    
        peerConnection.ontrack = event => {
            data.videoElement.srcObject = event.streams[0];
            status.connected = true;
        };
    
        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                data.socket.emit("candidate", id, event.candidate);
            }
        };
  
    });
  
    data.socket.on("candidate", (id, candidate) => {
        peerConnection
            .addIceCandidate(new RTCIceCandidate(candidate))
            .catch(e => console.error(e));
    });

    data.socket.on("onMessage", (message) => {
        data.onMessage(message);
    });

    data.socket.on("onMessage", (message) => {
        console.log('fired',message);
    });

    data.socket.on("streamEnd", () => {
        data.onStreamEnd();
    });

    data.socket.emit('viewStream',{
        id: data.broadcasterId,
        streamId:data.streamId
    });


    window.onunload = window.onbeforeunload = () => {
        data.socket.close();
        if(typeof peerConnections['close'] != 'undefined'){
            peerConnection.close();
        }
        
    };
      

    return {
        send:(message)=>{

            if(status.connected){
                data.socket.emit("sendMessage",data.broadcasterId,message);
                return true;
            }
            
            return false;
           
        },
        disconnect: ()=>{

        },
        status:status
    }
}