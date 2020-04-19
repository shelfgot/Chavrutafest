/*
~~~
Created with lots of help from https://github.com/shanet/WebRTC-Example/blob/master/client/webrtc.js, https://socket.io/get-started/chat/, and especially https://www.html5rocks.com/en/tutorials/webrtc/basics/#toc-simple.
~~~
Parts in this code:
A) Set up the mechanism by which the client is let into the videocall space
1) Connect the user's video and audio.
2) Set up RTC
3) Set up socket connection and room.
4) Send and receive info about other person

*/












//set up variables we'll need later
var peerConnection, userStream, uuid,
    screenName, emailAddress, otherScreenName, otherEmailAddress;

//PART 1

//set up user's own video
if(navigator.mediaDevices.getUserMedia) {
  //both video and audio
    navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    }).then(function(stream) {
        userStream = stream;
        $('.userVideo').srcObject = userStream;
    }).catch(errorHandler);
}
else {
    alert('Your browser does not support getUserMedia API');
}
//handle errors in loading the user's stream
var errorHandler = function() {
  console.log("Error in loading user's stream.");
};






//PART 3
io.on('connection', (socket) => {
  
  
  
  //PART 2
  
  var peerConnectionConfig = {
    'iceServers': [
      {'urls': 'stun:stun.stunprotocol.org:3478'},
      {'urls': 'stun:stun.l.google.com:19302'},
    ]
  };
  //now we need to make a new rtc channel
  peerConnection = new RTCPeerConnection(peerConnectionConfig);
  //when rtc gets another track, make that the OTHER video
  peerConnection.ontrack = function(event) {
        $('.otherVideo').srcObject = event.streams[0];
      };
  //when rtc finds an ice candidate
  peerConnection.onicecandidate = addIce;
  //add our user's video to the rtc channel
  peerConnection.addStream(userStream);
  
    
  
  
  
  
  
  
  var roomName;
  uuid = createUUID();
  //this is the case when the user is first...
  socket.on('roomName', (room) => {
    //we have the assigned room name.
    roomName = room;
    socket.to(room).emit('setRoom', room)
    peerConnection.createOffer().then(function() {
       socket.to(room).emit('connectRequest', JSON.stringify({'sdp': peerConnection.localDescription, 'uuid': uuid, 'screenName': screenName, 'emailAddress': emailAddress}) );
    });
  });
  //the other case-scenario - what happens if you are the second person and you recieve a request?
  socket.on('connectRequest', (connectionData) => {
    peerConnection.setRemoteDescription(new RTCSessionDescription(connectionData.sdp)).then(function() {
      var data = JSON.parse(connectionData);
      //Put other person's screen name and email in the proper place
      $('.otherScreenName').html(data.screenName);
      $('.otherEmailAddress').html(data.emailAddress);
      // Only create answers in response to offers
      if(data.sdp.type == 'offer') {
        peerConnection.createAnswer().then(function() {
          
          socket.to(room).emit('connectRequest', JSON.stringify({'sdp': peerConnection.localDescription, 'uuid': uuid, 'screenName': screenName, 'emailAddress': emailAddress}) );
        }).catch(errorHandler);
      }
    })
  });
  //ice sorcery part. I don't really understand what's going on here
  var addIce = function(event) {
      if(event.candidate !== null) {
        socket.to(roomName).emit('ice', JSON.stringify({'ice': event.candidate, 'uuid': uuid}));
      }
  }
  //event listener for ice candidates
  socket.on('ice', (iceCandidateData) => {
    iceData = JSON.parse(iceCandidateData);
    //check that the sender isn't the same person as the responder
    if(iceData.uuid == uuid) {
     return;
    }
    //now add ice candidate to list
    peerConnection.addIceCandidate(new RTCIceCandidate(iceData.ice))
  });
  
  //get room name
  socket.on('setRoom', (room) => {
    roomName = room;
  });
});

// Taken from http://stackoverflow.com/a/105074/515584
// Strictly speaking, it's not a real UUID, but it gets the job done here
function createUUID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}