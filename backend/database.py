import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables from the root .env file
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(env_path, override=True)

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB_NAME", "rag_chatbot")

if not MONGODB_URI:
    print("WARNING: MONGODB_URI is not set in .env file.")

# Initialize MongoClient
try:
    client = MongoClient(MONGODB_URI)
    db = client[DB_NAME]
    print(f"Connected to MongoDB. DB: {DB_NAME}")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")
    client = None
    db = None

def get_db():
    return db
