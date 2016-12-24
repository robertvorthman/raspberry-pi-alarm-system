var http = require('http');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var path = require('path');
var io = require('socket.io')(http);
var scratchRSP = require('scratch-rsp');
var ifttt = require('iftttmaker')
var maker = null;
var readConfig = require('read-config'),
    config = readConfig('./config.json');

if(config.makerKey){
	maker = ifttt(config.makerKey);
}

app.use(express.static(path.join(__dirname, 'public')));

//state
var scratchConnected = false;
var armed = 0;
var lastIftttTrigger = 0;

io.on('connection', function (socket) {

  socket.emit('status', { 
  	scratchConnected: scratchConnected,
  	armed: armed,
  	config: config
  });
  
  socket.on('arm', function (data) {
  	setState('armed');
    console.log('arm command received');
  });
  socket.on('disarm', function (data) {
  	setState('disarmed');
    console.log('disarm command received');
  });
});

var scratchSocket = scratchRSP.createConnection(config.host, function () {
    scratchConnected = true;
	console.log('Connected to Scratch');
	io.emit('online');
	scratchSocket.broadcast('init');
	scratchSocket.on('broadcast', handleScratchBroadcast);
});

scratchSocket.on('error', (e) => {
	console.log('ERROR unable to connect to scratch ');
	io.emit('offline');
});


function handleScratchBroadcast(subject){
	
	console.log('Scratch Broadcast '+subject);

	//subjects such as "alarm" and "clear"
	subject = subject.toLowerCase();
	
	io.emit(subject);
	
	//update local variable for getState web service
	switch(subject){
		case 'armed':
			armed = 1;
			break;
		case 'disarmed':
			armed = 0;
			break;
	}

	if(config.homebridgeWebhookPort && (subject == 'notify' || subject == 'alarm')){
		var httpOptions = {
			host: config.host,
			port: config.homebridgeWebhookPort,
			path: '/?accessoryId='+subject+'Sensor&state='+'true'
		}
		http.get(httpOptions);
	
		//deactivate sensor after cooldown period
		setTimeout(() => {
			httpOptions.path = '/?accessoryId='+subject+'Sensor&state='+'false';
			http.get(httpOptions);
		}, config.cooldownSeconds * 1000);
	}
	
	//send IFTTT notification as long as 60 seconds since last notification
	var now = new Date();
	var elapsed = now - lastIftttTrigger;
	if(config.makerKey && (elapsed >= config.iftttCooldownSeconds * 1000) && (subject == 'notify' || subject == 'alarm')){
		lastIftttTrigger = now;
		var message = 'motion-'+subject;
		
		maker.send(message).then(function () {
		  console.log('IFTTT request '+message+' sent');
		}).catch(function (error) {
		  console.log('Unable to send to IFTTT', error);
		});
	}
}

//home page
app.use('/', express.static(__dirname + '/public'));
/*
app.get('/', function (req, res) {
	if(scratchConnected){
		res.send('Alarm Server Online');
	}else{
		res.send('ERROR: Unable to connect to Scratch project.');
	}
})
*/

app.get('/setState/:state', function (req, res) {
	
	var targetState = req.params.state.toLowerCase();
	
console.log('Set state '+targetState);
	
	if(!scratchConnected){
		res.status(503).send('ERROR Scratch Not Connected');
		return;
	}

	switch(targetState){
		case 'armed':
			res.status(200).send('armed');
			setState(targetState);
			break;
		case 'disarmed':
			res.status(200).send('disarmed');
			setState(targetState);
			break;
		default:
			res.status(501).send('INVALID COMMAND.  Valid states are "armed" or "disarmed".');
			break;
	}

})

function setState(targetState){
	switch(targetState){
		case 'armed':
			scratchSocket.broadcast('armed');
			io.emit('armed', { armed: armed });
			armed = 1;
			break;
		case 'disarmed':
			scratchSocket.broadcast('disarmed');
			io.emit('disarmed', { armed: armed });
			armed = 0;
			break;
	}
}

app.get('/getState', function (req, res) {
	res.send(armed.toString());
});

//Start Server
http.listen(config.port, function() {
    console.log('Alarm System Server running at http://'+config.host+':'+config.port);
});