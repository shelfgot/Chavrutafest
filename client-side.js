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

  
var peerConnection, userStream, uuid,
                  screenName, emailAddress, otherScreenName, otherEmailAddress;
var peerConnectionConfig = {
                  'iceServers': [
                    {'urls': 'stun:stun.stunprotocol.org:3478'},
                    {'urls': 'stun:stun.l.google.com:19302'},
                  ],
                  'mandatory': {
                      'OfferToReceiveAudio': true
                    }
                };
//now we need to make a new rtc channel
peerConnection = new RTCPeerConnection(peerConnectionConfig);
                  
  //when rtc gets another track, make that the OTHER video
                  peerConnection.ontrack = function(event) {
                    
                      document.getElementById("otherVideo").srcObject = event.streams[0];
                      
                      $(document).on('ready', function(){
                        $(this).closest('.start').remove();
                        $(this).closest('svg').remove();
                      });
                      $('.bottomBar').css({"display": 'block'});
                      if(document.getElementsByClassName('info').length === 0) {
                        $('.bottomBar').append("<p class='info' style='position: absolute; bottom: 0; left: 0'>"+emailAddress+"</p><p class='info' style='position: absolute; bottom: 10vh; left: 0'>"+screenName+"</p><p class='info' style='position: absolute; bottom: 0; left: 50vw'>"+otherEmailAddress+"</p><p class='info' style='position: absolute; bottom: 10vh; left: 50vw'>"+otherScreenName+"</p>");
                      }
                    };
                
//HTML stuff
      $(document).ready(function(){
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
          $('.overlay').css({display: 'block', width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0, "z-index": 200}).append("<input type='submit' class='start' value='Start!' style='background: #2299ff; color: white; font-family: arial; width: 20vw; height: 8vh; position: relative; left: 40vw; border: none; border-radius: 4vh; font-size: 1.3em; margin-top: 10vh;'></input>");
          $('.overlay').animate({'opacity': 1}, 1500);
          console.log("overlay set:"+$('.overlay').css("display"))
        });
        //Then, once the submit button on the explanatory overlay is clicked, time to completely make over the entire page...
        $(document).on('click','.start',function(){
          
          //get the email and screen name
          screenName = $('#screen-name').val();
          emailAddress = $('#email').val();
          console.log("Our screen name is "+screenName+" and our email is "+emailAddress);
       

          $('.videoOverlay').css({display: 'block', width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0, background: '#fff', "z-index": 3000, opacity: 1});
            

              //set up variables we'll need later
          
              
              
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
                      
                                            
                                            
                                            //socket communication stuff
                      var socket = io();
                      var roomName;
                      uuid = createUUID();
                      //this is the case when the user is first...
                      socket.on('roomCall', (room) => {
                        //we have the assigned room name.
                        roomName = room;
                        console.log("we were assigned room num "+ roomName);
                        socket.emit('setRoom', room);
                        peerConnection.createOffer().then(offer => {
                          peerConnection.setLocalDescription(offer);
                          console.log("offer created from "+peerConnection.localDescription)
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
                          
                          console.log("we got a new connect request! num: "+data)
                          
                          if(data.sdp.type == 'offer') {
                            peerConnection.createAnswer().then(answer => {
                              console.log("we provided an answer!")
                              peerConnection.setLocalDescription(answer);
                              socket.emit('connectRequest', JSON.stringify({'sdp': peerConnection.localDescription, 'uuid': uuid, 'room': roomName, 'screenName': screenName, 'emailAddress': emailAddress}) );
                            })
                          }
                        })
                      });
                      //ice sorcery part. I don't really understand what's going on here
                         //when rtc finds an ice candidate
                      peerConnection.onicecandidate = function(event) {
                        
                          if(event.candidate !== null) {
                            console.log("adding ice.");
                            socket.emit('ice', JSON.stringify({'ice': event.candidate, 'uuid': uuid, 'room': roomName}));
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
                        console.log("ice coming!")
                  
                        //check that the sender isn't the same person as the responder
                        if(iceCandidateData.uuid == uuid) {
                         return;
                        }
                        //now add ice candidate to list
                        peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidateData.ice))
                      });
                      
                      //get room name
                      socket.on('setRoom', (room) => {
                        console.log("we set the room name.");
                        roomName = room;
                      });
                      
                      socket.on('end', () => {
                        location.reload();
                      })
                      
                      // Taken from http://stackoverflow.com/a/105074/515584
                      // Strictly speaking, it's not a real UUID, but it gets the job done here
                      function createUUID() {
                      function s4() {
                        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
                      }
                      
                      return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
                      }
                      
                      
                      
                      
                      
                      });
              }
                
                
                
                
               


  });
});



