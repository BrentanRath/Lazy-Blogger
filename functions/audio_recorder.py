from RealtimeSTT import AudioToTextRecorder

def start_recording():
    recorder = AudioToTextRecorder()
    recorder.start()
    return recorder

def stop_recording(recorder):
    recorder.stop()

def get_transcription(recorder):
    return recorder.text()