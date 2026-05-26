import os

file_path = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\codigo\features\nna\NnaCreatePage.tsx"

if os.path.exists(file_path):
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    print(f"File: {file_path}")
    print(f"Line count: {len(lines)}")
    print(f"Size: {os.path.getsize(file_path)} bytes")
    
    print("\n--- FIRST 20 LINES ---")
    for i in range(min(20, len(lines))):
        print(f"{i+1}: {lines[i]}", end='')
        
    print("\n--- LAST 20 LINES ---")
    start = max(0, len(lines) - 20)
    for i in range(start, len(lines)):
        print(f"{i+1}: {lines[i]}", end='')
else:
    print("File not found")
