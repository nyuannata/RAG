from dotenv import load_dotenv
import os
import google.generativeai as genai

load_dotenv()
genai.configure(api_key=os.environ.get('GEMINI_API_KEY'))
try:
    models = genai.list_models()
    print("Models supporting generateContent:")
    for m in models:
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
except Exception as e:
    print(f"Error: {e}")
