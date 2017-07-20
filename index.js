var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

var _ = require('lodash');
const uuidv4 = require('uuid/v4');

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});


function getRooms(io) {
	return io.sockets.adapter.rooms;
}

function getSockets(io) {
	return _.keys(io.sockets.sockets);
}

function findVacantRoom(io) {
	const sockets = getSockets(io);
	const rooms = getRooms(io);

	var chosenRoomName = '';
	_.forEach(rooms, function(room, roomName) {
		if(!_.includes(sockets, roomName) && room.length < 2) {
			chosenRoomName = roomName;
			return false; // breakout
		}
	});

	return chosenRoomName;
}

function joinRoom(io, socket) {
	var roomName = findVacantRoom(io);
	if(!roomName) {
		roomName = uuidv4();
	}

	// Join Room
	socket.join(roomName, function() {
		// emit back to client
		console.log(getRooms(io));
	});
}

function startGame(io, socket) {
	console.log('startGame: ', socket.id);

	joinRoom(io, socket);

}

io.on('connection', function(socket){
	console.log('client connected: ', socket.id);


	socket.on('start game', function() {
		startGame(io, socket);
	});


	socket.on('error', function(error) {
		console.log('error: ', error);
	});
	socket.on('disconnecting', function(reason) {
		console.log('client disconnecting: ', reason);
	});
	socket.on('disconnect', function(reason) {
		console.log('client disconnected: ', reason);
	});


  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});
