import sys

path = r'D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\client\src\features\nna\NnaCreatePage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

replacements = {
    'Ã¡': 'á', 'Ã©': 'é', 'Ã³': 'ó', 'Ãº': 'ú', 'Ã­': 'í', 'Ã-': 'í', 'Ã\xad': 'í',
    'Ã±': 'ñ', 'Ã‘': 'Ñ', 'Â¿': '¿', 'Ãš': 'Ú', 'Ã“': 'Ó',
    'Ã‰': 'É', 'Ã ': 'Á', 'Â¡': '¡', 'Ã¼': 'ü'
}

for k, v in replacements.items():
    text = text.replace(k, v)

# Also fix the weird ones that appeared in PS output just in case
text = text.replace('', 'ó') # Generic replacement might be dangerous, let's stick to known ones first

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
print('Fixed!')
