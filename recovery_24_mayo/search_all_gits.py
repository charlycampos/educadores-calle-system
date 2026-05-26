import os

paths = [
    r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system",
    r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle",
    r"D:\Usuarios\ccampos\Documents\Python Scripts",
    r"D:\Usuarios\ccampos\Documents",
    r"D:\Usuarios\ccampos"
]

for p in paths:
    git_dir = os.path.join(p, ".git")
    if os.path.exists(git_dir):
        print(f"Found git repository at: {p}")
