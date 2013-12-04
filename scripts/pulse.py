import pyaudio
import quietnet
import options

FORMAT = pyaudio.paInt16
CHANNELS = options.channels
RATE = options.rate

FREQ = options.freq
FREQ_OFF = 0

DATASIZE = options.datasize

p = pyaudio.PyAudio()
stream = p.open(format=FORMAT, channels=CHANNELS, rate=RATE, output=True)

buffer = quietnet.envelope(quietnet.tone(FREQ_OFF, DATASIZE)) + quietnet.envelope(quietnet.tone(FREQ, DATASIZE))
buffer = buffer * 10

output_buffer = quietnet.pack_buffer(buffer)

def play_buffer(buffer):
    for sample in buffer:
        stream.write(sample)

while True:
    play_buffer(output_buffer)
