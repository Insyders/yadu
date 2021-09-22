## Devops Utilities Image to work with YaDU

### Build

```bash
docker build -t devops-utils .
```

### Usage

```bash
docker run \
 -it \
 --rm \
 -v $HOME/.aws/credentials:/root/.aws/credentials:ro \
 -v $HOME/.aws/config:/root/.aws/config:ro \
 -v $(pwd):/usr/app \
 -e AWS_PROFILE="a1dev" \
 -e AWS_REGION="us-east-1" \
 devops-utils bash -c "pushd aws/lambda/my-lambda && yadu --use-yaml --show-config --env=yadu-config && popd"
```

#### Examples

```bash
"pushd aws/lambda/my-lambda && yadu --use-yaml --show-config --env=yadu-config && popd"
```

```bash
"npm run lerna-cmd"
```