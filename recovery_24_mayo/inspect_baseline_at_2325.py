file_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_reconstructed_6977.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines in baseline: {len(lines)}")
# Print lines 2315 to 2345
start = 2310
end = min(len(lines), 2345)
for i in range(start, end):
    clean_line = lines[i].encode('ascii', errors='replace').decode('ascii')
    print(f"{i+1}: {clean_line}", end='')
