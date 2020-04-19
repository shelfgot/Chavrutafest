var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var listOfUnconnectedSockets;

app.get('/', (req, res) => {
  res.sendFile('Chavrutafest.html');
});

var connectUsers = function() {
  if(listOfUnconnectedSockets.length > 1) {
    //there are two users. let's match them up. 1) grab their information
    var secondUserInfo = listOfUnconnectedSockets.pop().id;
    var firstUserInfo = listOfUnconnectedSockets.pop().id;
    //2) grab them
    var secondUser = io.sockets.connected[secondUserInfo];
    var firstUser = io.sockets.connected[firstUserInfo];
    var roomName =  firstUserInfo + "+" + secondUserInfo;
    console.log("room "+roomName+" was created.")
    //3) join them to a room
    firstUser.join(roomName);
    secondUser.join(roomName);
    //4) send room name to the firstUser
    firstUser.emit('roomCall', roomName);
  }
}

//what to do when a new user connects
io.on('connection', (socket) => {
  console.log('a user connected');
  //add the new user to the list of unconnected users.
  listOfSockets.push({'id': socket.id});
  //connect the socket to an unconnected user, if such user exists
  connectUser();
});

http.listen(3000, () => {
  console.log('listening on *:3000');
});