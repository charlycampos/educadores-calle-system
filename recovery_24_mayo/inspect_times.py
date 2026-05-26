import os
from datetime import datetime

files = [
    r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\client\src\features\nna\NnaCreatePage.tsx",
    r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\codigo\features\nna\NnaCreatePage.tsx"
]

for f in files:
    if os.path.exists(f):
        mtime = os.path.getmtime(f)
        dt = datetime.fromtimestamp(mtime)
        print(f"File: {f} | Size: {os.path.getsize(f)} bytes | Modified: {dt}")
    else:
        print(f"File not found: {f}")
