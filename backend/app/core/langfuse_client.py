from langfuse.langchain import CallbackHandler
from dotenv import load_dotenv
import os

load_dotenv(dotenv_path="../.env", override=True)

langfuse_handler = CallbackHandler()