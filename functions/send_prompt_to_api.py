import json
import aiohttp
import asyncio

PROMPT_CONTEXTS = {
    "blog": "You are an expert blog editor. Take the following text and transform it into a polished blog post. Correct grammar, punctuation, and formatting while maintaining a conversational yet professional blog tone. Structure the content with appropriate paragraphs and flow. Output only the improved blog post:",
    "project_logging": "You are a professional project documentation specialist. Take the following text and transform it into clear, professional project notes. Focus on clarity, actionable items, and professional language suitable for project logs and status reports. Output only the formatted project notes:",
    "meeting_notes": "You are an expert at creating clear meeting notes. Take the following text and organize it into structured meeting notes with key points, decisions, and action items clearly highlighted. Use professional language suitable for corporate documentation. Output only the organized meeting notes:",
    "creative_writing": "You are a creative writing editor. Take the following text and enhance it for creative expression while maintaining the author's voice and style. Focus on improving flow, imagery, and narrative structure. Output only the enhanced creative text:",
    "technical_docs": "You are a technical documentation specialist. Take the following text and transform it into clear, precise technical documentation. Focus on accuracy, clarity, and professional technical language. Structure the content logically with proper formatting. Output only the technical documentation:"
}

async def send_prompt_to_api(user_prompt, prompt_type="blog"):
    # Get the appropriate system context based on prompt type
    system_context = PROMPT_CONTEXTS.get(prompt_type, PROMPT_CONTEXTS["blog"])
    
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