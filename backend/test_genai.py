import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
try:
    genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))
    models = genai.list_models()
    for m in models:
        print(m.name)
except Exception as e:
    print('ERROR:', e)
