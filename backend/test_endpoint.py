import requests
import json

url = "http://localhost:8000/chat"
data = {
    "message": "Explain AI in 1 sentence.",
    "session_id": "test",
    "user_id": "1",
    "context": ""
}

try:
    response = requests.post(url, json=data)
    print("Status Code:", response.status_code)
    print("Response Body:", response.json())
except Exception as e:
    print("Error:", e)
