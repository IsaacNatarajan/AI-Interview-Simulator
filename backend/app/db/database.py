from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv(dotenv_path="../.env")

client = MongoClient(os.getenv("MONGO_URI"))
db = client[os.getenv("MONGO_DB_NAME")]

def get_db():
    return db