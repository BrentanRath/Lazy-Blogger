import asyncio
from bot.app import SlackBot
import os
import asyncio
import threading
from functions.audio_recorder import start_recording, stop_recording, get_transcription
from functions.correct_grammar import correct_grammar
from dotenv import load_dotenv
import os

def run_bot(bot, target_channel_id):
    bot.start(target_channel_id=target_channel_id)

async def process_audio_to_text(bot, target_channel):
    while True:
        print("Recording started. Press Enter to stop recording...")
        recorder = start_recording()
        input()
        stop_recording(recorder)
        
        transcription = get_transcription(recorder)
        print("Original transcription:", transcription)
        
        if transcription:
            corrected_text = f"""{await correct_grammar(transcription)}"""
            print("Corrected text:", corrected_text)
            
            if corrected_text:
                bot.send_message(target_channel, corrected_text)
            else:
                print("No corrected text was generated.")
        else:
            print("No transcription was captured.")
        
        continue_recording = input("Continue recording? (y/n): ").lower()
        if continue_recording != 'y':
            break

async def main():
    bot_token = os.getenv("BOT_TOKEN")
    app_token = os.getenv("APP_TOKEN")
    target_channel = os.getenv("TARGET_CHANNEL")
    
    bot = SlackBot(bot_token, app_token)
    
    bot_thread = threading.Thread(target=run_bot, args=(bot, target_channel), daemon=True)
    bot_thread.start()
    await asyncio.sleep(2)
    
    await process_audio_to_text(bot, target_channel)

if __name__ == "__main__":
    asyncio.run(main())