var express = require('express');
var http = require('http');
var path = require('path');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 8881);
  app.use(express['static']('public'));
});

var server = http.createServer(app).listen(app.get('port'), function(){
  console.log("Quietnet presentation server listening on port " + app.get('port'));
});

io = require('socket.io').listen(server);

var spawn = require('child_process').spawn,
child;

function startTone(pulsing){
  stopAudio();

  var command = pulsing ? 'slide6.py' : 'slide5.py';
  // yeeeeeeeeeppp
  child = spawn('python', [command], {cwd: '/Users/kate/Projects/quietnet/'});
  child.stdout.on('data', function(data){
    console.log(data.toString());
  });
  child.stderr.on('data', function(data){
    console.log(data.toString());
  });
}

function stopAudio() {
  if (child) {
    child.kill('SIGTERM');
  }
}

function sendMessage(message){
  stopAudio();
  child = spawn('python', ['send.py', message], {cwd: '/Users/kate/Projects/quietnet/'});

  child.stdout.on('data', function(data){
    console.log(data.toString());
  });
  child.stderr.on('data', function(data){
    console.log(data.toString());
  });
}

var channel_name = "quietnet";
io.sockets.on('connection', function (socket) {
  stopAudio();

  socket.join(channel_name);
  socket.in(channel_name).emit('wc', true);

  socket.on('tone', function (data) {
    if (data.on === true) {
      console.log('playing tone', data);
      startTone(data.pulsing);
    } else if (data.on === false) {
      console.log('stopping tone');
      stopAudio();
    }
  });

  socket.on('message', function (data) {
    if (data) {
      console.log('sending message', data);
      sendMessage(data);
    } else {
      console.log('stopping message');
      stopAudio();
    }
  });
});
