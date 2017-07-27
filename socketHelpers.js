var _ = require('lodash');
const uuidv4 = require('uuid/v4');

class SocketState {
	constructor() {
		this.state = 'neutral';
		this.choice = '';
		this.score = 0;
	}
	setByKey(key, val) {
		this[key] = val;
	}
	getByKey(key) {
		return this[key];
	}
}

class GameState {
	constructor() {
		this.round = 0;
		this.maxRounds = 1;
		this.timeLimit = 3000;
		this.socketStates = {}; // map of SocketStates
	}
	addSocketState(socketId) {
		this.socketStates[socketId] = new SocketState();
	}
	setSocketState(socketId, state) {
		this.socketStates[socketId].setByKey('state', state);
	}
	setAllSocketStates(state) {
		const self = this;
		_.forEach(_.keys(this.socketStates), function(socketId) {
			self.setSocketState(socketId, state);
		});
	}
	getSocketState(socketId) {
		return this.socketStates[socketId].getByKey('state');
	}
	gameIsReady() {
		if(_.size(this.socketStates) === 2 &&
			_.isEmpty(_.filter(this.socketStates, (socketState) => socketState.state !== 'ready'))
		) {
			return true;
		}
		return false;
	}
}

module.exports = function(io) {
	return {
		getRooms: function() {
			return io.sockets.adapter.rooms;
		},
		getRoom: function(targetRoom) {
			if(targetRoom) {
				return this.getRooms()[targetRoom];
			}
			return null;
		},

		getSockets: function() {
			return _.keys(io.sockets.sockets);
		},
		getSocket: function(socketId) {
			return io.sockets.sockets[socketId];
		},

		getGameRooms: function() {
			const sockets = this.getSockets();
			const rooms = this.getRooms();

			const gameRooms = {};
			_.forEach(rooms, function(room, roomName) {
				if(!_.includes(sockets, roomName)) {
					gameRooms[roomName] = room;
				}
			});
			return gameRooms;
		},

		findVacantRoom: function() {
			const sockets = this.getSockets();
			const rooms = this.getRooms();

			var chosenRoomName = '';
			_.forEach(rooms, function(room, roomName) {
				if(!_.includes(sockets, roomName) && room.length < 2) {
					chosenRoomName = roomName;
					return false; // breakout
				}
			});
			return chosenRoomName;
		},


		setupGameState: function(room) {
			room.gameState = new GameState();
		},



		getSocketRoomData: function(socket) {
			var socketRooms = _.filter(socket.rooms, function(val, key) {
				return key !== socket.id;
			});
			return {
				roomName: _.head(socketRooms),
				room: this.getRoom(_.head(socketRooms))
			};
		},

		// Socket is by default inside a room with its own id
		socketIsInRoom: function(socket) {
			return _.size(socket.rooms) === 2;
		}

	}
};

