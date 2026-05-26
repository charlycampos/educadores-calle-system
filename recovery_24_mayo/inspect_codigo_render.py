import sys

sys.stdout.reconfigure(encoding='utf-8')

file_path = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\codigo\features\nna\NnaCreatePage.tsx"

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

# Let's search for the main return block
start_line = 0
for idx, line in enumerate(lines):
    if "return (" in line:
        start_line = idx
        break

print(f"Main return block starts at line {start_line+1}")
# Print from start_line to end
for i in range(start_line, min(start_line + 400, len(lines))):
    print(f"{i+1}: {lines[i]}", end='')
