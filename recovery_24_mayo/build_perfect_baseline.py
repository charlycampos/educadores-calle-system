import os
import shutil
import subprocess

dest_file = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\client\src\features\nna\NnaCreatePage.tsx"
src_perfect = r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_perfect_baseline.tsx"
workspace_dir = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\client"

if os.path.exists(src_perfect):
    shutil.copyfile(src_perfect, dest_file)
    print("Copied NnaCreatePage_perfect_baseline.tsx to active path.")
    
    try:
        print("Running 'npm run build' in client folder...")
        res = subprocess.run("npm run build", shell=True, cwd=workspace_dir, capture_output=True, text=True, timeout=60)
        print(f"Exit code: {res.returncode}")
        if res.returncode == 0:
            print("CONGRATULATIONS! Perfect baseline compiled and built successfully with 0 errors!")
        else:
            print("FAILED. Errors:")
            lines = res.stderr.splitlines()
            if not lines:
                lines = res.stdout.splitlines()
            for line in lines[:40]:
                print(f"  {line}")
    except Exception as e:
        print(f"Error: {e}")
