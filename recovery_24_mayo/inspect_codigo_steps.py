file_path = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\codigo\features\nna\NnaCreatePage.tsx"

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Let's search for "step" or "paso"
print("Occurrences of step/paso in codigo:")
for idx, line in enumerate(content.splitlines()):
    if "step" in line.lower() or "paso" in line.lower() or "activeSection" in line or "currentIndex" in line:
        print(f"Line {idx+1}: {line.strip()}")
