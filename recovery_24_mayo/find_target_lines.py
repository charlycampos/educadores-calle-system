file_path = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_reconstructed.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "ACTIVIDADES DE TIEMPO LIBRE" in line:
        print(f"Match found at line {idx+1}:")
        # Print lines around it
        start = max(0, idx - 3)
        end = min(len(lines), idx + 5)
        for i in range(start, end):
            print(f"  {i+1}: {lines[i]}", end='')
