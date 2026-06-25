import os
from pymongo import MongoClient
import google.generativeai as genai

# 1. Setup Gemini API
GOOGLE_API_KEY = "IzaSyBe8QCquW6xCEO3pp7AUNO8Gxu7nvl1Ut4"
genai.configure(api_key=GOOGLE_API_KEY)

# 2. Setup MongoDB Connection
MONGO_URI = "mongodb+srv://nyuannata_db_user:tDcJ7kiQ1EJxst0K@cluster0.uvmdknl.mongodb.net"
client = MongoClient(MONGO_URI)

# Buat/Pilih Database dan Collection
db = client["rag_database"]
collection = db["dokumen_pengetahuan"]

print("Berhasil terhubung ke MongoDB dan Gemini API!")