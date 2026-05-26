import os

client_git = r"D:\Usuarios\ccampos\Documents\Python Scripts\Educadores_calle\educadores-calle-system\client\.git"
if os.path.exists(client_git):
    print("Found git folder inside client!")
else:
    print("No git folder inside client.")
