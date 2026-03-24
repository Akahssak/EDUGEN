import os
import re

frontend_dir = r"d:\final project trail1\frontend\src"

count = 0
for root, _, files in os.walk(frontend_dir):
    for file in files:
        if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original = content

            # Handle backticks: `http://localhost:8000...` -> `${import.meta.env.VITE_API_URL}...`
            content = content.replace('`http://localhost:8000', '`${import.meta.env.VITE_API_URL}')
            content = content.replace('`http://localhost:8001', '`${import.meta.env.VITE_API_URL}')
            
            # Handle single quotes: 'http://localhost:8000...' -> `${import.meta.env.VITE_API_URL}...`
            content = re.sub(r"'http://localhost:800[01]([^']*)'", r"`${import.meta.env.VITE_API_URL}\1`", content)
            
            # Handle double quotes: "http://localhost:8000..." -> `${import.meta.env.VITE_API_URL}...`
            content = re.sub(r'"http://localhost:800[01]([^"]*)"', r"`${import.meta.env.VITE_API_URL}\1`", content)

            if content != original:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Updated: {filepath}")
                count += 1

print(f"Replacement complete! Updated {count} files.")
