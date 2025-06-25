import os
import logging
import re
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = App(token=os.getenv("SLACK_BOT_TOKEN"))
def send_message_to_channel(channel_id, message):
    try:
        response = app.client.chat_postMessage(
            channel=channel_id,
            text=message
        )
        logging.info(f"Message sent successfully to channel {channel_id}")
        return response
    except Exception as e:
        logging.error(f"Error sending message to channel {channel_id}: {e}")
        return None



def verify_journal_entry(message_text):
    clean_message = message_text.strip('*') # This is so that it does not matter if it is bold or not
    pattern = r"^Day\s+\d+\s+Entry\s+\d+\s+\(\d{2}-\d{2}-\d{4}\)"
    return bool(re.match(pattern, clean_message))

def verify_channel(input_channel_id):
    return True if (input_channel_id == "C093D2M5DNU") else False




@app.command("/ilovegavin")
def handle_hello_command(ack, body, respond, logger):
    ack()
    user_id = body.get('user_id', 'unknown')
    respond(
        text=f"Hello! <@{user_id}> loves Gavin! Who do you love?",
        response_type="in_channel"
    )
    send_message_to_channel("C093D2M5DNU", "Important announcement: The system is now online! No shit!")

@app.event("message")
def handle_message_events(body, logger):
    try:
        message_text = body["event"].get("text", "")
        channel_id = body["event"].get("channel", "")
        user_id = body["event"].get("user", "unknown")

        # DONT FUCKEN REMOVE
        if not verify_channel(channel_id):
            logger.debug(f"Ignoring message from channel {channel_id}, not the target channel")
            return
        
        if (verify_journal_entry(message_text)):
            logger.info(f"Message from user <@{user_id}> matches the journal entry format")
            send_message_to_channel(channel_id, f"<@{user_id}> - Your journal entry has been recorded.")
        else:
            logger.info(f"Message from user <@{user_id}> does not match the journal entry format")
            send_message_to_channel(channel_id, f"<@{user_id}> - Your journal entry is NOOO GOOD")

            
    except Exception as error:
        logger.error(f"Error processing message event: {error}")

if __name__ == "__main__":
    SocketModeHandler(app, os.getenv("SLACK_APP_TOKEN")).start()