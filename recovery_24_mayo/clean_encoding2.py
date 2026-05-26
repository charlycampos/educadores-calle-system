import os

file_path = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\client\src\features\nna\NnaCreatePage.tsx"

# Let's read using latin1 which can read any byte sequence
with open(file_path, 'r', encoding='latin1') as f:
    content = f.read()

# Let's check for occurrences of weird characters
# We want to replace common corrupted Spanish words with their standard equivalents:
# 'Mi\x81rcoles' or similar
# Let's just find and replace the whole days arrays!
# In mapToBackend, the array of days was:
# const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
# Let's check if we can replace any corrupted 'Mi...rcoles' or 'S...bado' with standard ASCII or clean UTF-8.
# To be extremely safe, let's write a regex or a simple replace for common corrupted patterns:

replacements = [
    ("Mi\x81rcoles", "Miércoles"),
    ("MiǸrcoles", "Miércoles"),
    ("Sǭbado", "Sábado"),
    ("S\x81bado", "Sábado"),
    ("C\x81mputo", "Cómputo"),
    ("Cǭmputo", "Cómputo"),
    ("D\x81as", "Días"),
    ("d\x81as", "días"),
    ("f\x81sica", "física"),
    ("verificaci\x81n", "verificación"),
    ("tutor\x81a", "tutoría"),
    ("inscripci\x81n", "inscripción"),
]

for old, new in replacements:
    content = content.replace(old, new)

# Also let's search if there are any other occurrences of \x81 or similar non-ascii bytes
# let's replace any remaining \x81 with 'i' or 'o' or similar depending on context, or just print them.
import re
non_ascii = re.findall(r'[^\x00-\x7F]', content)
print(f"Unique non-ASCII characters found: {set(non_ascii)}")

# Let's write back in UTF-8
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Restored encoding successfully!")
