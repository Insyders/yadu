ACCOUNT := 000000000000
PROFILE := default
REGION := ca-central-1
IMAGE := hs-devops

all: build deploy version

build:
	docker build -t ${IMAGE} .

run:
	docker run -it ${IMAGE} /bin/bash

connect:
	AWS_PROFILE=${PROFILE} AWS_REGION=${REGION} aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com


deploy: connect
	docker tag ${IMAGE}:latest ${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/${IMAGE}:latest
	docker push ${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/${IMAGE}:latest

pull: connect
	docker pull ${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/${IMAGE}:latest

version:
	docker run -it --rm ${IMAGE} /print-version.sh
