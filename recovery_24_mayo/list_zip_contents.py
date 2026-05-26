import zipfile
import os

zip_path = r"D:\Usuarios\ccampos\Downloads\Educadores de Calle.zip"

if os.path.exists(zip_path):
    print(f"Contents of {zip_path}:")
    with zipfile.ZipFile(zip_path, 'r') as z:
        for name in z.namelist()[:30]:
            print(f"  {name}")
        if len(z.namelist()) > 30:
            print(f"  ... (total {len(z.namelist())} files)")
else:
    print("Zip file not found")
