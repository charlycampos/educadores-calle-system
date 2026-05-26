file_path = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\client\src\features\nna\NnaCreatePage.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
# Print lines 2390 to 2440
start = 2380
end = 2440
for i in range(start, end):
    print(f"{i+1}: {lines[i]}", end='')
