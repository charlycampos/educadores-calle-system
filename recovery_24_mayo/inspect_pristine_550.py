file_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_pristine_3634.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.read().splitlines()

print(f"Total lines: {len(lines)}")
start = 539
end = 599
for i in range(start, min(end, len(lines))):
    clean_line = lines[i].encode('ascii', errors='replace').decode('ascii')
    print(f"{i+1}: {clean_line}")
