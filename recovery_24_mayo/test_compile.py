import os
import shutil
import subprocess

dest_file = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\client\src\features\nna\NnaCreatePage.tsx"
workspace_dir = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\client"

files_to_test = {
    "Reconstructed_First": r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_reconstructed.tsx",
    "Reconstructed_6977": r"D:\Usuarios\ccampos\.gemini\antigravity-cli\scratch\NnaCreatePage_reconstructed_6977.tsx"
}

for name, src_path in files_to_test.items():
    if os.path.exists(src_path):
        print(f"\n=================== Testing {name} ===================")
        # Copy the file to active path
        shutil.copyfile(src_path, dest_file)
        print(f"Copied {src_path} to active path.")
        
        # Run tsc check
        try:
            print("Running 'npx tsc --noEmit' in client folder...")
            # Run PowerShell or cmd
            res = subprocess.run("npx tsc --noEmit", shell=True, cwd=workspace_dir, capture_output=True, text=True, timeout=30)
            print(f"Exit code: {res.returncode}")
            if res.returncode == 0:
                print(f"SUCCESS! {name} compiled successfully with 0 errors!")
            else:
                print(f"Compilation FAILED for {name}.")
                print("Errors:")
                # Print first 25 lines of errors to not overflow
                err_lines = res.stderr.splitlines()
                if not err_lines:
                    err_lines = res.stdout.splitlines()
                for line in err_lines[:40]:
                    print(f"  {line}")
                if len(err_lines) > 40:
                    print(f"  ... and {len(err_lines) - 40} more lines of errors.")
        except Exception as e:
            print(f"Error running compiler check: {e}")
    else:
        print(f"Source file {src_path} does not exist.")
