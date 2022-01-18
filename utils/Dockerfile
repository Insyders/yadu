FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /usr/app

# Dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        git \
        python3 \
        python-is-python3 \
        python3-pip \
        zip \
        software-properties-common \
        build-essential \
        ruby-full \
    && pip install \
        awscli \
        boto3 \
        boto \
        cfn-lint \
        poetry \
    && ln -s /usr/bin/python3 /usr/local/bin/python \
    && rm -rf /var/lib/apt/lists/*

# Ansible
RUN add-apt-repository --yes --update ppa:ansible/ansible \
    && apt-get install -y --no-install-recommends ansible

# NodeJS 14
RUN curl -fsSL https://deb.nodesource.com/setup_14.x | bash -
RUN apt-get install -y nodejs

# NodeJS CLI
RUN npm install -g \
    @halfserious/yadu \
    @angular/cli \
    @ionic/cli \
    serverless \
    lerna \
    jest \
    eslint \
    prettier

# cfn-nag
RUN gem install cfn-nag

ENV AWS_SDK_LOAD_CONFIG=1

COPY ./print-version.sh /print-version.sh
RUN chmod +x /print-version.sh