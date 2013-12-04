function drawBufferWave(data, numSamplesToShow) {
  if (!waveContext) {
    var canvas = document.getElementById("wave");
    waveContext = canvas.getContext('2d');
    waveContext.strokeStyle = visOptions.color;
    waveContext.strokeWidth = visOptions.strokeWidth;
  }

  waveContext.clearRect(0, 0, waveContext.canvas.width, waveContext.canvas.height);

  var amp = waveContext.canvas.height / 2;
  var step = Math.ceil( data.length / waveContext.canvas.width );
  if (numSamplesToShow && numSamplesToShow < data.length) {
    step = Math.ceil(numSamplesToShow / waveContext.canvas.width);
  }

  waveContext.beginPath();
  for(var i = 0; i < waveContext.canvas.width; i++){
    var subarray = data.subarray(i * step, i * step + step);
    var min = _.min(subarray);
    var max = _.max(subarray);
    waveContext.lineTo(i,amp - (min * amp) + ((max-min) * amp));
  }
  waveContext.stroke();
}

function updateWave() {
  if (!waveContext) {
    var canvas = document.getElementById("wave");
    waveContext = canvas.getContext('2d');
    waveContext.fillStyle = visOptions.color;
  }

  updateWaveData(data, 4096);

  fftRafID = window.requestAnimationFrame(updateWave);
}

function drawFFT(context, freqByteData) {
  var BAR_WIDTH = 1;
  var numBars = context.canvas.width;
  var multiplier = analyzerNode.frequencyBinCount / numBars;

  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.beginPath();
  for (var i = 0; i < numBars; ++i) {
    var magnitude = 0;
    var offset = Math.floor( i * multiplier );

    for (var j = 0; j < multiplier; j++) {
      magnitude += freqByteData[offset + j];
    }

    magnitude = magnitude / multiplier;
    var magnitude2 = freqByteData[i * multiplier];

    if (i === 0) {
      context.moveTo(i, context.canvas.height - magnitude);
    } else {
      context.lineTo(i, context.canvas.height - magnitude);
    }
  }
  context.stroke();
}

function updateFFT(time) {
  if (!fftContext) {
    var canvas = document.getElementById("fft");
    fftContext = canvas.getContext('2d');
    fftContext.lineCap = 'square';
    fftContext.fillStyle = visOptions.color;
    fftContext.strokeStyle = visOptions.color;
    fftContext.strokeWidth = visOptions.strokeWidth;
  }

  drawFFTsOverTime(fftContext, freqByteData);

  // this will cause the draw to loop
  fftRafID = window.requestAnimationFrame(updateAnalyzers);
}

function drawFFTsOverTime(context, freqByteData) {
  var numBars = context.canvas.width;
  var multiplier = analyzerNode.frequencyBinCount / numBars;

  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.beginPath();
  for (var i = 0; i < numBars; ++i) {
    var magnitude = 0;
    var offset = Math.floor( i * multiplier );

    for (var j = 0; j < multiplier; j++) {
      magnitude += freqByteData[offset + j];
    }

    magnitude = magnitude / multiplier;
    var magnitude2 = freqByteData[i * multiplier];

    if (i === 0) {
      context.moveTo(i, context.canvas.height - magnitude);
    } else {
      context.lineTo(i, context.canvas.height - magnitude);
    }
  }
  context.stroke();
}

var steps2 = [
  // go to the title slide
  {'do': function(){
    console.log('on title');
    impress().goto(0);
  }, 'undo': function(){
    impress().goto(0);
  }},
  {'do': function(){
    console.log('wave');
    impress().next();
  }, 'undo': function(){
    impress().prev();
  }},
  {'do': function(){
    console.log('analyzer');
    impress().next();
  }, 'undo': function(){
    impress().prev();
  }},
  {'do': function(){
    console.log('math');
    impress().next();
  }, 'undo': function(){
    impress().prev();
  }},
  {'do': function(){
    console.log('fft');
    impress().next();
  }, 'undo': function(){
    impress().prev();
  }},
  // start playing the tone
  {'do': function(){
      console.log('tone')
      socket.emit('tone', {on: true});
  }, 'undo': function(){
      socket.emit('tone', {on: false});
  }},
  {'do': function(){
    console.log('focus');
    impress().next();
  }, 'undo': function(){
    impress().prev();
  }},
  // start playing the tone
  {'do': function(){
      console.log('puslating tone')
      socket.emit('tone', {on: true, pulsing: true});
  }, 'undo': function(){
    socket.emit('tone', {on: false});
  }},
  {'do': function(){
    console.log('signal');
    impress().next();
  }, 'undo': function(){
    impress().prev();
  }},
  {'do': function(){
    console.log('psk');
    socket.emit('tone', {on: false});
    $('#bitstream').attr('class','');
    impress().next();
  }, 'undo': function(){
    impress().prev();
  }},
  // show the codes instead of the letters
  {'do': function(){
    $('#bitstream').addClass('show-code');
  }, 'undo': function(){
    $('#bitstream').removeClass('show-code');
  }},
  // show the psk '00's
  {'do': function(){
    $('#bitstream').addClass('show-letter-breaks');
  }, 'undo': function(){
    $('#bitstream').removeClass('show-letter-breaks');
  }},
  {'do': function(){
    console.log('fft2');
    impress().next();
    socket.emit('message', word);
  }, 'undo': function(){
    socket.emit('message', false);
    impress().prev();
  }},
  {'do': function(){
    console.log('bits');
    impress().next();
  }, 'undo': function(){
    impress().prev();
  }},
];
