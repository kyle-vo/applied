from app import create_app

_flask_app = create_app()

CORS_HEADERS = [
    ("Access-Control-Allow-Origin", "*"),
    ("Access-Control-Allow-Headers", "Authorization, Content-Type"),
    ("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS"),
]

class CORSMiddleware:
    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        if environ.get("REQUEST_METHOD") == "OPTIONS":
            start_response("204 No Content", CORS_HEADERS + [("Content-Length", "0")])
            return [b""]

        def cors_start_response(status, headers, exc_info=None):
            headers = list(headers) + CORS_HEADERS
            return start_response(status, headers, exc_info)

        return self.wsgi_app(environ, cors_start_response)

app = CORSMiddleware(_flask_app)

if __name__ == "__main__":
    _flask_app.run()
