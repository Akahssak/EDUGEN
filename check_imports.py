import os
import re

def check_imports(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.jsx', '.js')):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    # Look for imports
                    imports = re.findall(r'from\s+[\'"](.+?)[\'"]', content)
                    imports += re.findall(r'import\s+[\'"](.+?)[\'"]', content)
                    
                    for imp in imports:
                        if imp.startswith('.'):
                            # Resolve relative path
                            imp_path = os.path.abspath(os.path.join(root, imp))
                            # Check common extensions
                            found = False
                            for ext in ['', '.tsx', '.ts', '.jsx', '.js', '.css', '.svg', '/index.tsx', '/index.ts']:
                                if os.path.exists(imp_path + ext):
                                    found = True
                                    break
                            if not found:
                                print(f"BROKEN IMPORT: '{imp}' in {path}")

if __name__ == "__main__":
    check_imports('d:/final project trail1/frontend/src')
