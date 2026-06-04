import urllib.request
import urllib.error
import json

def test_api():
    login_url = "http://localhost:3001/api/auth/login"
    login_data = {
        "email": "educador@educadores.gob.pe",
        "password": "password123"
    }

    print("Logging in to get token...")
    try:
        req = urllib.request.Request(
            login_url,
            data=json.dumps(login_data).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req) as response:
            res_body = json.loads(response.read().decode("utf-8"))
            token = res_body.get("token")
            print("Logged in successfully. Token length:", len(token))
    except Exception as e:
        print("Failed to login:", e)
        return

    url = "http://localhost:3006/api/informe-situacional/caso/286"
    print(f"Requesting GET {url}...")
    try:
        req = urllib.request.Request(
            url,
            headers={"Authorization": f"Bearer {token}"},
            method="GET"
        )
        with urllib.request.urlopen(req) as response:
            print("Response status code:", response.status)
            print("Response content:", response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print("HTTP Error status code:", e.code)
        print("HTTP Error response body:", e.read().decode("utf-8"))
    except Exception as e:
        print("Request failed:", e)

if __name__ == "__main__":
    test_api()
