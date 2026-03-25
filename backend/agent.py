"""
EduGen Agent — God-Tier LangGraph Architecture
Nodes: Router → [RAG | Research] → Depth Assessor → Explainer → Reflection → [Quiz Generator] → Profile Updater
"""
import os, json, re
from pathlib import Path
from typing import TypedDict, List, Annotated, Optional, Literal
import operator

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_groq import ChatGroq
from langchain_xai import ChatXAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.tools import DuckDuckGoSearchRun
from langgraph.graph import StateGraph, END, START

# ── Environment ──────────────────────────────────────────────────────────────
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

# ── Multi-Provider API Orchestrator ──────────────────────────────────────────
def get_provider_for_key(key: str) -> str:
    if key.startswith("xai-"): return "XAI"
    if key.startswith("gsk_"): return "GROQ"
    if key.startswith("AIza"): return "GOOGLE"
    return "UNKNOWN"

def load_keys():
    pools = {
        "THINK": [os.environ.get(f"THINK_KEY_{i}") for i in [1, 2]],
        "SEARCH": [os.environ.get(f"SEARCH_KEY_{i}") for i in [1, 2]],
        "IMAGE": [os.environ.get(f"IMAGE_KEY_{i}") for i in [1, 2]],
        "FAILOVER": [os.environ.get(f"FAILOVER_KEY_{i}") for i in [1, 2, 3, 4]]
    }
    for k in pools: pools[k] = [v for v in pools[k] if v]
    return pools

KEY_POOLS = load_keys()

# Model priorities by provider
PROVIDER_MODELS = {
    "XAI": ["grok-4-latest"],
    "GROQ": ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "llama-3.1-8b-instant", "openai/gpt-oss-20b"],
    "GOOGLE": ["models/gemini-2.5-flash", "models/gemini-2.0-flash", "models/gemini-pro-latest"]
}

_pool_idx = {k: 0 for k in KEY_POOLS}
_model_idx = {p: 0 for p in PROVIDER_MODELS}

def safe_llm_invoke(messages, temperature=0.3, category="THINK"):
    """God-Tier Multi-Provider Orchestrator with Intelligent Failover."""
    sequence = [category, "FAILOVER"] if category != "FAILOVER" else ["FAILOVER"]
    
    for pool_name in sequence:
        pool = KEY_POOLS.get(pool_name, [])
        if not pool: continue
        
        # Try all keys in this pool
        for _key_cycle in range(len(pool)):
            key = pool[_pool_idx[pool_name]]
            provider = get_provider_for_key(key)
            models = PROVIDER_MODELS.get(provider, ["models/gemini-1.5-flash"])
            
            # Try all models for this specific provider/key
            for _model_cycle in range(len(models)):
                model = models[_model_idx[provider]]
                try:
                    if provider == "XAI":
                        llm = ChatXAI(xai_api_key=key, model=model, temperature=temperature)
                    elif provider == "GROQ":
                        llm = ChatGroq(groq_api_key=key, model=model, temperature=temperature)
                    else: # GOOGLE
                        llm = ChatGoogleGenerativeAI(google_api_key=key, model=model, temperature=temperature, convert_system_message_to_human=True)
                    
                    res = llm.invoke(messages)
                    print(f"✅ [{category}] Success via {provider} | Pool: {pool_name} | Model: {model}")
                    return res
                except Exception as e:
                    err = str(e).lower()
                    print(f"❌ [{category}] Failed via {provider} ({model}): {err[:100]}")
                    
                    # If quota/rate limit -> Rotate key in this pool
                    if any(x in err for x in ["429", "quota", "limit", "exhausted"]):
                        _pool_idx[pool_name] = (_pool_idx[pool_name] + 1) % len(pool)
                        break # Exit model loop to try new key
                    # If model not found -> Rotate model for this provider
                    elif any(x in err for x in ["404", "not found", "model", "not support"]):
                        _model_idx[provider] = (_model_idx[provider] + 1) % len(models)
                        continue # Try next model for same key
                    else:
                        # Other error -> rotate key anyway to be safe
                        _pool_idx[pool_name] = (_pool_idx[pool_name] + 1) % len(pool)
                        break
                        
    raise Exception(f"All providers ({category} + FAILOVER) exhausted.")

def get_google_key():
    """Helper to find specifically a Google key for embeddings."""
    # 1. Check direct environment variables first
    for env_name in ["GOOGLE_API_KEY", "GEMINI_API_KEY"]:
        val = os.environ.get(env_name)
        if val: return val
    
    # 2. Check pools for keys starting with AIza
    for pool in ["THINK", "SEARCH", "FAILOVER"]:
        for key in KEY_POOLS.get(pool, []):
            if key and str(key).startswith("AIza"): return key
            
    return None

_google_key = get_google_key()
try:
    if _google_key:
        embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001", google_api_key=_google_key)
    else:
        print("⚠️ No Google API Key found. Embeddings (RAG) will be disabled.")
        embeddings = None
except Exception as e:
    print(f"⚠️ Error initializing embeddings: {e}")
    embeddings = None

search_tool = DuckDuckGoSearchRun()

# ── RAG Store (PGVector — Cloud Persistent) ─────────────────────────────────
from database import get_pgvector_connection_string

_pgvector_conn = get_pgvector_connection_string()
_vector_stores = {}  # In-memory cache of PGVector instances per page_id

def _use_pgvector():
    """Check if pgvector is available (i.e. we're using PostgreSQL, not SQLite)."""
    return _pgvector_conn is not None

def get_vector_store(page_id: str):
    """Get or create a PGVector store for a specific page."""
    if not _use_pgvector() or embeddings is None:
        return None
    
    if page_id in _vector_stores:
        return _vector_stores[page_id]
    
    try:
        from langchain_postgres import PGVector
        collection_name = f"page_{page_id.replace(':', '_')}"
        store = PGVector(
            embeddings=embeddings,
            collection_name=collection_name,
            connection=_pgvector_conn,
            use_jsonb=True,
        )
        _vector_stores[page_id] = store
        return store
    except Exception as e:
        print(f"⚠️ PGVector store error for {page_id}: {e}")
        return None

def add_documents_to_store(page_id: str, texts: List[str], source: str = "upload"):
    """Split texts into chunks and add to the PGVector store for this page."""
    if not _use_pgvector():
        print("⚠️ Vector store unavailable (SQLite mode — use PostgreSQL for RAG)")
        return 0

    splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
    docs = [Document(page_content=c, metadata={"source": source, "page_id": page_id}) for t in texts for c in splitter.split_text(t)]
    
    store = get_vector_store(page_id)
    if store:
        store.add_documents(docs)
    
    return len(docs)

def clear_vector_store(page_id: str):
    """Delete all vectors for a specific page from PGVector."""
    if not _use_pgvector():
        return
    try:
        store = get_vector_store(page_id)
        if store:
            # Drop and recreate the collection
            store.delete_collection()
            _vector_stores.pop(page_id, None)
            print(f"🗑️ Cleared vector store for page: {page_id}")
    except Exception as e:
        print(f"⚠️ Could not clear vector store: {e}")

# ── State ──────────────────────────────────────────────────────────────────────
class AgentState(TypedDict):
    messages: Annotated[List, operator.add]
    user_profile: dict
    canvas_context: str
    rag_material: str           
    research_results: str       
    intent: str                 
    depth_level: str            
    concepts_covered: List[str] 
    output: dict                

# ── High-Performance Nodes ───────────────────────────────────────────────────

def router_node(state: AgentState) -> AgentState:
    """Combines intent detection, research planning, and depth assessment."""
    last_msg = state["messages"][-1].content if state["messages"] else ""
    prompt = f"""Analyze query: "{last_msg.replace('"', "'")}"
Determine:
1. Intent (new_concept, follow_up, confused, quiz_request)
2. Is Web Research needed? (True/False)
3. Learning depth (beginner, intermediate, advanced)
Respond ONLY JSON: {{"intent": "...", "research": bool, "depth": "..."}}"""
    
    try:
        res = safe_llm_invoke([HumanMessage(content=prompt)], category="THINK", temperature=0.1)
        data = json.loads(re.sub(r"```json|```", "", res.content).strip())
        return {**state, "intent": data["intent"], "depth_level": data["depth"], "research_results": "PENDING" if data.get("research") else ""}
    except:
        return {**state, "intent": "new_concept", "depth_level": "intermediate", "research_results": ""}

def data_fetcher_node(state: AgentState) -> AgentState:
    """Triggers parallel-style data gathering (Search + RAG)."""
    page_id = state["user_profile"].get("page_id", "default")
    query = state["messages"][-1].content
    
    # 1. RAG (PGVector cloud fetch)
    rag_text = ""
    store = get_vector_store(page_id)
    if store:
        print(f"🔍 Searching Knowledge Base (PGVector) for page: {page_id}")
        docs = store.similarity_search(query, k=3)
        rag_text = "\n\n".join([d.page_content for d in docs])
    
    # 2. Web Search (Conditional)
    search_text = ""
    if state.get("research_results") == "PENDING":
        try:
            search_text = search_tool.run(query)
        except:
            search_text = "Search unavailable."
            
    return {**state, "rag_material": rag_text, "research_results": search_text}

def generation_node(state: AgentState) -> AgentState:
    """God-Tier Generator: Generation + Inner Reflection in a single high-quality call."""
    p = state["user_profile"]
    sys = f"""You are EduGen AI. Create a premium personalized learning card.
Context:
- User Bio: {p.get('bio')} | Interests: {p.get('interests')}
- Depth: {state['depth_level']} | Intent: {state['intent']}
- Knowledge Base: {state['rag_material']}
- Web Research: {state['research_results']}

CRITICAL INSTRUCTIONS:
1. MERMAID SYNTAX: Use only "graph TD" or "graph LR". 
   - Labels on arrows MUST follow this: A -->|label| B. NEVER use A -->|label|> B.
   - Avoid special characters like (), [], or ; inside node labels unless quoted. Example: A["Node (Text)"].
2. LINGUISTICS: Use analogies based on user interests. Keep it professional yet engaging.
3. SOURCE LINKING: If you answer using information from the "Knowledge Base", you MUST include a "scroll_to" field with a 5-10 word unique phrase from the material.
4. RESPONSE FORMAT: Strictly JSON. No markdown fences.

Return JSON structure:
{{
  "chat_response": "Short message",
  "neuro_board": {{ "title": "Title", "content": "Body", "visual_type": "mermaid/none", "visual_content": "mermaid code" }},
  "user_update": "AI's private note",
  "scroll_to": "exact phrase from text"
}}"""
    
    # We use a slightly higher temperature for creativity, but strict JSON enforcement
    try:
        res = safe_llm_invoke([SystemMessage(content=sys), state["messages"][-1]], category="THINK", temperature=0.4)
        data = json.loads(re.sub(r"```json|```", "", res.content).strip())
        
        # Self-Correction: If quiz is needed, generate it here to save a round trip
        if state["intent"] == "quiz_request" or len(state["concepts_covered"]) >= 3:
            quiz_p = f"Create 1 MCQ for topics: {state['concepts_covered'][-3:]}. JSON: {{\"question\": \"...\", \"options\": [\"...\"], \"correct\": \"A\", \"explanation\": \"...\"}}"
            q_res = safe_llm_invoke([HumanMessage(content=quiz_p)], category="THINK", temperature=0.2)
            data["quiz"] = json.loads(re.sub(r"```json|```", "", q_res.content).strip())
            
        return {**state, "output": data}
    except Exception as e:
        print(f"⚠️ Primary Gen failed: {e}. Falling back to Safety/Failover Pool...")
        try:
            res = safe_llm_invoke([SystemMessage(content=sys), state["messages"][-1]], category="FAILOVER")
            data = json.loads(re.sub(r"```json|```", "", res.content).strip())
            return {**state, "output": data}
        except:
            return {**state, "output": {"chat_response": "I encountered an error while processing. Please try again.", "neuro_board": None}}

# ── Build High-Speed Graph ───────────────────────────────────────────────────
workflow = StateGraph(AgentState)

workflow.add_node("router", router_node)
workflow.add_node("fetch",  data_fetcher_node)
workflow.add_node("gen",    generation_node)

workflow.add_edge(START, "router")
workflow.add_edge("router", "fetch")
workflow.add_edge("fetch", "gen")
workflow.add_edge("gen", END)

app = workflow.compile()

def run_chat(user_input: str, user_profile: dict = None, canvas_context: str = "", concepts_covered: list = None):
    p = user_profile or {}
    s = {
        "messages": [HumanMessage(content=user_input)], "user_profile": p, "canvas_context": canvas_context,
        "rag_material": "", "research_results": "", "intent": "", "depth_level": "intermediate",
        "concepts_covered": concepts_covered or [], "output": {}
    }
    res = app.invoke(s)
    out = res.get("output", {})
    board = out.get("neuro_board")
    title = board.get("title") if board else None
    covered = res.get("concepts_covered", [])
    if title and title not in covered: covered.append(title)
    
    return { "response": json.dumps(out), "concepts_covered": covered, "intent_detected": res["intent"] }
