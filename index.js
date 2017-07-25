var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

var _ = require('lodash');
const uuidv4 = require('uuid/v4');

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

var helpers = require('./socketHelpers');


function joinRoom(io, socket) {
	var roomName = helpers.findVacantRoom(io);
	if(!roomName) {
		roomName = uuidv4();
	}

	// Join Room
	socket.join(roomName);

	console.log('roomName: ', roomName);
	return roomName;
}

function startGame(io, socket) {
	if(!helpers.socketIsInRoom(socket)) {
		console.log('startGame: ', socket.id);

		const roomName = joinRoom(io, socket);
		const room = helpers.getRoom(io, roomName);
		if(room.length <= 1) {
			// TODO: Setup room's game state
			helpers.setupGameStateRoom(io, roomName);
		}
		else if(room.length === 2) {
			io.in(roomName).emit('In Game');
		}
	}
	else {
		console.log('socket already in room!');
	}
}

io.on('connection', function(socket){
	console.log('client connected: ', socket.id);

	console.log('Game Rooms: ', helpers.getGameRooms(io));

	socket.on('start game', function() {
		startGame(io, socket);
	});
	socket.on('ready', function() {
		// Find room this socket is in
		var room = helpers.getSocketRoom(io, socket);
		if(room) {
			console.log(room);
			// If both are ready, start game
			console.log('room');
		}
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
