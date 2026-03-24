import os, requests, json
from pathlib import Path
from dotenv import load_dotenv

def test_raw():
    env_path = Path(__file__).parent / ".env"
    load_dotenv(dotenv_path=env_path)
    key = os.environ.get("GOOGLE_API_KEY")
    print(f"Key used: {key[:8]}...{key[-4:] if key else 'None'}")
    
    # Raw API call
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}"
    payload = {"contents": [{"parts": [{"text": "Hello"}]}]}
    response = requests.post(url, json=payload)
    print(f"Status: {response.status_code}")
    print(f"Body: {response.text}")

if __name__ == "__main__":
    test_raw()
