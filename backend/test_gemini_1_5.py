import os
import google.generativeai as genai
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

api_key = os.environ.get("GOOGLE_API_KEY")
# Write to file
with open("test_result.txt", "w", encoding="utf-8") as f:
    f.write(f"Key loaded: {str(api_key)[:4]}...\n")

    # Test 1: Direct google-generativeai usage (gemini-1.5-flash)
    f.write("\n--- Test 1: google-generativeai (gemini-1.5-flash) ---\n")
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content("Hello")
        f.write(f"Success! {model.model_name} responded: {response.text}\n")
    except Exception as e:
        f.write(f"Failed: {e}\n")

    # Test 2: LangChain usage
    f.write("\n--- Test 2: LangChain (gemini-flash-latest) ---\n")
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-flash-latest", 
            google_api_key=api_key
        )
        res = llm.invoke("Hello")
        f.write(f"Success! {res.content}\n")
    except Exception as e:
        f.write(f"Failed: {e}\n")
