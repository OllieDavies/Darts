var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var http = require('http');
var WebSocketServer = require('websocket').server;

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

var os = require( 'os' );
var ip = os.networkInterfaces().en0[1].address + ':' + 3000;

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res) {
	res.render('index', {players: players, ip: ip});
});

app.get('/viewer', function(req, res) {
	res.render('viewer', {players: players});
});

app.get('/controller', function(req, res) {
	res.render('controller', {players: players, nextPlayerName: nextPlayerName});
});

app.get('/restart', function(req, res) {
	players[0].score = 401;
	players[1].score = 401;
	
	nextPlayer = 0,
	nextPlayerName = players[nextPlayer].name,
	started = false;
	
	sendToAll(JSON.stringify({
        command: 'newest',
        players: players,
        nextPlayer: nextPlayer,
        nextPlayerName: players[nextPlayer].name
    }));

	res.redirect('/controller');
});

app.get('/reset', function(req, res){
	players = [
		{name: 'Player 1', score: 401},
		{name: 'Player 2', score: 401}
	];
	
	nextPlayer = 0,
	nextPlayerName = players[nextPlayer].name,
	started = false;
	
	sendToAll(JSON.stringify({
        command: 'newest',
        players: players,
        nextPlayer: nextPlayer,
        nextPlayerName: players[nextPlayer].name
    }));

	res.redirect('/');
	
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
	app.use(function(err, req, res, next) {
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: err
		});
	});
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: {}
	});
});

var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});

server.listen(3001, function() { });

wsServer = new WebSocketServer({
    httpServer: server
});

var clients = [], 
	players = [
		{name: 'Dan', score: 401},
		{name: 'Ollie', score: 401}
	],
	nextPlayer = 0,
	nextPlayerName = players[nextPlayer].name,
	started = false;

wsServer.on('request', function(request) {
	var connection = request.accept(null, request.origin),
		index = clients.push(connection) - 1;

	connection.on('close', function(connection) {
        clients.splice(index, 1);
		console.log('Client ' + request.remoteAddress + ': Disconnected');
	});
	
	connection.send(JSON.stringify({
        command: 'newest',
        players: players,
        nextPlayer: nextPlayer,
        nextPlayerName: players[nextPlayer].name
    }));
	
	connection.on('message', function(message){
		if (message.type === 'utf8') {
        	console.log('Received Message: ' + message.utf8Data);
        	var data = JSON.parse(message.utf8Data);
        	
        	players[data.player].score -= data.score;
        	
        	if(nextPlayer == 0){
        		nextPlayer = 1;
        	} else {
        		nextPlayer = 0;
        	}
        	
        	var d = {
        		command: 'update',
        		data: {
        			player: data.player,
        			score: players[data.player].score,
        			justscored: data.score,
        			nextPlayer: nextPlayer,
        			nextPlayerName: players[nextPlayer].name
        		}
        	};

        	sendToAll(JSON.stringify(d));
    	}
	});

	console.log('Client ' + request.remoteAddress + ': Connected');
});


function sendToAll(utf8Data){
	for(client in clients){
		clients[client].send(utf8Data);
	}
}


module.exports = app;