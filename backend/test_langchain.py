import os
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

load_dotenv()
try:
    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        google_api_key=os.environ.get("GOOGLE_API_KEY"),
    )
    res = llm.invoke("Hello")
    print("SUCCESS:gemini-1.5-flash", res.content)
except Exception as e:
    print("ERROR:gemini-1.5-flash", repr(e))

try:
    llm2 = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash-latest",
        google_api_key=os.environ.get("GOOGLE_API_KEY"),
    )
    res2 = llm2.invoke("Hello")
    print("SUCCESS:gemini-1.5-flash-latest", res2.content)
except Exception as e:
    print("ERROR:gemini-1.5-flash-latest", repr(e))
