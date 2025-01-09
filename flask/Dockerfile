# syntax=docker/dockerfile:1

FROM python:3.13-slim

RUN pip install --no-cache-dir flask gunicorn

COPY <<EOF /challenge/gunicorn.conf.py
wsgi_app = 'wsgi:application'
bind = "0.0.0.0:80"
loglevel = "info"
accesslog = "/var/log/gunicorn/access.log"
errorlog = "/var/log/gunicorn/error.log"
EOF

COPY --chmod=755 <<EOF /challenge/.init
#!/bin/sh
pushd /challenge
gunicorn --daemon
EOF
