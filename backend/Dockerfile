FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy app source
COPY . .

ENV FLASK_APP=wsgi.py
EXPOSE 5000

CMD ["sh", "-c", "flask db upgrade && gunicorn wsgi:app --bind 0.0.0.0:${PORT:-5000} --workers 2 --timeout 60"]
