/**
 * ###### WARNING #######
 *
 * This code was written to do a 5 minute presentation for Hack and Tell, it is messy and unclean but it got the job done.
 *
 * ###### WARNING #######
 */

var wavePath, waveX, waveLine;
var fftPath, fftX, fftY, fftLine;
var fft2Path, fft2X, fft2Line;
var bitsPath, bitsX, bitsLine;
var height;
var word; // the value of the word typed in for the demo of PSK
var bit_threshold = 70; // hardcoded threshold :(
var fft_max = 400;
var graph_min = -5; // so we can see the bottom line on a graph

var searchFreq = 19043;

var analyzerContext = null;
var prettyAnalyzerContext = null;
var fftContext = null;
var fftRafID = null;

// the chromebook I used just did not agree with the values my macbookpro got at all :(
var chromebooksSuck = [406, 51];

var ffts = [];
var fftIndex = chromebooksSuck[0] || getPeak(searchFreq, 44100, 1024);

var fftsShort = [];
var fftShortIndex = chromebooksSuck[1] || getPeak(searchFreq, 44100, 128);

var waveContext = null;
var waveRafID = null;
var pretty = false;

var fftHighlightPoint;
var fftPointData = [0];
var currentStepIndex = 0;

var audioContext = new AudioContext();
var audioInput = null;
var realAudioInput = null;
var inputPoint = null;
var audioRecorder = null;
var isRecording = false;

// the fft is done for me using 'analyzers' from the web audio API
var analyzerNode;
var analyzerNodeFFTSize = 1024;
// The short analyzer is an fft with a smaller window
var analyzerNodeShort;
var analyzerNodeShortFFTSize = 128;

var socket = io.connect(); // used to tell the other laptop to start the tones

$(document).ready(function(){
  var width = $(window).width();
  var height = $(window).height();

  // resize every slide, I did this to better deal with different aspect ratios
  $('.step').each(function(){
    var x = $(this).attr('data-x');
    $(this).attr('data-x', (x/1000) * width * 1.2);
    var y = $(this).attr('data-y');
    $(this).attr('data-y', (y/1000) * height * 1.2);
  });

  (function() {
    var parentId = '#slide-wave';
    var parent = $(parentId);
    var width = parent.innerWidth();
    var height = parent.innerHeight();

    waveX = d3.time.scale().range([0, width]);
    var y = d3.scale.linear().range([0, height]);

    y.domain([-1, 1]);

    waveLine = d3.svg.line()
      .x(function(d, i) { return waveX(i); })
      .y(function(d) { return y(d); });

    var svg = d3.select(parentId).append("svg")
      .attr("width", width)
      .attr("height", height);

    wavePath = svg.append("path");
  })();

  (function() {
    var parentId = '#slide-analyze';
    var parent = $(parentId);
    var width = parent.width();
    height = parent.innerHeight();

    fftX = d3.scale.linear().range([0, width]);
    fftY = d3.scale.linear().range([0, height]);

    fftY.domain([fft_max, graph_min]);

    fftLine = d3.svg.line()
      .x(function(d, i) { return fftX(i); })
      .y(function(d) { return fftY(d); });

    var svg = d3.select(parentId).append("svg")
      .attr("width", width)
      .attr("height", height);

    fftHighlightPoint = svg.selectAll(".fft-highlight")
        .data(fftPointData)
      .enter().append("circle")
        .attr("class", "fft-highlight")
        .attr('cx', function(){return fftX(fftIndex / 512);})
        .attr('cy', function(d){return fftY(d);})
        .attr("r", 12);

    fftPath = svg.append("path");
  })();

  (function() {
    var parentId = '#slide-fft-time';
    var parent = $(parentId);
    var width = parent.width();

    fft2X = d3.time.scale().range([0, width]);
    var y = d3.scale.linear().range([0, height]);

    y.domain([fft_max, graph_min]);

    fft2Line = d3.svg.line()
      .x(function(d, i) { return fft2X(i); })
      .y(function(d) { return y(d); });

    var svg = d3.select(parentId).append("svg")
      .attr("width", width)
      .attr("height", height);

    fft2Path = svg.append("path");
  })();

  (function() {
    var parentId = '#slide-bits';
    var parent = $(parentId);
    var width = parent.width();

    bitsX = d3.time.scale().range([0, width]);
    var y = d3.scale.linear().range([0, height]);

    y.domain([2, -1]);

    bitsLine = d3.svg.line()
      .x(function(d, i) { return bitsX(i); })
      .y(function(d) { return y(d); });

    var svg = d3.select(parentId).append("svg")
      .attr("width", width)
      .attr("height", height);

    bitsPath = svg.append("path");
  })();

  $('#slide-psk form').on('submit', function(e){
    e.preventDefault();
    var input = $(this).find('[name=word]');
    word = input.val();
    input.trigger('blur');

    currentStepIndex = 0;

    var encoded = encode(word);

    var bitstream = $('#bitstream');
    bitstream.attr('class', '');
    bitstream.text('');

    var letterAndEncoded = _.zip(word, encoded);

    _.each(letterAndEncoded, function(a, i){
      var span = $('<span class="letterbitstream"></span>');
      var letter = $('<span class="letter"></span>');
      var code = $('<span class="code"></span>');

      if (i > 0) {
        bitstream.append('<span class="letterbreak">00</span>');
      }

      letter.text(a[0]);
      code.text(a[1]);
      code.appendTo(span);
      letter.appendTo(span);
      span.appendTo(bitstream);
    });
  });

  // actually using a modified version of impress that is missing the keyup event listener
  impress().init();

  // use my own key up event listener to allow for cues inside of steps
  document.addEventListener('keyup', function(event){
    if ( event.keyCode === 9 || ( event.keyCode >= 32 && event.keyCode <= 34 ) || (event.keyCode >= 37 && event.keyCode <= 40) ) {
      event.preventDefault();
      var bodyClasses = $('body').attr('class').split(' ');
      var slideName = _.chain(bodyClasses).find(function(a){return a.indexOf('impress-on') === 0;}).value().replace('impress-on-', '');
      var step = steps[slideName];

      switch(event.keyCode) {
        case 33: // pg up
        case 37: // left
        case 38: // up
          currentStepIndex--;
          if (step && step[currentStepIndex] && currentStepIndex >= 0) {
            step[currentStepIndex].undo();
            return false;
          } else {
            impress().prev();
            slideName = _.chain(bodyClasses).find(function(a){return a.indexOf('impress-on') === 0;}).value().replace('impress-on-', '');
            if (steps[slideName]) {
              currentStepIndex = steps[slideName].length;
            } else {
              currentStepIndex = 0;
            }
          }
          break;
        case 9:  // tab
        case 32: // space
        case 34: // pg down
        case 39: // right
        case 40: // down
          if (step && step[currentStepIndex]) {
              step[currentStepIndex].do();
              currentStepIndex++;
              return false;
          } else {
            currentStepIndex = 0;
            impress().next();
          }
          break;
        }
      }
  }, true);
});

var steps = {
  "slide-analyze": [
    // start pulsing the tone
    {'do': function(){
      socket.emit('tone', {on: true, pulsing: true});
      $('#slide-analyze').addClass('show-highlight');
    }, 'undo': function(){
      socket.emit('tone', {on: false});
      $('#slide-analyze').removeClass('show-highlight');
    }},
  ],
  "slide-psk": [
    // turn off the tone
    // show the codes instead of the letters
    {'do': function(){
      socket.emit('tone', {on: false});
      $('#bitstream').addClass('show-code');
    }, 'undo': function(){
      $('#bitstream').removeClass('show-code');
    }},
    // show the psk '00's
    {'do': function(){
      $('#bitstream').addClass('show-letter-breaks');
    }, 'undo': function(){
      $('#bitstream').removeClass('show-letter-breaks');
    }}
  ],
  "slide-fft-time2": [
    {'do': function(){
      socket.emit('message', word);
    }, 'undo': function(){
      socket.emit('message', false);
    }}
  ]
};

function updateWaveData(data, num) {
  if (data.length >= num) {
    data = data.subarray(0, num);
    waveX.domain(d3.extent(data, function(d, i) { return i; }));
    wavePath.datum(data)
      .attr("class", "line")
      .attr("d", waveLine);
  }
}

function updateFftData(data) {
  fftX.domain(d3.extent(data, function(d, i) { return i; }));
  fftPath.datum(data)
    .attr('class', 'line')
    .attr("d", fftLine);

  fftPointData[0] = data[fftIndex];
  fftHighlightPoint.datum(fftPointData).attr('cy', function(d){return fftY(d);}).attr("class", "fft-highlight")
}

function updateFftTimeData(data) {
}

function updateFftShortTimeData(data) {
  data = _.last(data, 400);
  fft2X.domain(d3.extent(data, function(d, i) { return i; }));
  fft2Path.datum(data)
    .attr("class", "line")
    .attr("d", fft2Line);

  var bit_data = _.chain(data).last(400).map(function(a){
    return (a > bit_threshold ? 1 : 0);
  }).value();
  bitsX.domain(d3.extent(bit_data, function(d, i) { return i; }));
  bitsPath.datum(bit_data)
    .attr("class", "line")
    .attr("d", bitsLine);
}

function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

function startRecording() {
  if (!audioRecorder)
    return;
  isRecording = true;
  audioRecorder.clear();
  audioRecorder.record();
}

function stopRecording() {
  audioRecorder.stop();
  isRecording = false;
}

var waveInterval;
function startWave() {
  if (waveInterval) stopWave();
  waveInterval = setInterval(function(){
    audioRecorder.getBuffers(drawWave);
    audioRecorder.clear();
  }, 100);
}

function stopWave() {
  clearInterval(waveInterval);
}

function drawWave(buffers) {
  // actually only draws the left buffer
  updateWaveData(buffers[0], 2000);
}

function gotStream(stream) {
    inputPoint = audioContext.createGain();

    // Create an AudioNode from the stream.
    realAudioInput = audioContext.createMediaStreamSource(stream);
    audioInput = realAudioInput;
    audioInput.connect(inputPoint);

    analyzerNode = audioContext.createAnalyser();
    analyzerNode.fftSize = analyzerNodeFFTSize;
    inputPoint.connect(analyzerNode);

    analyzerNodeShort = audioContext.createAnalyser();
    analyzerNodeShort.fftSize = analyzerNodeShortFFTSize;
    inputPoint.connect(analyzerNodeShort);

    audioRecorder = new Recorder(inputPoint);

    zeroGain = audioContext.createGain();
    zeroGain.gain.value = 0.0;
    inputPoint.connect(zeroGain);
    zeroGain.connect(audioContext.destination);
    updateAnalyzers();

    startRecording();
    startWave();
}

function initAudio() {
  if (!navigator.getUserMedia)
    navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
  if (!navigator.requestAnimationFrame)
    navigator.requestAnimationFrame = navigator.webkitRequestAnimationFrame || navigator.mozRequestAnimationFrame;

  navigator.getUserMedia({audio:true}, gotStream, function(e) {
    alert("You must enable audio for this presentation to work.");
    console.log(e);
  });
}

window.addEventListener('load', initAudio );

var visOptions = {
  analyzerBarWidth: 3,
  analyzerBarSpacing: 1,

  prettyAnalyzerBarWidth: 6,
  prettyAnalyzerBarSpacing: 2,

  color: "rgba(255,255,255,.8)",
  strokeWidth: 3
};

// find the index of a given frequency in an fft
function getPeak(searchFreq, rate, fftSize) {
  return Math.round((searchFreq / rate) * fftSize);
}

function updateAnalyzers(time) {
  if (!prettyAnalyzerContext) {
    var canvas = document.getElementById("analyzer-pretty");
    prettyAnalyzerContext = canvas.getContext('2d');
    prettyAnalyzerContext.lineCap = 'square';
    prettyAnalyzerContext.fillStyle = visOptions.color;
  }

  var freqByteData = new Uint8Array(analyzerNode.frequencyBinCount);
  analyzerNode.getByteFrequencyData(freqByteData);
  ffts.push(freqByteData[fftIndex]);
  updateFftTimeData(ffts);

  updateFftData(freqByteData);
  drawPrettyFFT(prettyAnalyzerContext, freqByteData);

  freqByteData = new Uint8Array(analyzerNodeShort.frequencyBinCount);
  analyzerNodeShort.getByteFrequencyData(freqByteData);
  fftsShort.push(freqByteData[fftShortIndex]);
  updateFftShortTimeData(fftsShort);

  // this will cause the draw to loop
  fftRafID = window.requestAnimationFrame(updateAnalyzers);
}

// TODO should replace with D3?
function drawPrettyFFT(context, freqByteData) {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  var spacing = visOptions.prettyAnalyzerBarWidth + visOptions.prettyAnalyzerBarSpacing * 2;
  var numBars = Math.round(context.canvas.width / spacing);
  var multiplier = analyzerNode.frequencyBinCount / numBars;

  for (var i = 0; i < numBars; ++i) {
    var magnitude = 0;
    var offset = Math.floor( i * multiplier );

    for (var j = 0; j < multiplier; j++) {
      magnitude += freqByteData[offset + j];
    }

    magnitude = magnitude / multiplier;
    var magnitude2 = freqByteData[i * multiplier];
    context.fillRect(i * spacing, context.canvas.height, visOptions.prettyAnalyzerBarWidth, -magnitude);
  }
}
