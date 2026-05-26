import os
import shutil
import subprocess

dest_file = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\client\src\features\nna\NnaCreatePage.tsx"
src_6977 = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_reconstructed_6977.tsx"
workspace_dir = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\client"

if os.path.exists(src_6977):
    shutil.copyfile(src_6977, dest_file)
    print("Copied Reconstructed_6977 to active path.")
    
    try:
        res = subprocess.run("npm run build", shell=True, cwd=workspace_dir, capture_output=True, text=True, timeout=60)
        print(f"Exit code: {res.returncode}")
        if res.returncode == 0:
            print("SUCCESS! Reconstructed_6977 built perfectly with Vite!")
        else:
            print("FAILED. Errors:")
            lines = res.stderr.splitlines()
            if not lines:
                lines = res.stdout.splitlines()
            for line in lines[:30]:
                print(f"  {line}")
    except Exception as e:
        print(f"Error: {e}")
