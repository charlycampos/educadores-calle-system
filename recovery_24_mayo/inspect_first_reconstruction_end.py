file_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_reconstructed.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.read().splitlines()

print(f"Total lines: {len(lines)}")
# Print last 100 lines (indices from len-100 to len-1)
start = max(0, len(lines) - 100)
for i in range(start, len(lines)):
    clean_line = lines[i].encode('ascii', errors='replace').decode('ascii')
    print(f"{i+1}: {clean_line}")
