import sys
import os
sys.path.append(os.getcwd())
try:
    from agent import run_chat
    print("Agent imported successfully.")
    res = run_chat("Hello")
    print("Result:", res)
except Exception as e:
    import traceback
    traceback.print_exc()
