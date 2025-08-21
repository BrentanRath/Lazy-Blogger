from functions.send_prompt_to_api import send_prompt_to_api

async def correct_grammar(text, prompt_type="blog"):
    response = await send_prompt_to_api(text, prompt_type)
    
    if response and 'choices' in response and len(response['choices']) > 0:
        return response['choices'][0]['message']['content']
    return None