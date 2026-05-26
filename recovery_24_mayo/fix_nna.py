import os

file_path = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\client\src\features\nna\NnaCreatePage.tsx"

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

lines = content.split('\n')
for idx, line in enumerate(lines):
    if 'POPULAR FORMULARIO CUANDO LLEGAN DATOS' in line and 'useEffect' not in line:
        lines[idx] = """    // ─────────────────────────────────────────────────────────────────────────

    // CARGAR DATOS SI ES EDICIÓN
    useEffect(() => {
        if (id) {
            setIsEditMode(true);
            fetchExpediente(Number(id));
        }
    }, [id, fetchExpediente]);

    // POPULAR FORMULARIO CUANDO LLEGAN DATOS"""
        break

new_content = '\n'.join(lines)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Successfully replaced and restored useEffect!")
