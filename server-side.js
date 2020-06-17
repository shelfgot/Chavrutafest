var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var fs = require('fs');

var listOfUnconnectedSockets = [];

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/Chavrutafest.html');
  console.log("you just got served!")
  if(req.get('X-Forwarded-Proto')!='https') {
    res.redirect("https://" + req.headers.host + req.url);
  }
});

app.get('/client-side.js', (req, res) => {
  res.writeHead(200, {'Content-Type': 'application/javascript'});
  res.end(fs.readFileSync(__dirname + '/client-side.js'));
  console.log("you just got served javascript!")
});



var connectUsers = function() {
  if(listOfUnconnectedSockets.length > 1) {
    console.log(listOfUnconnectedSockets);
    //there are two users. let's match them up. 1) grab their information
    var secondUserInfo = listOfUnconnectedSockets.pop().id;
    var firstUserInfo = listOfUnconnectedSockets.pop().id;
    //2) grab them
    var secondUser = io.sockets.sockets[secondUserInfo];
    var firstUser = io.sockets.sockets[firstUserInfo];
    if(typeof(firstUser) == 'undefined') { return;}
    var roomName =  firstUserInfo + "+" + secondUserInfo;
    console.log("room "+roomName+" was created, with"+firstUser+" and "+secondUser);
    //3) join them to a room
    firstUser.join(roomName);
    secondUser.join(roomName);
    //4) send room name to the firstUser
    firstUser.emit('roomCall', roomName);
  }
};

//what to do when a new user connects
io.on('connection', (socket) => {
  console.log('a user connected');
  //add the new user to the list of unconnected users.

    //random is either yes if it's random or it's the name of the room
    if(socket.handshake.query.random == "yes") {

      listOfUnconnectedSockets.push({'id': socket.id});
      connectUsers();
    }
    else {
      socket.join(socket.handshake.query.random);
      socket.emit('roomCall', socket.handshake.query.random);
    }

  //small video connections!
  /*
  STRATEGY:
  -emit to everyone
  -see client-side.js for rest.
  */
 
  socket.broadcast.emit('small_candidate', socket.id);
  socket.on('small_candidate_response', (data) => {
    console.log("creating small candidate response...");
    io.to(JSON.parse(data).address).emit('small_candidate_response', JSON.stringify({'sdp': JSON.parse(data.sdp), 'address': socket.id}));
  });
  socket.on('small_ice', (iceData) => {
    socket.emit('small_ice_candidate', iceData);
  });
 
  //connect the socket to an unconnected user, if such user exists

  socket.on('connectRequest', (input) => {
    console.log("we have a connect request");
    input = JSON.parse(input);
    io.to(input.room).emit('connectRequest', input);
  });
  socket.on('setRoom', (roomName) => {
    console.log("sending room number "+roomName+" down the line.");
    io.to(roomName).emit('setRoom', roomName);
  });
  socket.on('ice', (iceData) => {
    iceData = JSON.parse(iceData);
    io.to(iceData.room).emit('ice', iceData);
  });
  socket.on('started', (room) => {
    setTimeout(function() {
      io.to(room).emit('end')}, 900000);
  });
});


http.listen(process.env.PORT || 3000, () => {
  console.log('listening on *:3000');
});