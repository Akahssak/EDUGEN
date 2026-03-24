import os, requests, json
from pathlib import Path
from dotenv import load_dotenv

def list_models():
    env_path = Path(__file__).parent / ".env"
    load_dotenv(dotenv_path=env_path)
    key = os.environ.get("GOOGLE_API_KEY")
    print(f"Key used: {key[:8]}...{key[-4:] if key else 'None'}")
    
    # List models via GET
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
    response = requests.get(url)
    print(f"Status: {response.status_code}")
    print(f"Body: {response.text}")

if __name__ == "__main__":
    list_models()
