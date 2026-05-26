file_path = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\client\src\features\nna\NnaCreatePage.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
# Print lines 2555 to 2585
start = 2550
end = 2585
for i in range(start, end):
    clean_line = lines[i].encode('ascii', errors='replace').decode('ascii')
    print(f"{i+1}: {clean_line}", end='')
