# syntax=docker/dockerfile:1

FROM python:3.13-slim

RUN pip install --no-cache-dir flask gunicorn

ADD wsgi.py templates /opt/lecture/

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
EOF
