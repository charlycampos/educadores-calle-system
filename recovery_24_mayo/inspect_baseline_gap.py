file_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_reconstructed_6977.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.read().splitlines()

print(f"Total lines: {len(lines)}")
# Print lines around the gap (2150 to 2420, 1-indexed means indices 2149 to 2419)
start = 2149
end = 2419
for i in range(start, end):
    if i < len(lines):
        clean_line = lines[i].encode('ascii', errors='replace').decode('ascii')
        print(f"{i+1}: {clean_line}")
