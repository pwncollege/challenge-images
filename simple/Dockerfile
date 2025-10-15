# syntax=docker/dockerfile:1

FROM ubuntu:24.04
RUN apt-get update && apt-get install -y python3 && apt-get clean

ADD --chown=0:0 --chmod=6755 http://github.com/pwncollege/exec-suid/releases/latest/download/exec-suid /usr/bin/exec-suid
