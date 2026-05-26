file_path = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\codigo\features\nna\NnaCreatePage.tsx"

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    for idx, line in enumerate(f):
        if "permanencia" in line.lower():
            print(f"Line {idx+1}: {line.strip()}")
