import os
from datetime import datetime

build_file = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\client\dist\assets\index-kIVPLx3l.js"

if os.path.exists(build_file):
    mtime = os.path.getmtime(build_file)
    dt = datetime.fromtimestamp(mtime)
    print(f"Build File: {build_file} | Size: {os.path.getsize(build_file)} bytes | Modified: {dt}")
else:
    print("Build file not found")
