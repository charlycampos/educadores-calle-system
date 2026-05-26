import os

file_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_reconstructed_6977.tsx"

if os.path.exists(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    print(f"Total lines: {len(lines)}")
    # Print lines 3345 to 3385
    start = 3344
    end = min(len(lines), 3385)
    for i in range(start, end):
        # We replace any non-ascii characters to avoid encoding crashes
        clean_line = lines[i].encode('ascii', errors='replace').decode('ascii')
        print(f"{i+1}: {clean_line}", end='')
else:
    print("File not found")
