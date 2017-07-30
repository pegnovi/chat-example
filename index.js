var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

var _ = require('lodash');
const uuidv4 = require('uuid/v4');

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

var helpers = require('./socketHelpers')(io);


function joinRoom(socket) {
	var roomName = helpers.findVacantRoom();
	if(!roomName) {
		roomName = uuidv4();
	}

	// Join Room
	socket.join(roomName);

	const room = helpers.getRoom(roomName);

	// Setup gameState
	const gameState = helpers.setupGameStateIfNone(room);
	gameState.addSocketState(socket.id);

	console.log('roomName: ', roomName);
	return {
		roomName,
		room
	};
}

function joinGame(socket) {
	// Ensure socket isn't already in another room
	if(!helpers.socketIsInRoom(socket)) {
		console.log('joinGame: ', socket.id);

		const roomData = joinRoom(socket);

		if(roomData.room.length === 2) {
			io.in(roomData.roomName).emit('Room Complete');
		}
	}
	else {
		console.log('socket already in room!');
	}
}

io.on('connection', function(socket){
	console.log('client connected: ', socket.id);

	console.log('Game Rooms: ', helpers.getGameRooms());

	socket.on('join game', function() {
		joinGame(socket);
	});
	socket.on('ready', function() {
		// Find room this socket is in
		const roomData = helpers.getSocketRoomData(socket);
		const gameState = (roomData.room) ? roomData.room.gameState : null;

		if(gameState && gameState.getVar('state') === 'neutral') {

			gameState.setSocketStateVar(socket.id, 'state', 'ready');

			// If both are ready, start game
			if(gameState.gameIsReady()) {
				io.in(roomData.roomName).emit('Start Game');

				// Actually start the game phases & repeat if multiple rounds
				// Game phases server:
				// countdown -> emit to client that time is over. client will emit back choice
				// determine winner
				// repeat or end game
				if(gameState.hasRoundsLeft()) {
					io.in(roomData.roomName).emit('Round Start');

					gameState.setVar('state', 'timing');

					setTimeout(function() {
						console.log('Time Over');
						gameState.setVar('state', 'timeOver');
						io.in(roomData.roomName).emit('Time Over');
					}, gameState.timeLimit);
				}
				else {
					// Determine winner and End Game
				}

			}

		}
	});

	socket.on('Choice', function(data) {
		console.log(data);
		const roomData = helpers.getSocketRoomData(socket);
		const gameState = roomData.room.gameState;
		
		if(gameState.getVar('state') === 'timeOver') {
			console.log('CHOICE!!!');
			gameState.setSocketStateVar(socket.id, 'choice', data.choice);

			if(gameState.bothSocketsHaveChoice()) {
				console.log('YEY');

				gameState.scoreWinner();

				// reset choices
				gameState.setAllSocketStatesVar('choice', '');

				// increase round count
				gameState.increaseRound();

				// Send results

				// If any rounds left, start next round
				if(gameState.hasRoundsLeft()) {
					gameState.setVar('state', 'neutral');
					io.in(roomData.roomName).emit('Next Round');
				}
				else {
					//end game
					gameState.setVar('state', 'gameOver');

					const socketsInRoom = helpers.getSocketsInRoom(roomData.room);

					// Make both sockets leave the room
					_.forEach(socketsInRoom, function(socketInRoom) {
						socketInRoom.leave(roomData.roomName);
					});

					// At this point the room doesn't exist anymore

				}
			}
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
