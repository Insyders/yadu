FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /usr/app

RUN apt-get update && \
    apt-get install -y \
        python3 \
        python-is-python3 \
        python3-pip \
        zip \
        git

RUN curl -fsSL https://deb.nodesource.com/setup_14.x | bash -
RUN apt-get install -y nodejs npm build-essential

RUN rm -rf /var/lib/apt/lists/*

RUN pip install poetry
RUN npm install -g @halfserious/yadu

ENV AWS_PROFILE='default'
ENV AWS_REGION='us-east-1'
ENV AWS_SDK_LOAD_CONFIG=1