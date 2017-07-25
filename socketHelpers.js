var _ = require('lodash');
const uuidv4 = require('uuid/v4');

// Rooms
function getRooms(io) {
	return io.sockets.adapter.rooms;
}
function getRoom(io, targetRoom) {
	if(targetRoom) {
		return getRooms(io)[targetRoom];
	}
	return null;
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


module.exports.getRooms = getRooms;
module.exports.getRoom = getRoom;
module.exports.getSockets = getSockets;
module.exports.getSocket = getSocket;
module.exports.getGameRooms = getGameRooms;
module.exports.findVacantRoom = findVacantRoom;

function setupGameStateRoom(io, roomName) {
	const room = getRoom(io, roomName);
	if(room) {
		room.gameState = {
			round: 0,
			maxRounds: 1,
			timeLimit: 3000,
			sockets: {}
		};
	}
}
function getSocketRoom(io, socket) {
	var socketRooms = _.filter(socket.rooms, function(val, key) {
		return key !== socket.id;
	});
	return getRoom(io, _.head(socketRooms));
}

// Socket is by default inside a room with its own id
function socketIsInRoom(socket) {
	return _.size(socket.rooms) === 2;
}

module.exports.setupGameStateRoom = setupGameStateRoom;
module.exports.getSocketRoom = getSocketRoom;
module.exports.socketIsInRoom = socketIsInRoom;