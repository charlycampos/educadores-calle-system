file_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_reconstructed.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.read().splitlines()

print(f"Total lines: {len(lines)}")
# Let's inspect some sections that were problematic in other files
# e.g., range 2200 to 2400 (where the other file had gaps)
start = 2200
end = 2400
for i in range(start, min(end, len(lines))):
    clean_line = lines[i].encode('ascii', errors='replace').decode('ascii')
    print(f"{i+1}: {clean_line}")
