import json
import aiohttp
import asyncio

async def send_prompt_to_api(user_prompt):
    system_context = "You are an expert editor. Take the following text and correct it strictly for grammar, punctuation, and professional formatting. Do not paraphrase, restructure, or rephrase anything unless a sentence is incoherent or ungrammatical to the point that it does not make sense. In such cases, make only minimal adjustments necessary for clarity. Retain the original vocabulary, tone, and style. Do not add or remove any content unless correcting an error. Output only the corrected version of the text. Here is the text to correct:"
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post('https://ai.hackclub.com/chat/completions', 
                                    headers={'Content-Type': 'application/json'},
                                    json={
                                        'messages': [
                                            {'role': 'system', 'content': system_context},
                                            {'role': 'user', 'content': user_prompt}
                                        ]
                                    }) as response:
                
                data = await response.json()
                return data
    except Exception as error:
        print(f'Error fetching response: {error}')
        return None 