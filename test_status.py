import urllib.request
from urllib.error import HTTPError

try:
    response = urllib.request.urlopen('http://localhost:3002/api/nna/parametros')
    print("STATUS:", response.status)
except HTTPError as e:
    print("STATUS ERROR:", e.code)
    print("RESPONSE BODY:", e.read().decode('utf-8'))
except Exception as e:
    print("GENERIC ERROR:", e)
