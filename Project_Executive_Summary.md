# EduGen - Agentic AI Tutor: Executive Summary
*(For 180-Day Project Diary)*

## 1. Project Overview
**Project Name:** EduGen  
**Project Type:** Agentic AI-Powered Educational Platform  
**Duration:** 180 Days  

**Objective:**  
To design and develop a production-ready, highly interactive AI Tutor that transcends standard conversational chatbots. EduGen is built to provide a dynamic, personalized, and adaptive learning experience by leveraging advanced agentic workflows, Retrieval-Augmented Generation (RAG), and a multi-node AI architecture.

## 2. Core Features & Capabilities
* **Agentic Learning Workflow:** Implemented a complex, multi-node AI state graph (using LangGraph) that intelligently routes user queries through distinct cognitive phases: Intent Detection, RAG/Web Research, Depth Assessment, Generation/Explanation, and dynamic Quiz Generation.
* **Context-Aware RAG (Retrieval-Augmented Generation):** Built a local FAISS-based vector database system that ingests user-uploaded documents (PDFs, DOCX, TXT) and binds them to specific learning workspaces/pages. The AI seamlessly references this custom material to teach specific concepts.
* **God-Tier Multi-Provider LLM Orchestrator:** Developed a robust, resilient failover system that automatically rotates API keys and alternates between top-tier models (Google Gemini 1.5/2.0 Flash, Grok, Groq/Llama3) to guarantee 100% uptime and bypass rate-limiting or quota exhaustion.
* **Dynamic Profile & Concept Tracking:** The system continuously monitors what concepts the user has learned during the session, automatically updating their profile's "interests" and "learning style" based on conversational context, allowing the AI to adjust its depth (beginner, intermediate, advanced) on the fly.
* **Interactive Frontend Canvas:** Integrated a rich, responsive React frontend (using Vite and Tailwind CSS) that acts as a digital learning board. It features a Knowledge Base toggle for document uploads and a unique "blue dot" source navigator that visually maps the AI's answers back to the original source text.

## 3. Technology Stack
* **Backend Framework:** FastAPI (Python) for high-performance, asynchronous REST API endpoints.
* **AI & Orchestration:** LangChain, LangGraph, Google Generative AI (Gemini), Groq, XAI.
* **Vector Store & Embeddings:** FAISS (Facebook AI Similarity Search) and Google Generative AI Embeddings.
* **Frontend Infrastructure:** React, Vite, Tailwind CSS, Tldraw (for Canvas Context).
* **Database & Persistence:** SQLite with SQLAlchemy ORM for tracking users, workspaces, canvas data, and indexing knowledge base chunks.
* **External APIs:** DuckDuckGoSearchRun for real-time web research fallbacks.

## 4. Key Engineering Achievements (The "180-Day" Milestones)
1. **Foundation & Architecture Design:** Established the FastAPI backend and React frontend monorepo structure. Configured CORS, global exception handling, and the initial SQLite database schema.
2. **AI Orchestration setup:** Engineered the custom LangGraph state machine (`router`, `fetcher`, `generator` nodes) to give the AI autonomous decision-making capabilities.
3. **Resiliency Implementation:** Solved API rate limiting by writing a custom multi-provider pool mechanism (`safe_llm_invoke`) that intelligently catches HTTP 429/404 errors and rotates keys/models without dropping the user's request.
4. **Knowledge Retrieval Integration:** Successfully built the RAG pipeline. Configured `PyMuPDF` and `python-docx` for document parsing, `RecursiveCharacterTextSplitter` for chunking, and FAISS for semantic similarity search.
5. **Frontend-Backend Synchronization:** Finalized the Tldraw canvas integration so that the visual context (page IDs, workspace IDs) is accurately passed to the FastAPI backend, ensuring the AI responses are perfectly scoped to what the user is currently looking at.

## 5. Business Value & Impact
EduGen serves as a next-generation blueprint for EdTech platforms. By moving away from simple "prompt-and-response" mechanics and instead utilizing autonomous agents that plan, retrieve, and reflect, the platform actively adapts to the cognitive level of the student. The heavy focus on system resiliency (API key rotation) ensures the application is production-ready and capable of handling scaled, continuous usage.
