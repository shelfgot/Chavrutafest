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

navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
window.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;

  
var peerConnection, smallConnection, smallCandidateId, smallVideoCounter = 0, userStream, uuid,
                  screenName, emailAddress, otherScreenName, otherEmailAddress;
var connectionConfig = {
                  'iceServers': [
                    {'urls': 'stun:stun.stunprotocol.org:3478'},
                    {'urls': 'stun:stun.l.google.com:19302'},
                  ],
                  'mandatory': {
                      'OfferToReceiveAudio': true
                    }
                };
//now we need to make a new rtc channel
peerConnection = new RTCPeerConnection(connectionConfig);
                  
  //when rtc gets another track, make that the OTHER video
                  peerConnection.ontrack = function(event) {
                    
                      document.getElementById("otherVideo").srcObject = event.streams[0];
                      $('.bottomBar').css({"display": 'block'});
                      if(document.getElementsByClassName('info').length === 0) {
                        $('.bottomBar').append("<p class='info' style='position: absolute; bottom: 0; left: 0'>"+emailAddress+"</p><p class='info' style='position: absolute; bottom: 10vh; left: 0'>"+screenName+"</p><p class='info' style='position: absolute; bottom: 0; left: 50vw'>"+otherEmailAddress+"</p><p class='info' style='position: absolute; bottom: 10vh; left: 50vw'>"+otherScreenName+"</p>");
                      }
                    };

//now we must set up the other rtc channel for the smaller videos.
smallConnection = new RTCPeerConnection(connectionConfig);
smallConnection.ontrack = function(event) {
  smallVideoCounter++;
  try {
    document.getElementById("thumb"+smallConnection).srcObject = event.streams[0];
  }
  catch (error) {
    console.log("Full house!");
  }
};
                
//HTML stuff
      $(document).ready(function(){
        //set all of the small video volumes
        $('.small').prop("volume", 0.2);
        //frontpage functionality
        var eye_clicked = false;
        var beard_clicked = false;
        $('.beard').hover(function() {
          $('.beard').attr('fill-opacity', "0.5").css({'cursor': 'pointer'});
        }, function() {
          if(!beard_clicked) {
          $('.beard').attr('fill-opacity', "0.0");
          }
        });
        $('.beard').click(function(event){
          beard_clicked = true;
          $(this).attr('fill-opacity', "0.5").css({'cursor': 'pointer'});
          $('.arrow-up-orange').css({'position': 'absolute', 'top': event.pageY, 'left': event.pageX, 'opacity': '0.8', 'z-index': '100'});
          $('.explanation-orange').css({'position': 'absolute', 'top': event.pageY + 15, 'left': event.pageX - 200, 'opacity': '0.8', 'z-index': '100'});
          $('.welcome-wrapper').css({'display': 'block'});
          //take off eye, if up
          $('.sign-up-wrapper').css({'display': 'none'});
        });
        $('.eye').hover(function() {$('.eye').attr('fill-opacity', "0.5").css({'cursor': 'pointer'});}, function() {$('.eye').attr('fill-opacity', "0.0") })
        $('.eye').click(function(event){
          eye_clicked = true;
          $(this).attr('fill-opacity', "0.5").css({'cursor': 'pointer'});
          $('.arrow-up-blue').css({'position': 'absolute', 'top': event.pageY, 'left': event.pageX, 'opacity': '0.6', 'z-index': '100'});
          $('.explanation-blue').css({'position': 'absolute', 'top': event.pageY + 15, 'left': event.pageX - 200, 'opacity': '0.9', 'z-index': '100'});
          $('.sign-up-wrapper').css({'display': 'block'});
          //take off beard
          $('.welcome-wrapper').css({'display': 'none'});
        });
        
        
        //Once the submit button is clicked on the eye, it's time to bring in the big overlay.
        $('.login').submit(function(event){
          event.preventDefault();
          grecaptcha.execute();
          $('.overlay').css({display: 'block', width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0, "z-index": 200}).append("<input type='submit' class='start' value='Start!' style='background: #2299ff; color: white; font-family: arial; width: 20vw; height: 8vh; position: relative; left: 40vw; border: none; border-radius: 4vh; font-size: 1.3em; margin-top: 10vh;'></input>");
          $('.overlay').animate({'opacity': 1}, 1500);
          console.log("overlay set:"+$('.overlay').css("display"))
        });
        //Then, once the submit button on the explanatory overlay is clicked, time to completely make over the entire page...
        $(document).on('click','.start',function(){
          $(this).remove();
          $('svg').remove();
          //get the email and screen name
          screenName = $('#screen-name').val();
          emailAddress = $('#email').val();
          console.log("Our screen name is "+screenName+" and our email is "+emailAddress);

          $('.videoOverlay').css({display: 'block', width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0, background: '#fff', "z-index": 3000, opacity: 1});
            


          
              var errorHandler = function(error) {
                console.log("error: "+error);
              };
              
                //set up user's own video
              if(navigator.mediaDevices.getUserMedia) {
                //both video and audio
                  navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                  }).then(function(stream) {
                      console.log("got the stream");
                      userStream = stream;
                  
                      document.getElementById("userVideo").srcObject = stream;
                       
                      peerConnection.addStream(stream);
                      smallConnection.addStream(stream);
                                            
                      var random = "yes";
                      if ($('#room-name').val() !== '') {
                        random = $('#room-name').val();
                      }
                                            
                      //socket communication stuff
                      var socket = io.connect('', {'query':'random='+random});
                      uuid = createUUID();
                      var roomName;
                      
                      //small video stuff
                      //1. We receive the call from the server, telling us that someone new has connected.
                      socket.on('small_candidate', (candidateId) => {
                      //1a. We create an offer in response.
                        smallConnection.createOffer().then(offer => {
                        //2. We set local description and then send it back to the server.
                          smallConnection.setLocalDescription(offer);
                          socket.emit('small_candidate_response', JSON.stringify({'sdp': smallConnection.localDescription, 'address': candidateId}));
                        });
                      });
                      //3. In the meantime, our server has sent two things back to the most recent connectee: (1) the sdp, and (2) the requester's socket id. Here we deal with the acceptance of such a response:
                      socket.on('small_candidate_response', (candidateResponseData) => {
                      //4. We set our remote description.
                        smallConnection.setRemoteDescription(new RTCSessionDescription(candidateResponseData.sdp)).then(function() {
                          if(candidateResponseData.sdp.type == 'offer') {
                      //5. We make an answer.
                            smallConnection.createAnswer().then(answer => {
                              smallConnection.setLocalDescription(answer);
                      //6. We now reciprocate and send our details to the remote computer, and since it's not an offer, it will just set the remote description to the same, and it should work out.
                              smallCandidateId = candidateResponseData.candidateId;
                              socket.emit('small_candidate_response', JSON.stringify({'sdp': smallConnection.localDescription, 'address': smallCandidateId}) );
                              
                            });
                          }
                        });
                      });
                      //7. Behind the scenes, we have now set the two RTC channels to the same remote session description. Thus we begin to start exchanging webrtc ice candidates (read: ways we can share info). Here is the handler for what happens when the connection occurs:
                      smallConnection.onicecandidate = function(event) {
                          if(event.candidate !== null) {
                      //8. Send the ice candidate to the other computer.
                            socket.emit('small_ice', JSON.stringify({'ice': event.candidate, 'uuid': uuid}));
                          }
                      }
                      //9. Grab the ice candidate on the other side:
                      socket.on('small_ice_candidate', (iceCandidateData) => {
                      //9a. Make sure it isn't us pinging ourselves:
                        if(iceCandidateData.uuid == uuid) return;
                      //10. Add ice candidate to list
                        smallConnection.addIceCandidate(new RTCIceCandidate(iceCandidateData.ice));
                      });
                      //Not sure if this is going to work because the ice isn't being sent to the right place...
                      
                      
                      
                      
                      
                      //now for the main video stuff...
                      //this is the case when the user is first...
                      socket.on('roomCall', (room) => {
                        //we have the assigned room name.
                        roomName = room;
                        console.log("we were assigned room num "+ roomName);
                        socket.emit('setRoom', room);
                        peerConnection.createOffer().then(offer => {
                          peerConnection.setLocalDescription(offer);
                          console.log("offer created from "+peerConnection.localDescription);
                           socket.emit('connectRequest', JSON.stringify({'sdp': peerConnection.localDescription, 'uuid': uuid, 'room': room, 'screenName': screenName, 'emailAddress': emailAddress}) );
                           
                              socket.emit('started', roomName);
                        });
                        
                      });
                      //the other case-scenario - what happens if you are the second person and you recieve a request?
                      socket.on('connectRequest', (data) => {
                        if(data.uuid==uuid) {return;}
                        console.log("we got a new connection req from "+data.screenName+", whose email is "+data.emailAddress);
                        otherScreenName = data.screenName;
                        otherEmailAddress = data.emailAddress;
                        //set clock
                        var sec = 0;
                        function pad ( val ) { return val > 9 ? val : "0" + val; }
                        setInterval( function(){
                            $("#seconds").html(pad(++sec%60));
                            $("#minutes").html(pad(parseInt(sec/60,10)));
                        }, 1000);
                        
                        peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(function() {
                          
                          console.log("we got a new connect request! num: "+data);
                          
                          if(data.sdp.type == 'offer') {
                            peerConnection.createAnswer().then(answer => {
                              console.log("we provided an answer!");
                              peerConnection.setLocalDescription(answer);
                              socket.emit('connectRequest', JSON.stringify({'sdp': peerConnection.localDescription, 'uuid': uuid, 'room': roomName, 'screenName': screenName, 'emailAddress': emailAddress}) );
                            });
                          }
                        });
                      });
                      //ice sorcery part.
                         //when rtc finds an ice candidate
                      peerConnection.onicecandidate = function(event) {
                        
                          if(event.candidate !== null) {
                            console.log("adding ice.");
                            socket.emit('ice', JSON.stringify({'ice': event.candidate, 'uuid': uuid, 'room': roomName, 'chavruta': true}));
                          }
                      }
                     peerConnection.oniceconnectionstatechange = function() {
                        
                           if(peerConnection.iceConnectionState === 'disconnected') {
                             console.log("disconnected");
                              $('.disconnect').css({'position': 'absolute', 'display': 'block', 'width': '50vw', 'right': 0, 'background': 'black', 'color': 'white', 'font-family': 'Arial', 'text-align': 'center'});
                              peerConnection.close();
                            }
                      }
                      
                      //event listener for ice candidates
                      socket.on('ice', (iceCandidateData) => {
                        console.log("ice coming!");
                        //check that the sender isn't the same person as the responder
                        if(iceCandidateData.uuid == uuid) {
                         return;
                        }
                          //now add ice candidate to list
                          peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidateData.ice));
                        
                      });
                      
                      //get room name
                      socket.on('setRoom', (room) => {
                        console.log("we set the room name.");
                        roomName = room;
                      });
                      
                      socket.on('end', () => {
                        location.reload();
                      });
                      
                      
                      // Taken from http://stackoverflow.com/a/105074/515584
                      // Strictly speaking, it's not a real UUID, but it gets the job done here
                      function createUUID() {
                      function s4() {
                        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
                      }
                      
                      return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
                      }
                      
                      
                      
                      
                      
                      }).catch(e => errorHandler(e));
              }
                
                
                
                
               


  });
});



