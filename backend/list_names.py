import os, requests, json
from pathlib import Path
from dotenv import load_dotenv

def list_names():
    env_path = Path(__file__).parent / ".env"
    load_dotenv(dotenv_path=env_path)
    key = os.environ.get("GOOGLE_API_KEY")
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        print("Available models:")
        for m in data.get("models", []):
            print(f"- {m['name']}")
    else:
        print(f"Error {response.status_code}: {response.text}")

if __name__ == "__main__":
    list_names()
