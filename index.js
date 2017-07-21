var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

var _ = require('lodash');
const uuidv4 = require('uuid/v4');

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

// Socket Gamestate
function setupGameState(socket) {
	socket.gameState = {
		roomName: '',
		inGame: false
	};
}
function setGameStateVar(socket, key, val) {
	socket.gameState[key] = val;
}
function getGameStateVar(socket, key) {
	return socket.gameState[key];
}

// Rooms
function getRooms(io) {
	return io.sockets.adapter.rooms;
}

function getRoom(io, targetRoom) {
	return getRooms(io)[targetRoom];
}

function getSockets(io) {
	return _.keys(io.sockets.sockets);
}
function getSocket(io, socketId) {
	return io.sockets.sockets[socketId];
}

function getGameRooms(io) {
	const sockets = getSockets(io);
	const rooms = getRooms(io);

	const gameRooms = {};
	_.forEach(rooms, function(room, roomName) {
		if(!_.includes(sockets, roomName)) {
			gameRooms[roomName] = room;
		}
	});
	return gameRooms;
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
	socket.join(roomName);
	setGameStateVar(socket, 'roomName', roomName);

	console.log('roomName: ', roomName);
	return roomName;
}

function startGame(io, socket) {
	console.log('startGame: ', socket.id);

	const roomName = joinRoom(io, socket);
	const room = getRoom(io, roomName);
	if(room.length === 1) {
		// TODO: Setup room's game state
	}
	else if(room.length === 2) {
		_.forEach(_.keys(room.sockets), function(socketId) {
			setGameStateVar(getSocket(io, socketId), 'inGame', true);
		});
		io.in(roomName).emit('In Game');
	}
}

io.on('connection', function(socket){
	console.log('client connected: ', socket.id);

	// Setup Game State
	setupGameState(socket);

	console.log('Game Rooms: ', getGameRooms(io));

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
