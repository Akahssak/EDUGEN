import os, json
from pathlib import Path
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

def test_llm():
    env_path = Path(__file__).parent / ".env"
    load_dotenv(dotenv_path=env_path)
    
    key = os.environ.get("GOOGLE_API_KEY")
    print(f"Key found: {key[:8]}...{key[-4:] if key else 'None'}")
    
    # Try identifiers from user's special list
    models = ["models/gemini-flash-latest", "models/gemini-2.5-flash", "models/gemini-2.0-flash"]
    
    for m in models:
        print(f"Testing model: {m}")
        try:
            llm = ChatGoogleGenerativeAI(model=m, google_api_key=key, temperature=0.3)
            res = llm.invoke([HumanMessage(content="Hello, response precisely with 'EduGen Ready'")])
            print(f"  ✅ SUCCESS ({m}): {res.content.strip()}")
            return
        except Exception as e:
            print(f"  ❌ FAILED ({m}): {str(e)}")

if __name__ == "__main__":
    test_llm()
