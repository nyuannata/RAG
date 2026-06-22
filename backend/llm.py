import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables from the root .env file
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(env_path)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("WARNING: GEMINI_API_KEY is not set in .env file.")

def get_embedding(text: str) -> list[float]:
    """Generates embedding for the given text using Gemini."""
    try:
        result = genai.embed_content(
            model="models/gemini-embedding-2",
            content=text,
            task_type="retrieval_document",
            output_dimensionality=768
        )
        return result['embedding']
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return []

def get_chat_model():
    """Returns a configured Gemini generative model."""
    return genai.GenerativeModel("gemini-2.5-flash")
