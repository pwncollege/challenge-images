# syntax=docker/dockerfile:1

FROM python:3.13-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir flask gunicorn

ADD wsgi.py /opt/lecture/
ADD static/ /opt/lecture/static/
ADD templates/ /opt/lecture/templates/

COPY <<EOF /opt/lecture/gunicorn.conf.py
wsgi_app = 'wsgi:application'
bind = "0.0.0.0:80"
loglevel = "info"
accesslog = "/var/log/gunicorn/access.log"
errorlog = "/var/log/gunicorn/error.log"
EOF

COPY --chmod=755 <<EOF /challenge/.init
#!/bin/sh
export PYTHONDONTWRITEBYTECODE=1
mkdir -p /var/log/gunicorn
cd /opt/lecture
gunicorn --daemon
until curl -fs localhost:80 >/dev/null; do sleep 0.1; done
EOF
