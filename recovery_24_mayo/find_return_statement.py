import os

file_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_perfect_baseline.tsx"

if os.path.exists(file_path):
    print("Searching for return statements...")
    with open(file_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if "return (" in line:
                print(f"Line {idx+1}: {line.strip()}")
else:
    print("Baseline file not found")
