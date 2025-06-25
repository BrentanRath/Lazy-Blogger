import os
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler

class SlackBot:
    def __init__(self, bot_token, app_token):
        self.app = App(token=bot_token)
        self.app_token = app_token
        self.setup_event_handlers()
    
    def setup_event_handlers(self):
        @self.app.event("app_mention")
        def handle_app_mention(event, say):
            say(f"Hi there, <@{event['user']}>!")
    
    def join_channel(self, channel_id):
        try:
            result = self.app.client.conversations_join(channel=channel_id)
            print(f"Successfully joined channel {channel_id}")
            return True
        except Exception as e:
            print(f"Error joining channel {channel_id}: {e}")
            return False
    
    def is_in_channel(self, channel_id):
        try:
            result = self.app.client.conversations_list(types="public_channel,private_channel")
            for channel in result["channels"]:
                if channel["id"] == channel_id:
                    if channel.get("is_member", False):
                        return True
            return False
        except Exception as e:
            print(f"Error checking channel membership: {e}")
            return False
    
    def send_message(self, channel_id, message):
        try:
            result = self.app.client.chat_postMessage(
                channel=channel_id,
                text=message
            )
            print(f"Message sent to {channel_id}")
            return True
        except Exception as e:
            print(f"Error sending message to {channel_id}: {e}")
            return False
    
    def start(self, target_channel_id=None):
        if target_channel_id:
            if not self.is_in_channel(target_channel_id):
                print(f"Bot is not in channel {target_channel_id}. Attempting to join...")
                if not self.join_channel(target_channel_id):
                    print("Failed to join channel. Please invite the bot manually.")
            else:
                print(f"Bot is already a member of channel {target_channel_id}")
        
        # Start the Socket Mode handler
        SocketModeHandler(self.app, self.app_token).start()